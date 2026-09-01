import { Injectable } from '@nestjs/common'
import { ErrorCode } from '@blisstribe/shared'
import { Prisma, type Venue, type VenueAvailability, type VenueBlockedSlot, type VenueImage } from '@prisma/client'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { type CreateVenueDto, VENUE_STATUS, type VenueAvailabilityInputDto, type VenueBlockedSlotInputDto } from './dto'

type VenueWithRelations = Venue & {
  images: VenueImage[]
  availability: VenueAvailability[]
  blockedSlots: VenueBlockedSlot[]
}

@Injectable()
export class VenueService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(params: { city?: string; keyword?: string }) {
    const rows = await this.prisma.venue.findMany({
      where: {
        status: VENUE_STATUS.ENABLED,
        deletedAt: null,
        ...(params.city && { city: params.city.trim() }),
        ...(params.keyword && {
          OR: [
            { name: { contains: params.keyword.trim() } },
            { address: { contains: params.keyword.trim() } },
          ],
        }),
      },
      include: this.include(),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return rows.map((row) => this.toVO(row))
  }

  async listAdmin(params: { page: number; pageSize: number; keyword?: string; city?: string; status?: number }) {
    const where: Prisma.VenueWhereInput = {
      deletedAt: null,
      ...(params.status !== undefined && { status: params.status }),
      ...(params.city && { city: params.city.trim() }),
      ...(params.keyword && {
        OR: [
          { name: { contains: params.keyword.trim() } },
          { subtitle: { contains: params.keyword.trim() } },
          { address: { contains: params.keyword.trim() } },
        ],
      }),
    }
    const [rows, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        include: this.include(),
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.venue.count({ where }),
    ])
    return { list: rows.map((row) => this.toVO(row)), total, page: params.page, pageSize: params.pageSize }
  }

  async create(dto: CreateVenueDto) {
    this.validateTimeRules(dto.availability ?? [], dto.blockedSlots ?? [])
    const venue = await this.prisma.venue.create({
      data: this.buildCreateData(dto),
      include: this.include(),
    })
    return this.toVO(venue)
  }

  async update(id: bigint, dto: CreateVenueDto) {
    const existing = await this.prisma.venue.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '场地不存在')
    this.validateTimeRules(dto.availability ?? [], dto.blockedSlots ?? [])

