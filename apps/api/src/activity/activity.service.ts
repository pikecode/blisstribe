import { Injectable } from '@nestjs/common'
import {
  Prisma,
  type Activity,
  type ActivityRegistration,
  type Partner,
  type Product,
  type ProductModule,
  type User,
  type Venue,
  type VenueFacility,
  type VenueFacilityOnVenue,
} from '@prisma/client'
import { ErrorCode } from '@blisstribe/shared'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { PrismaService } from '../common/prisma.service'
import { VenueService } from '../venue/venue.service'
import {
  ACTIVE_ACTIVITY_REGISTRATION_STATUS,
  ACTIVITY_REGISTRATION_STATUS,
  ACTIVITY_STATUS,
  ACTIVITY_STATUS_SCOPES,
  ACTIVITY_TYPES,
  type CancelActivityRegistrationDto,
  type CreateActivityDto,
  type CreateActivityRegistrationDto,
  type UpdateActivityDto,
  type UpdateActivityRegistrationStatusDto,
} from './dto'

type ActivityVenue = Venue & { facilities: Array<VenueFacilityOnVenue & { facility: VenueFacility }> }
type ActivityWithModule = Activity & { module: ProductModule; venue: ActivityVenue | null }
type ActivityRegistrationWithRelations = ActivityRegistration & {
  activity: ActivityWithModule
  user: Pick<User, 'id' | 'nickname' | 'avatar' | 'phoneMasked'>
  partner: Pick<Partner, 'id' | 'displayName' | 'partnerNo'> | null
}

const PUBLIC_PRODUCT_STATUS = 1

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venueService: VenueService,
  ) {}

  async listPublic(params: {
    moduleCode?: string
    activityType?: string
    statusScope?: string
    userId?: bigint
    page: number
    pageSize: number
  }) {
    const where = this.buildPublicActivityWhere(params)
    const [rows, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: this.activityInclude(),
        orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { startAt: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.activity.count({ where }),
    ])
    const activityIds = rows.map((row) => row.id)
    const [counts, registrationMap] = await Promise.all([
      this.registrationCounts(activityIds),
      this.registrationsByActivityIds(activityIds, params.userId),
    ])

    return {
      list: rows.map((row) => this.toActivityVO(row, counts.get(row.id) ?? 0, registrationMap.get(row.id) ?? null)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async recommended(params: { moduleCode?: string; userId?: bigint; limit: number }) {
    const now = new Date()
    const where = this.buildPublicActivityWhere({
      moduleCode: params.moduleCode,
      statusScope: 'registering',
    })
    const rows = await this.prisma.activity.findMany({
      where: {
        ...where,
        endAt: { gt: now },
      },
      include: this.activityInclude(),
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { startAt: 'asc' }],
      take: Math.min(params.limit, 20),
    })
    const activityIds = rows.map((row) => row.id)
    const [counts, registrationMap] = await Promise.all([
      this.registrationCounts(activityIds),
      this.registrationsByActivityIds(activityIds, params.userId),
    ])
    return rows.map((row) => this.toActivityVO(row, counts.get(row.id) ?? 0, registrationMap.get(row.id) ?? null))
  }

  async detailPublic(id: bigint, userId: bigint | null) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        status: ACTIVITY_STATUS.PUBLISHED,
        deletedAt: null,
        module: { status: 1, deletedAt: null },
      },
      include: this.activityInclude(),
    })
    if (!activity) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '活动不存在或已下线')

    const [registeredCount, myRegistration, relatedProducts] = await Promise.all([
      this.registrationCount(activity.id),
      userId
        ? this.prisma.activityRegistration.findUnique({
            where: { activityId_userId: { activityId: activity.id, userId } },
          })
        : null,
      this.relatedProducts(activity.relatedProductIds),
    ])

    return this.toActivityVO(activity, registeredCount, myRegistration, relatedProducts)
  }

  async register(activityId: bigint, userId: bigint, dto: CreateActivityRegistrationDto) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, status: ACTIVITY_STATUS.PUBLISHED, deletedAt: null },
      include: this.activityInclude(),
    })
    if (!activity) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '活动不存在或已下线')

    const existing = await this.prisma.activityRegistration.findUnique({
      where: { activityId_userId: { activityId, userId } },
      include: this.registrationInclude(),
    })
    if (existing && this.isActiveRegistration(existing.status)) return this.toRegistrationVO(existing)

    const registeredCount = await this.registrationCount(activityId)
    this.ensureCanRegister(activity, registeredCount)

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, phoneMasked: true },
    })
    if (!user) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '用户不存在')

    const sourceInviteCode = dto.inviteCode?.trim().toUpperCase() || null
    const partnerId = await this.resolvePartnerId(sourceInviteCode)

    const data = {
      partnerId,
      sourceInviteCode,
      sourceScene: dto.sourceScene?.trim() || 'activity_detail',
      name: dto.name?.trim() || user.nickname || '',
      phoneMasked: user.phoneMasked,
      message: dto.message?.trim() ?? '',
      status: 'registered',
      followUpNote: '',
      cancelReason: '',
    }

    const registration = existing
      ? await this.prisma.activityRegistration.update({
          where: { id: existing.id },
          data,
          include: this.registrationInclude(),
        })
      : await this.prisma.activityRegistration.create({
          data: { ...data, activityId, userId },
          include: this.registrationInclude(),
        })

    await this.recordActivityEvent(userId, activity, 'activity_registration', data.sourceScene, {
      registrationId: Number(registration.id),
      partnerId: partnerId ? Number(partnerId) : null,
      sourceInviteCode,
    })

    return this.toRegistrationVO(registration)
  }

  async cancelRegistration(activityId: bigint, userId: bigint, dto: CancelActivityRegistrationDto) {
    const existing = await this.prisma.activityRegistration.findUnique({
      where: { activityId_userId: { activityId, userId } },
      include: this.registrationInclude(),
    })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '报名记录不存在')
    if (existing.status === 'attended') throw new BusinessException(ErrorCode.PARAMS_INVALID, '已参加活动不可取消')
    if (existing.activity.endAt.getTime() <= Date.now()) throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动已结束，不可取消')

    const updated = await this.prisma.activityRegistration.update({
      where: { id: existing.id },
      data: {
        status: 'cancelled',
        cancelReason: dto.cancelReason?.trim() ?? '',
      },
      include: this.registrationInclude(),
    })
    await this.recordActivityEvent(userId, existing.activity, 'activity_cancel', existing.sourceScene || 'miniapp_activity_detail', {
      registrationId: Number(updated.id),
      cancelReason: updated.cancelReason,
    })
    return this.toRegistrationVO(updated)
  }

  async myRegistrations(userId: bigint, params: { page: number; pageSize: number }) {
    const where = { userId }
    const [rows, total] = await Promise.all([
      this.prisma.activityRegistration.findMany({
        where,
        include: this.registrationInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.activityRegistration.count({ where }),
    ])
    return {
      list: rows.map((row) => this.toRegistrationVO(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async listAdmin(params: {
    page: number
    pageSize: number
    keyword?: string
    moduleId?: bigint
    activityType?: string
    status?: number
  }) {
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...(params.keyword && { title: { contains: params.keyword } }),
      ...(params.moduleId && { moduleId: params.moduleId }),
      ...(this.isActivityType(params.activityType) && { activityType: params.activityType }),
      ...(params.status !== undefined && { status: params.status }),
    }
    const [rows, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: this.activityInclude(),
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { startAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.activity.count({ where }),
    ])
    const counts = await this.registrationCounts(rows.map((row) => row.id))
    return {
      list: rows.map((row) => this.toActivityVO(row, counts.get(row.id) ?? 0)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async createAdmin(dto: CreateActivityDto) {
    const data = await this.buildCreateData(dto)
    const activity = await this.prisma.activity.create({
      data,
      include: this.activityInclude(),
    })
    return this.toActivityVO(activity, 0)
  }

  async updateAdmin(id: bigint, dto: UpdateActivityDto) {
    const existing = await this.prisma.activity.findFirst({
      where: { id, deletedAt: null },
      include: this.activityInclude(),
    })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '活动不存在')

    const data = await this.buildUpdateData(existing, dto)
    const activity = await this.prisma.activity.update({
      where: { id },
      data,
      include: this.activityInclude(),
    })
    const count = await this.registrationCount(id)
    return this.toActivityVO(activity, count)
  }

  async publishAdmin(id: bigint) {
    return this.updateAdmin(id, { status: ACTIVITY_STATUS.PUBLISHED })
  }

  async unpublishAdmin(id: bigint) {
    return this.updateAdmin(id, { status: ACTIVITY_STATUS.UNPUBLISHED })
  }

  async listRegistrationsAdmin(params: {
    page: number
    pageSize: number
    activityId?: bigint
    status?: string
    keyword?: string
  }) {
    const where: Prisma.ActivityRegistrationWhereInput = {
      ...(params.activityId && { activityId: params.activityId }),
      ...(this.isRegistrationStatus(params.status) && { status: params.status }),
      ...(params.keyword && {
        OR: [
          { activity: { title: { contains: params.keyword } } },
          { user: { nickname: { contains: params.keyword } } },
          { user: { phoneMasked: { contains: params.keyword } } },
          { name: { contains: params.keyword } },
          { message: { contains: params.keyword } },
        ],
      }),
    }
    const [rows, total] = await Promise.all([
      this.prisma.activityRegistration.findMany({
        where,
        include: this.registrationInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.activityRegistration.count({ where }),
    ])
    return {
      list: rows.map((row) => this.toRegistrationVO(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async detailRegistrationAdmin(id: bigint) {
    const registration = await this.prisma.activityRegistration.findUnique({
      where: { id },
      include: this.registrationInclude(),
    })
    if (!registration) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '报名记录不存在')
    return this.toRegistrationVO(registration)
  }

  async updateRegistrationStatusAdmin(
    id: bigint,
    _adminId: bigint,
    dto: UpdateActivityRegistrationStatusDto
  ) {
    const existing = await this.prisma.activityRegistration.findUnique({
      where: { id },
      include: this.registrationInclude(),
    })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '报名记录不存在')

    const updated = await this.prisma.activityRegistration.update({
      where: { id },
      data: {
        status: dto.status,
        followUpNote: dto.followUpNote?.trim() ?? existing.followUpNote,
        ...(dto.status !== 'cancelled' && { cancelReason: '' }),
      },
      include: this.registrationInclude(),
    })
    return this.toRegistrationVO(updated)
  }

  private buildPublicActivityWhere(params: {
    moduleCode?: string
    activityType?: string
    statusScope?: string
  }): Prisma.ActivityWhereInput {
    const now = new Date()
    return {
      status: ACTIVITY_STATUS.PUBLISHED,
      deletedAt: null,
      module: {
        status: 1,
        deletedAt: null,
        ...(params.moduleCode && { code: params.moduleCode.trim() }),
      },
      ...(this.isActivityType(params.activityType) && { activityType: params.activityType }),
      ...this.statusScopeWhere(params.statusScope, now),
    }
  }

  private statusScopeWhere(statusScope: string | undefined, now: Date): Prisma.ActivityWhereInput {
    if (!this.isStatusScope(statusScope)) return {}
    if (statusScope === 'upcoming') return { startAt: { gt: now } }
    if (statusScope === 'ended') return { endAt: { lt: now } }
    return {
      endAt: { gt: now },
      registrationEndAt: { gte: now },
      OR: [{ registrationStartAt: null }, { registrationStartAt: { lte: now } }],
    }
  }

  private async buildCreateData(dto: CreateActivityDto): Promise<Prisma.ActivityCreateInput> {
    const module = await this.ensureModule(BigInt(dto.moduleId))
    const tagSnapshot = await this.normalizeTags(BigInt(dto.moduleId), dto.tagIds ?? [], dto.tags ?? [])
    await this.ensureRelatedProducts(dto.relatedProductIds ?? [])
    this.validateSchedule(dto)
    const startAt = new Date(dto.startAt)
    const endAt = new Date(dto.endAt)
    const venue = await this.venueService.ensureAvailableForActivity({
      venueId: dto.venueId ? BigInt(dto.venueId) : null,
      startAt,
      endAt,
      capacity: dto.capacity ?? null,
    })

    return {
      module: { connect: { id: module.id } },
      ...(venue && { venue: { connect: { id: venue.id } } }),
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() ?? '',
      coverUrl: dto.coverUrl?.trim() ?? '',
      activityType: dto.activityType ?? 'online',
      startAt,
      endAt,
      registrationStartAt: dto.registrationStartAt ? new Date(dto.registrationStartAt) : null,
      registrationEndAt: new Date(dto.registrationEndAt),
      locationText: dto.locationText?.trim() || venue?.address || '',
      venueSnapshot: venue ? (this.venueService.buildSnapshot(venue) as Prisma.InputJsonValue) : {},
      capacity: dto.capacity ?? null,
      targetUserText: dto.targetUserText?.trim() ?? '',
      highlights: this.cleanStrings(dto.highlights ?? []),
      detail: dto.detail?.trim() ?? '',
      tags: tagSnapshot.names,
      tagIds: tagSnapshot.ids,
      relatedProductIds: this.cleanIds(dto.relatedProductIds ?? []),
      priority: dto.priority ?? 0,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? ACTIVITY_STATUS.DRAFT,
      publishedAt: dto.status === ACTIVITY_STATUS.PUBLISHED ? new Date() : null,
    }
  }

  private async buildUpdateData(existing: Activity, dto: UpdateActivityDto): Promise<Prisma.ActivityUpdateInput> {
    const moduleId = dto.moduleId ? BigInt(dto.moduleId) : existing.moduleId
    if (dto.moduleId) await this.ensureModule(moduleId)
    if (dto.relatedProductIds !== undefined) await this.ensureRelatedProducts(dto.relatedProductIds)

    const schedule = {
      startAt: dto.startAt ?? existing.startAt.toISOString(),
      endAt: dto.endAt ?? existing.endAt.toISOString(),
      registrationStartAt: dto.registrationStartAt ?? existing.registrationStartAt?.toISOString(),
      registrationEndAt: dto.registrationEndAt ?? existing.registrationEndAt.toISOString(),
      capacity: dto.capacity ?? existing.capacity ?? undefined,
    }
    this.validateSchedule(schedule)
    const venueId = dto.venueId !== undefined ? (dto.venueId ? BigInt(dto.venueId) : null) : existing.venueId
    const startAt = new Date(schedule.startAt)
    const endAt = new Date(schedule.endAt)
    const venue = await this.venueService.ensureAvailableForActivity({
      venueId,
      activityId: existing.id,
      startAt,
      endAt,
      capacity: schedule.capacity ?? null,
    })

    const data: Prisma.ActivityUpdateInput = {
      ...(dto.moduleId && { module: { connect: { id: moduleId } } }),
      ...(dto.venueId !== undefined && (venue ? { venue: { connect: { id: venue.id } } } : { venue: { disconnect: true } })),
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.subtitle !== undefined && { subtitle: dto.subtitle.trim() }),
      ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl.trim() }),
      ...(dto.activityType !== undefined && { activityType: dto.activityType }),
      ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
      ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
      ...(dto.registrationStartAt !== undefined && {
        registrationStartAt: dto.registrationStartAt ? new Date(dto.registrationStartAt) : null,
      }),
      ...(dto.registrationEndAt !== undefined && { registrationEndAt: new Date(dto.registrationEndAt) }),
      ...(dto.locationText !== undefined && { locationText: dto.locationText.trim() || venue?.address || '' }),
      ...(dto.venueId !== undefined && { venueSnapshot: venue ? (this.venueService.buildSnapshot(venue) as Prisma.InputJsonValue) : {} }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.targetUserText !== undefined && { targetUserText: dto.targetUserText.trim() }),
      ...(dto.highlights !== undefined && { highlights: this.cleanStrings(dto.highlights) }),
      ...(dto.detail !== undefined && { detail: dto.detail.trim() }),
      ...(dto.relatedProductIds !== undefined && { relatedProductIds: this.cleanIds(dto.relatedProductIds) }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.status !== undefined && {
        status: dto.status,
        publishedAt: dto.status === ACTIVITY_STATUS.PUBLISHED ? existing.publishedAt ?? new Date() : existing.publishedAt,
      }),
    }

    if (dto.tagIds !== undefined || dto.tags !== undefined || dto.moduleId !== undefined) {
      const tagSnapshot = await this.normalizeTags(moduleId, dto.tagIds ?? existing.tagIds.map(Number), dto.tags ?? existing.tags)
      data.tags = tagSnapshot.names
      data.tagIds = tagSnapshot.ids
    }

    return data
  }

  private validateSchedule(input: {
    startAt: string
    endAt: string
    registrationStartAt?: string
    registrationEndAt: string
    capacity?: number
  }) {
    const startAt = new Date(input.startAt)
    const endAt = new Date(input.endAt)
    const registrationStartAt = input.registrationStartAt ? new Date(input.registrationStartAt) : null
    const registrationEndAt = new Date(input.registrationEndAt)
    if (endAt.getTime() <= startAt.getTime()) throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动结束时间必须晚于开始时间')
    if (registrationEndAt.getTime() > endAt.getTime()) throw new BusinessException(ErrorCode.PARAMS_INVALID, '报名截止时间不能晚于活动结束时间')
    if (registrationStartAt && registrationEndAt.getTime() <= registrationStartAt.getTime()) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '报名截止时间必须晚于报名开始时间')
    }
    if (input.capacity !== undefined && input.capacity < 1) throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动名额必须大于 0')
  }

  private ensureCanRegister(activity: Activity, registeredCount: number) {
    const status = this.deriveRegistrationStatus(activity, registeredCount)
    if (status === 'not_started') throw new BusinessException(ErrorCode.PARAMS_INVALID, '报名暂未开始')
    if (status === 'full') throw new BusinessException(ErrorCode.PARAMS_INVALID, '名额已满')
    if (status === 'closed') throw new BusinessException(ErrorCode.PARAMS_INVALID, '报名已截止')
    if (status === 'ended') throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动已结束')
  }

  private deriveRegistrationStatus(activity: Activity, registeredCount: number) {
    const now = Date.now()
    if (activity.endAt.getTime() <= now) return 'ended'
    if (activity.registrationEndAt.getTime() < now) return 'closed'
    if (activity.registrationStartAt && activity.registrationStartAt.getTime() > now) return 'not_started'
    if (activity.capacity !== null && registeredCount >= activity.capacity) return 'full'
    return 'registering'
  }

  private async normalizeTags(moduleId: bigint, tagIds: number[], tags: string[]) {
    const ids = this.cleanIds(tagIds)
    const rows = ids.length
      ? await this.prisma.tagDictionary.findMany({
          where: {
            id: { in: ids },
            status: 1,
            deletedAt: null,
            OR: [{ moduleId }, { moduleId: null }],
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        })
      : []
    return {
      ids: rows.map((row) => row.id),
      names: this.cleanStrings([...rows.map((row) => row.name), ...tags]),
    }
  }

  private async ensureModule(moduleId: bigint) {
    const module = await this.prisma.productModule.findFirst({
      where: { id: moduleId, deletedAt: null },
      select: { id: true },
    })
    if (!module) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '产品模块不存在')
    return module
  }

  private async ensureRelatedProducts(ids: number[]) {
    const cleanIds = this.cleanIds(ids)
    if (!cleanIds.length) return
    const count = await this.prisma.product.count({
      where: { id: { in: cleanIds }, deletedAt: null },
    })
    if (count !== cleanIds.length) throw new BusinessException(ErrorCode.PARAMS_INVALID, '关联产品不存在')
  }

  private async relatedProducts(ids: bigint[]) {
    if (!ids.length) return []
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        status: PUBLIC_PRODUCT_STATUS,
        deletedAt: null,
        module: { status: 1, deletedAt: null },
      },
      include: { module: true },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }],
    })
    return products.map((product) => this.toRelatedProductVO(product))
  }

  private async resolvePartnerId(inviteCode: string | null) {
    if (!inviteCode) return null
    const invitationCode = await this.prisma.invitationCode.findFirst({
      where: {
        code: inviteCode,
        status: 1,
        ownerType: 'partner',
      },
      select: { ownerId: true },
    })
    if (invitationCode) return invitationCode.ownerId

    const record = await this.prisma.invitationRecord.findFirst({
      where: { code: inviteCode, partnerId: { not: null } },
      select: { partnerId: true },
      orderBy: { createdAt: 'desc' },
    })
    return record?.partnerId ?? null
  }

  private async recordActivityEvent(
    userId: bigint,
    activity: ActivityWithModule,
    eventType: 'activity_registration' | 'activity_cancel',
    sourceScene: string,
    metadata: Record<string, unknown>
  ) {
    await this.prisma.recommendationEvent.create({
      data: {
        userId,
        moduleId: activity.moduleId,
        moduleCode: activity.module.code,
        activityId: activity.id,
        recommendationForm: 'activity_featured',
        eventType,
        sourceScene,
        tags: activity.tags,
        tagIds: activity.tagIds,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })
  }

  private async registrationCount(activityId: bigint) {
    return this.prisma.activityRegistration.count({
      where: { activityId, status: { in: [...ACTIVE_ACTIVITY_REGISTRATION_STATUS] } },
    })
  }

  private async registrationCounts(activityIds: bigint[]) {
    if (!activityIds.length) return new Map<bigint, number>()
    const rows = await this.prisma.activityRegistration.groupBy({
      by: ['activityId'],
      where: {
        activityId: { in: activityIds },
        status: { in: [...ACTIVE_ACTIVITY_REGISTRATION_STATUS] },
      },
      _count: { _all: true },
    })
    return new Map(rows.map((row) => [row.activityId, row._count._all]))
  }

  private async registrationsByActivityIds(activityIds: bigint[], userId?: bigint) {
    if (!activityIds.length || !userId) return new Map<bigint, ActivityRegistration>()
    const rows = await this.prisma.activityRegistration.findMany({
      where: { activityId: { in: activityIds }, userId },
    })
    return new Map(rows.map((row) => [row.activityId, row]))
  }

  private registrationInclude() {
    return {
      activity: { include: this.activityInclude() },
      user: { select: { id: true, nickname: true, avatar: true, phoneMasked: true } },
      partner: { select: { id: true, displayName: true, partnerNo: true } },
    } satisfies Prisma.ActivityRegistrationInclude
  }

  private activityInclude() {
    return {
      module: true,
      venue: {
        include: {
          facilities: { include: { facility: true }, orderBy: [{ sortOrder: 'asc' }] },
        },
      },
    } satisfies Prisma.ActivityInclude
  }

  private toActivityVO(
    activity: ActivityWithModule,
    registeredCount: number,
    myRegistration?: ActivityRegistration | null,
    relatedProducts?: ReturnType<ActivityService['toRelatedProductVO']>[]
  ) {
    return {
      id: Number(activity.id),
      moduleId: Number(activity.moduleId),
      venueId: activity.venueId ? Number(activity.venueId) : null,
      module: {
        id: Number(activity.module.id),
        code: activity.module.code,
        name: activity.module.name,
        icon: activity.module.icon,
        coverUrl: activity.module.coverUrl,
      },
      venue: activity.venue
        ? {
            id: Number(activity.venue.id),
            name: activity.venue.name,
            subtitle: activity.venue.subtitle,
            coverUrl: activity.venue.coverUrl,
            address: activity.venue.address,
            city: activity.venue.city,
            district: activity.venue.district,
            capacity: activity.venue.capacity,
            facilities: activity.venue.facilities
              .filter((item) => item.facility.status === 1 && !item.facility.deletedAt)
              .map((item) => item.facility.name),
          }
        : null,
      title: activity.title,
      subtitle: activity.subtitle,
      coverUrl: activity.coverUrl,
      activityType: activity.activityType,
      startAt: activity.startAt.toISOString(),
      endAt: activity.endAt.toISOString(),
      registrationStartAt: activity.registrationStartAt?.toISOString() ?? null,
      registrationEndAt: activity.registrationEndAt.toISOString(),
      locationText: activity.locationText,
      venueSnapshot: activity.venueSnapshot,
      capacity: activity.capacity,
      registeredCount,
      remainingCount: activity.capacity === null ? null : Math.max(activity.capacity - registeredCount, 0),
      registrationStatus: this.deriveRegistrationStatus(activity, registeredCount),
      myRegistration: myRegistration ? this.toRegistrationBaseVO(myRegistration) : null,
      targetUserText: activity.targetUserText,
      highlights: activity.highlights,
      detail: activity.detail,
      tags: activity.tags,
      tagIds: activity.tagIds.map(Number),
      relatedProductIds: activity.relatedProductIds.map(Number),
      relatedProducts,
      priority: activity.priority,
      sortOrder: activity.sortOrder,
      status: activity.status,
      publishedAt: activity.publishedAt?.toISOString() ?? null,
      createdAt: activity.createdAt.toISOString(),
      updatedAt: activity.updatedAt.toISOString(),
    }
  }

  private toRegistrationVO(registration: ActivityRegistrationWithRelations) {
    return {
      ...this.toRegistrationBaseVO(registration),
      activity: this.toActivityVO(registration.activity, 0),
      user: {
        id: Number(registration.user.id),
        nickname: registration.user.nickname,
        avatar: registration.user.avatar,
        phoneMasked: registration.user.phoneMasked,
      },
      partner: registration.partner
        ? {
            id: Number(registration.partner.id),
            displayName: registration.partner.displayName,
            partnerNo: registration.partner.partnerNo,
          }
        : null,
    }
  }

  private toRegistrationBaseVO(registration: ActivityRegistration) {
    return {
      id: Number(registration.id),
      activityId: Number(registration.activityId),
      userId: Number(registration.userId),
      partnerId: registration.partnerId ? Number(registration.partnerId) : null,
      sourceInviteCode: registration.sourceInviteCode,
      sourceScene: registration.sourceScene,
      name: registration.name,
      phoneMasked: registration.phoneMasked,
      message: registration.message,
      status: registration.status,
      followUpNote: registration.followUpNote,
      cancelReason: registration.cancelReason,
      createdAt: registration.createdAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    }
  }

  private toRelatedProductVO(product: Product & { module: ProductModule }) {
    return {
      id: Number(product.id),
      module: {
        id: Number(product.module.id),
        code: product.module.code,
        name: product.module.name,
      },
      productType: product.productType,
      title: product.title,
      subtitle: product.subtitle,
      coverUrl: product.coverUrl,
      priceText: product.priceText,
      summary: product.summary,
      tags: product.tags,
      tagIds: product.tagIds.map(Number),
    }
  }

  private isActiveRegistration(status: string) {
    return (ACTIVE_ACTIVITY_REGISTRATION_STATUS as readonly string[]).includes(status)
  }

  private isActivityType(activityType?: string): activityType is typeof ACTIVITY_TYPES[number] {
    return !!activityType && (ACTIVITY_TYPES as readonly string[]).includes(activityType)
  }

  private isStatusScope(statusScope?: string): statusScope is typeof ACTIVITY_STATUS_SCOPES[number] {
    return !!statusScope && (ACTIVITY_STATUS_SCOPES as readonly string[]).includes(statusScope)
  }

  private isRegistrationStatus(status?: string): status is typeof ACTIVITY_REGISTRATION_STATUS[number] {
    return !!status && (ACTIVITY_REGISTRATION_STATUS as readonly string[]).includes(status)
  }

  private cleanStrings(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
  }

  private cleanIds(values: number[]) {
    return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0))).map(BigInt)
  }
}