    const venue = await this.prisma.$transaction(async (tx) => {
      await tx.venue.update({
        where: { id },
        data: this.buildUpdateData(dto),
      })
      if (dto.images !== undefined) {
        await tx.venueImage.deleteMany({ where: { venueId: id } })
        if (dto.images.length) {
          await tx.venueImage.createMany({
            data: this.cleanImages(dto.images).map((image) => ({ ...image, venueId: id })),
          })
        }
      }
      if (dto.availability !== undefined) {
        await tx.venueAvailability.deleteMany({ where: { venueId: id } })
        if (dto.availability.length) {
          await tx.venueAvailability.createMany({
            data: this.cleanAvailability(dto.availability).map((item) => ({ ...item, venueId: id })),
          })
        }
      }
      if (dto.blockedSlots !== undefined) {
        await tx.venueBlockedSlot.deleteMany({ where: { venueId: id } })
        if (dto.blockedSlots.length) {
          await tx.venueBlockedSlot.createMany({
            data: this.cleanBlockedSlots(dto.blockedSlots).map((item) => ({ ...item, venueId: id })),
          })
        }
      }
      return tx.venue.findUniqueOrThrow({ where: { id }, include: this.include() })
    })
    return this.toVO(venue)
  }

  async ensureAvailableForActivity(params: {
    venueId?: bigint | null
    activityId?: bigint
    startAt: Date
    endAt: Date
    capacity?: number | null
  }) {
    if (!params.venueId) return null
    const venue = await this.prisma.venue.findFirst({
      where: { id: params.venueId, status: VENUE_STATUS.ENABLED, deletedAt: null },
      include: this.include(),
    })
    if (!venue) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '场地不存在或已停用')
    if (params.capacity && venue.capacity !== null && params.capacity > venue.capacity) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动名额不能超过场地容量')
    }
    this.ensureSameDay(params.startAt, params.endAt)
    this.ensureWithinAvailability(venue.availability, params.startAt, params.endAt)
    this.ensureNotBlocked(venue.blockedSlots, params.startAt, params.endAt)
    await this.ensureNoActivityConflict(params.venueId, params.startAt, params.endAt, params.activityId)
    return venue
  }

  buildSnapshot(venue: VenueWithRelations) {
    return {
      id: Number(venue.id),
      name: venue.name,
      subtitle: venue.subtitle,
      coverUrl: venue.coverUrl,
      address: venue.address,
      city: venue.city,
      district: venue.district,
      capacity: venue.capacity,
      facilities: venue.facilities,
    }
  }

  private buildCreateData(dto: CreateVenueDto): Prisma.VenueCreateInput {
    return {
      ...this.baseData(dto),
      images: { create: this.cleanImages(dto.images ?? []) },
      availability: { create: this.cleanAvailability(dto.availability ?? []) },
      blockedSlots: { create: this.cleanBlockedSlots(dto.blockedSlots ?? []) },
    }
  }

  private buildUpdateData(dto: CreateVenueDto): Prisma.VenueUpdateInput {
    return this.baseData(dto)
  }

  private baseData(dto: CreateVenueDto) {
    return {
      name: dto.name.trim(),
      subtitle: dto.subtitle?.trim() ?? '',
      coverUrl: dto.coverUrl?.trim() ?? '',
      address: dto.address?.trim() ?? '',
      city: dto.city?.trim() ?? '',
      district: dto.district?.trim() ?? '',
      latitude: this.decimalOrNull(dto.latitude),
      longitude: this.decimalOrNull(dto.longitude),
      capacity: dto.capacity ?? null,
      facilities: this.cleanStrings(dto.facilities ?? []),
      description: dto.description?.trim() ?? '',
      contactName: dto.contactName?.trim() ?? '',
      contactPhoneMasked: dto.contactPhoneMasked?.trim() ?? '',
      status: dto.status ?? VENUE_STATUS.ENABLED,
      sortOrder: dto.sortOrder ?? 0,
    }
  }

  private validateTimeRules(availability: VenueAvailabilityInputDto[], blockedSlots: VenueBlockedSlotInputDto[]) {
    for (const item of availability) {
      if (!this.isTimeText(item.startTime) || !this.isTimeText(item.endTime)) {
        throw new BusinessException(ErrorCode.PARAMS_INVALID, '场地可用时间格式必须为 HH:mm')
      }
      if (this.timeToMinutes(item.endTime) <= this.timeToMinutes(item.startTime)) {
        throw new BusinessException(ErrorCode.PARAMS_INVALID, '场地可用结束时间必须晚于开始时间')
      }
    }
    for (const item of blockedSlots) {
      if (new Date(item.endAt).getTime() <= new Date(item.startAt).getTime()) {
        throw new BusinessException(ErrorCode.PARAMS_INVALID, '不可用结束时间必须晚于开始时间')
      }
    }
  }

  private ensureSameDay(startAt: Date, endAt: Date) {
    if (startAt.toDateString() !== endAt.toDateString()) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '选择场地的活动暂只支持单日排期')
    }
  }

  private ensureWithinAvailability(availability: VenueAvailability[], startAt: Date, endAt: Date) {
    const weekday = this.weekday(startAt)
    const active = availability.filter((item) => item.status === 1 && item.weekday === weekday)
    if (!active.length) throw new BusinessException(ErrorCode.PARAMS_INVALID, '场地当天没有可用时间')
    const startMinutes = startAt.getHours() * 60 + startAt.getMinutes()
    const endMinutes = endAt.getHours() * 60 + endAt.getMinutes()
    const matched = active.some((item) => startMinutes >= this.timeToMinutes(item.startTime) && endMinutes <= this.timeToMinutes(item.endTime))
    if (!matched) throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动时间不在场地可用时间内')
  }

  private ensureNotBlocked(blockedSlots: VenueBlockedSlot[], startAt: Date, endAt: Date) {
    const blocked = blockedSlots.some((item) => this.overlaps(startAt, endAt, item.startAt, item.endAt))
    if (blocked) throw new BusinessException(ErrorCode.PARAMS_INVALID, '活动时间与场地不可用时间冲突')
  }

  private async ensureNoActivityConflict(venueId: bigint, startAt: Date, endAt: Date, activityId?: bigint) {
    const conflict = await this.prisma.activity.findFirst({
      where: {
        venueId,
        status: 1,
        deletedAt: null,
        ...(activityId && { id: { not: activityId } }),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, title: true },
    })
    if (conflict) throw new BusinessException(ErrorCode.PARAMS_INVALID, `场地时间与活动「${conflict.title}」冲突`)
  }

  private cleanImages(images: Array<{ imageUrl: string; sortOrder?: number }>) {
    return images
      .map((item, index) => ({ imageUrl: item.imageUrl.trim(), sortOrder: item.sortOrder ?? index }))
      .filter((item) => item.imageUrl)
  }

  private cleanAvailability(items: VenueAvailabilityInputDto[]) {
    return items.map((item) => ({
      weekday: item.weekday,
      startTime: item.startTime.trim(),
      endTime: item.endTime.trim(),
      status: item.status ?? 1,
    }))
  }

  private cleanBlockedSlots(items: VenueBlockedSlotInputDto[]) {
    return items.map((item) => ({
      startAt: new Date(item.startAt),
      endAt: new Date(item.endAt),
      reason: item.reason?.trim() ?? '',
    }))
  }

  private cleanStrings(items: string[]) {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
  }

  private decimalOrNull(value?: number | string | null) {
    if (value === undefined || value === null || value === '') return null
    return new Prisma.Decimal(value)
  }

  private isTimeText(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  }

  private timeToMinutes(value: string) {
    const [hour, minute] = value.split(':').map(Number)
    return hour * 60 + minute
  }

  private weekday(date: Date) {
    const day = date.getDay()
    return day === 0 ? 7 : day
  }

  private overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime()
  }

  private include() {
    return {
      images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      availability: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
      blockedSlots: { orderBy: { startAt: 'asc' } },
    } satisfies Prisma.VenueInclude
  }

  private toVO(venue: VenueWithRelations) {
    return {
      id: Number(venue.id),
      name: venue.name,
      subtitle: venue.subtitle,
      coverUrl: venue.coverUrl,
      address: venue.address,
      city: venue.city,
      district: venue.district,
      latitude: venue.latitude ? Number(venue.latitude) : null,
      longitude: venue.longitude ? Number(venue.longitude) : null,
      capacity: venue.capacity,
      facilities: venue.facilities,
      description: venue.description,
      contactName: venue.contactName,
      contactPhoneMasked: venue.contactPhoneMasked,
      status: venue.status,
      sortOrder: venue.sortOrder,
      images: venue.images.map((item) => ({
        id: Number(item.id),
        imageUrl: item.imageUrl,
        sortOrder: item.sortOrder,
      })),
      availability: venue.availability.map((item) => ({
        id: Number(item.id),
        weekday: item.weekday,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
      })),
      blockedSlots: venue.blockedSlots.map((item) => ({
        id: Number(item.id),
        startAt: item.startAt.toISOString(),
        endAt: item.endAt.toISOString(),
        reason: item.reason,
      })),
      createdAt: venue.createdAt.toISOString(),
      updatedAt: venue.updatedAt.toISOString(),
    }
  }
}
