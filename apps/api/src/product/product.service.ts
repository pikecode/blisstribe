import { Injectable } from '@nestjs/common'
import {
  Prisma,
  type AssessmentOption,
  type AssessmentQuestion,
  type AssessmentRecommendationRule,
  type AssessmentTemplate,
  type Product,
  type ProductLead,
  type ProductLeadFollowUp,
  type ProductModule,
  type TagDictionary,
} from '@prisma/client'
import { ErrorCode } from '@blisstribe/shared'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import {
  PRODUCT_STATUS,
  type CreateRecommendationEventDto,
  type AssessmentQuestionInputDto,
  type CreateAssessmentTemplateDto,
  type CreateProductDto,
  type CreateProductLeadDto,
  type CreateProductModuleDto,
  type CreateRecommendationRuleDto,
  type CreateTagDictionaryDto,
  type FollowProductLeadDto,
  type SyncAssessmentsDto,
  type UpdateAssessmentTemplateDto,
  type UpdateProductDto,
  type UpdateProductModuleDto,
  type UpdateRecommendationRuleDto,
  type UpdateTagDictionaryDto,
} from './dto'

const ACTIVE_PARTNER_STATUS = 1
const DUPLICATE_LEAD_WINDOW_DAYS = 7
const ACTIVE_LEAD_STATUSES = ['new', 'contacted', 'qualified'] as const

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicModules() {
    const rows = await this.prisma.productModule.findMany({
      where: { status: 1, showOnHome: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(this.toModuleVO)
  }

  async publicAssessmentTemplate(moduleCode: string) {
    const template = await this.prisma.assessmentTemplate.findFirst({
      where: {
        status: 1,
        deletedAt: null,
        module: {
          code: moduleCode.trim(),
          status: 1,
          assessmentEnabled: true,
          deletedAt: null,
        },
      },
      include: this.assessmentTemplateInclude(),
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    })
    return template ? this.toAssessmentTemplateVO(template) : null
  }

  async listPublic(params: { moduleCode?: string; productType?: string; tags?: string[]; page: number; pageSize: number }) {
    const where = await this.buildPublicProductWhere(params.moduleCode, params.productType)
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { module: true },
        orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.product.count({ where }),
    ])
    const tags = params.tags ?? []
    return { list: rows.map((p) => this.toPublicProductVO(p, tags)), total, page: params.page, pageSize: params.pageSize }
  }

  async recommended(userId: bigint | null, params: { moduleCode?: string; productType?: string; tags?: string[]; tagIds?: number[]; limit: number }) {
    const user = userId
      ? await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { tags: true, tagIds: true } })
      : null
    const assessment = userId && params.moduleCode
      ? await this.prisma.userAssessment.findUnique({
          where: { userId_moduleCode: { userId, moduleCode: params.moduleCode } },
          select: { tags: true, tagIds: true, tagWeights: true },
        })
      : null
    const queryTagIds = await this.resolveTagIdsByNames(params.tags ?? [], undefined, params.moduleCode)
    const inputTags = this.cleanTags([...(user?.tags ?? []), ...(assessment?.tags ?? []), ...(params.tags ?? [])])
    const inputTagIds = this.cleanTagIds([...(user?.tagIds ?? []), ...(assessment?.tagIds ?? []), ...(params.tagIds ?? []), ...queryTagIds])
    const inputTagWeights = this.normalizeTagWeights(assessment?.tagWeights, inputTagIds)
    const where = await this.buildPublicProductWhere(params.moduleCode, params.productType)
    const products = await this.prisma.product.findMany({
      where,
      include: { module: true },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
      take: 100,
    })
    const rules = await this.listActiveRecommendationRulesForScoring(params.moduleCode)

    return products
      .filter((p) => !this.hasExcludedTagMatch(p.excludeTagIds, inputTagIds))
      .map((p) => {
        const ruleMatch = this.matchBestRecommendationRule(p.id, rules, inputTags, inputTagIds)
        return {
          product: p,
          score: this.scoreProduct(p, inputTags, inputTagIds, inputTagWeights) + (ruleMatch?.scoreBoost ?? 0),
          ruleReason: ruleMatch?.reason || '',
        }
      })
      .sort((a, b) => b.score - a.score || b.product.priority - a.product.priority || a.product.sortOrder - b.product.sortOrder)
      .slice(0, params.limit)
      .map(({ product, score, ruleReason }) => this.toPublicProductVO(product, inputTags, score, false, ruleReason, inputTagIds))
  }

  async detailPublic(id: bigint, tags: string[] = []) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: PRODUCT_STATUS.PUBLISHED, deletedAt: null, module: { status: 1, deletedAt: null } },
      include: { module: true },
    })
    if (!product) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '产品不存在或未上架')
    const tagIds = await this.resolveTagIdsByNames(tags, product.moduleId)
    return this.toPublicProductVO(product, tags, this.scoreProduct(product, tags, tagIds), true, '', tagIds)
  }

  async createLead(productId: bigint, userId: bigint, dto: CreateProductLeadDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: PRODUCT_STATUS.PUBLISHED, deletedAt: null },
      select: { id: true, moduleId: true, productType: true, module: { select: { code: true } } },
    })
    if (!product) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '产品不存在或未上架')

    const duplicateSince = new Date(Date.now() - DUPLICATE_LEAD_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const existingLead = await this.prisma.productLead.findFirst({
      where: {
        productId,
        userId,
        status: { in: [...ACTIVE_LEAD_STATUSES] },
        createdAt: { gte: duplicateSince },
      },
      include: this.leadInclude(),
      orderBy: { createdAt: 'desc' },
    })
    if (existingLead) return this.toLeadVO(existingLead)

    const partnerId = await this.resolveLeadPartnerId(userId, dto.inviteCode)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tags: true, tagIds: true },
    })
    const needTagSnapshot = await this.normalizeTagsForModule(product.moduleId, [
      ...(dto.needTagIds ?? []),
      ...(user?.tagIds ?? []),
    ], [
      ...(dto.needTags ?? []),
      ...(user?.tags ?? []),
    ])

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productLead.create({
        data: {
          productId,
          userId,
          partnerId,
          sourceInviteCode: dto.inviteCode?.trim().toUpperCase() || null,
          sourceScene: dto.sourceScene?.trim() || 'miniapp',
          needTags: needTagSnapshot.names,
          needTagIds: needTagSnapshot.ids,
          message: dto.message?.trim() ?? '',
        },
      })
      await tx.productLeadFollowUp.create({
        data: {
          leadId: created.id,
          operatorType: 'system',
          fromStatus: 'created',
          toStatus: created.status,
          note: '线索创建',
        },
      })
      return tx.productLead.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          ...this.leadInclude(),
          followUps: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      })
    })
    await this.createRecommendationEvent(userId, {
      eventType: 'lead_submit',
      productId: Number(product.id),
      moduleId: Number(product.moduleId),
      moduleCode: product.module.code,
      productType: product.productType,
      recommendationForm: dto.sourceScene === 'assessment_result' ? 'assessment_result' : undefined,
      sourceScene: dto.sourceScene?.trim() || 'miniapp_product_detail',
      tags: needTagSnapshot.names,
      tagIds: needTagSnapshot.ids.map(Number),
      metadata: { leadId: Number(lead.id) },
    })
    return this.toLeadVO(lead)
  }

  async createRecommendationEvent(userId: bigint | null, dto: CreateRecommendationEventDto) {
    const product = dto.productId
      ? await this.prisma.product.findFirst({
          where: { id: BigInt(dto.productId), deletedAt: null },
          select: { id: true, moduleId: true, productType: true, module: { select: { id: true, code: true } } },
        })
      : null
    const module = !product && (dto.moduleId || dto.moduleCode)
      ? await this.prisma.productModule.findFirst({
          where: {
            deletedAt: null,
            ...(dto.moduleId && { id: BigInt(dto.moduleId) }),
            ...(dto.moduleCode && { code: dto.moduleCode.trim() }),
          },
          select: { id: true, code: true },
        })
      : null

    const event = await this.prisma.recommendationEvent.create({
      data: {
        userId,
        anonymousId: dto.anonymousId?.trim() ?? '',
        moduleId: product?.moduleId ?? module?.id ?? (dto.moduleId ? BigInt(dto.moduleId) : null),
        moduleCode: product?.module.code ?? module?.code ?? dto.moduleCode?.trim() ?? '',
        productId: product?.id ?? (dto.productId ? BigInt(dto.productId) : null),
        productType: product?.productType ?? dto.productType ?? '',
        recommendationForm: dto.recommendationForm ?? '',
        eventType: dto.eventType,
        sourceScene: dto.sourceScene?.trim() ?? '',
        tags: this.cleanTags(dto.tags ?? []),
        tagIds: this.cleanTagIds(dto.tagIds ?? []),
        score: dto.score ?? null,
        matchReason: dto.reason?.trim() ?? '',
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
    return { id: Number(event.id) }
  }

  async recommendationAnalyticsAdmin(params: {
    moduleId?: bigint
    moduleCode?: string
    productType?: string
    recommendationForm?: string
    startDate?: string
    endDate?: string
  }) {
    const where = this.buildRecommendationEventWhere(params)
    const productRefs = await this.prisma.recommendationEvent.findMany({
      where: { ...where, productId: { not: null } },
      select: { productId: true },
      distinct: ['productId'],
      take: 100,
    })
    const productIds = productRefs.map((item) => item.productId).filter((id): id is bigint => !!id)
    const [eventGroups, productGroups, productRows, trendEvents] = await Promise.all([
      this.prisma.recommendationEvent.groupBy({
        by: ['eventType'],
        where,
        _count: { _all: true },
      }),
      this.prisma.recommendationEvent.groupBy({
        by: ['productId', 'eventType'],
        where: { ...where, productId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { module: true },
      }),
      this.prisma.recommendationEvent.findMany({
        where,
        select: { createdAt: true, eventType: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])
    const overview = this.buildEventOverview(eventGroups)
    const productMap = new Map(productRows.map((item) => [item.id.toString(), item]))
    const productStats = this.buildProductEventStats(productGroups, productMap)
    const trend = this.buildEventTrend(trendEvents)

    return {
      overview,
      productStats,
      trend,
    }
  }

  async listMyLeads(userId: bigint, params: { page: number; pageSize: number }) {
    const where: Prisma.ProductLeadWhereInput = { userId }
    const [rows, total] = await Promise.all([
      this.prisma.productLead.findMany({
        where,
        include: {
          ...this.leadInclude(),
          followUps: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.productLead.count({ where }),
    ])
    return { list: rows.map((r) => this.toLeadVO(r)), total, page: params.page, pageSize: params.pageSize }
  }

  async listMyAssessments(userId: bigint) {
    const rows = await this.prisma.userAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map((item) => this.toAssessmentVO(item))
  }

  async syncMyAssessments(userId: bigint, dto: SyncAssessmentsDto) {
    const items = dto.items.slice(0, 20)
    const saved = []
    for (const item of items) {
      const tagSnapshot = await this.normalizeTagsForModuleCode(item.moduleCode, item.tagIds, item.tags)
      const row = await this.prisma.userAssessment.upsert({
        where: { userId_moduleCode: { userId, moduleCode: item.moduleCode.trim() } },
        update: {
          assessmentType: item.assessmentType.trim(),
          tags: tagSnapshot.names,
          tagIds: tagSnapshot.ids,
          tagWeights: this.normalizeTagWeightsInput(item.tagWeights, tagSnapshot.ids),
          summary: item.summary.trim(),
          answers: item.answers as Prisma.InputJsonValue,
        },
        create: {
          userId,
          moduleCode: item.moduleCode.trim(),
          assessmentType: item.assessmentType.trim(),
          tags: tagSnapshot.names,
          tagIds: tagSnapshot.ids,
          tagWeights: this.normalizeTagWeightsInput(item.tagWeights, tagSnapshot.ids),
          summary: item.summary.trim(),
          answers: item.answers as Prisma.InputJsonValue,
        },
      })
      saved.push(row)
    }
    return saved.map((item) => this.toAssessmentVO(item))
  }

  async listModulesAdmin() {
    const rows = await this.prisma.productModule.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(this.toModuleVO)
  }

  async createModule(dto: CreateProductModuleDto) {
    const module = await this.prisma.productModule.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? '',
        icon: dto.icon?.trim() ?? '',
        coverUrl: dto.coverUrl?.trim() ?? '',
        showOnHome: dto.showOnHome ?? false,
        assessmentEnabled: dto.assessmentEnabled ?? false,
        assessmentType: dto.assessmentType?.trim() ?? '',
        sortOrder: dto.sortOrder ?? 0,
      },
    })
    return this.toModuleVO(module)
  }

  async updateModule(id: bigint, dto: UpdateProductModuleDto) {
    const module = await this.ensureModule(id)
    const updated = await this.prisma.productModule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.icon !== undefined && { icon: dto.icon.trim() }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl.trim() }),
        ...(dto.showOnHome !== undefined && { showOnHome: dto.showOnHome }),
        ...(dto.assessmentEnabled !== undefined && { assessmentEnabled: dto.assessmentEnabled }),
        ...(dto.assessmentType !== undefined && { assessmentType: dto.assessmentType.trim() }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    })
    return this.toModuleVO({ ...module, ...updated })
  }

  async listAssessmentTemplatesAdmin() {
    const rows = await this.prisma.assessmentTemplate.findMany({
      where: { deletedAt: null },
      include: this.assessmentTemplateInclude(true),
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    })
    return rows.map((item) => this.toAssessmentTemplateVO(item))
  }

  async createAssessmentTemplateAdmin(dto: CreateAssessmentTemplateDto) {
    await this.ensureModule(BigInt(dto.moduleId))
    this.ensureTemplateQuestions(dto.questions)
    const questions = await this.buildQuestionCreateData(BigInt(dto.moduleId), dto.questions)
    const template = await this.prisma.assessmentTemplate.create({
      data: {
        moduleId: BigInt(dto.moduleId),
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() ?? '',
        version: dto.version ?? 1,
        status: dto.status ?? 1,
        sortOrder: dto.sortOrder ?? 0,
        questions: {
          create: questions,
        },
      },
      include: this.assessmentTemplateInclude(true),
    })
    return this.toAssessmentTemplateVO(template)
  }

  async updateAssessmentTemplateAdmin(id: bigint, dto: UpdateAssessmentTemplateDto) {
    const existing = await this.prisma.assessmentTemplate.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '评估模板不存在')
    if (dto.moduleId !== undefined) await this.ensureModule(BigInt(dto.moduleId))
    if (dto.questions !== undefined) this.ensureTemplateQuestions(dto.questions)
    const moduleId = BigInt(dto.moduleId ?? Number(existing.moduleId))
    const questions = dto.questions !== undefined ? await this.buildQuestionCreateData(moduleId, dto.questions) : undefined

    const template = await this.prisma.$transaction(async (tx) => {
      if (dto.questions !== undefined) {
        await tx.assessmentQuestion.deleteMany({ where: { templateId: id } })
      }
      await tx.assessmentTemplate.update({
        where: { id },
        data: {
          ...(dto.moduleId !== undefined && { moduleId: BigInt(dto.moduleId) }),
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.subtitle !== undefined && { subtitle: dto.subtitle.trim() }),
          ...(dto.version !== undefined && { version: dto.version }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(questions !== undefined && { questions: { create: questions } }),
        },
      })
      return tx.assessmentTemplate.findUniqueOrThrow({
        where: { id },
        include: this.assessmentTemplateInclude(true),
      })
    })
    return this.toAssessmentTemplateVO(template)
  }

  async listRecommendationRulesAdmin(params: { moduleId?: bigint; productId?: bigint; status?: number }) {
    const rows = await this.prisma.assessmentRecommendationRule.findMany({
      where: {
        deletedAt: null,
        ...(params.moduleId && { moduleId: params.moduleId }),
        ...(params.productId && { productId: params.productId }),
        ...(params.status !== undefined && !Number.isNaN(params.status) && { status: params.status }),
      },
      include: this.recommendationRuleInclude(),
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    })
    return rows.map((item) => this.toRecommendationRuleVO(item))
  }

  async createRecommendationRuleAdmin(dto: CreateRecommendationRuleDto) {
    const moduleId = BigInt(dto.moduleId)
    await this.ensureProductBelongsToModule(BigInt(dto.productId), moduleId)
    const conditionTagSnapshot = await this.normalizeTagsForModule(moduleId, dto.conditionTagIds, dto.conditionTags ?? [])
    if (!conditionTagSnapshot.ids.length && !conditionTagSnapshot.names.length) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '至少需要配置 1 个命中标签')
    }
    const row = await this.prisma.assessmentRecommendationRule.create({
      data: {
        moduleId,
        productId: BigInt(dto.productId),
        name: dto.name.trim(),
        conditionTags: conditionTagSnapshot.names,
        conditionTagIds: conditionTagSnapshot.ids,
        scoreBoost: dto.scoreBoost ?? 0,
        reason: dto.reason?.trim() ?? '',
        status: dto.status ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: this.recommendationRuleInclude(),
    })
    return this.toRecommendationRuleVO(row)
  }

  async updateRecommendationRuleAdmin(id: bigint, dto: UpdateRecommendationRuleDto) {
    const existing = await this.prisma.assessmentRecommendationRule.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '推荐规则不存在')
    const moduleId = BigInt(dto.moduleId ?? Number(existing.moduleId))
    const productId = BigInt(dto.productId ?? Number(existing.productId))
    if (dto.moduleId !== undefined || dto.productId !== undefined) {
      await this.ensureProductBelongsToModule(productId, moduleId)
    }
    const conditionTagSnapshot = dto.conditionTags !== undefined || dto.conditionTagIds !== undefined
      ? await this.normalizeTagsForModule(moduleId, dto.conditionTagIds, dto.conditionTags ?? [])
      : undefined
    if (conditionTagSnapshot !== undefined && !conditionTagSnapshot.ids.length && !conditionTagSnapshot.names.length) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '至少需要配置 1 个命中标签')
    }
    const row = await this.prisma.assessmentRecommendationRule.update({
      where: { id },
      data: {
        ...(dto.moduleId !== undefined && { moduleId }),
        ...(dto.productId !== undefined && { productId }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(conditionTagSnapshot !== undefined && {
          conditionTags: conditionTagSnapshot.names,
          conditionTagIds: conditionTagSnapshot.ids,
        }),
        ...(dto.scoreBoost !== undefined && { scoreBoost: dto.scoreBoost }),
        ...(dto.reason !== undefined && { reason: dto.reason.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: this.recommendationRuleInclude(),
    })
    return this.toRecommendationRuleVO(row)
  }

  async listTagsAdmin(params: { moduleId?: bigint; status?: number; keyword?: string; group?: string }) {
    const and: Prisma.TagDictionaryWhereInput[] = []
    if (params.moduleId) and.push({ OR: [{ moduleId: params.moduleId }, { moduleId: null }] })
    if (params.keyword) {
      and.push({
        OR: [
          { code: { contains: params.keyword } },
          { name: { contains: params.keyword } },
          { description: { contains: params.keyword } },
        ],
      })
    }
    const rows = await this.prisma.tagDictionary.findMany({
      where: {
        deletedAt: null,
        ...(params.status !== undefined && !Number.isNaN(params.status) && { status: params.status }),
        ...(params.group && { group: params.group }),
        ...(and.length && { AND: and }),
      },
      include: { module: true },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map((item) => this.toTagVO(item))
  }

  async listTagsPublic(params: { moduleId?: bigint; status?: number; keyword?: string; group?: string }) {
    return this.listTagsAdmin({
      ...params,
      status: 1,
    })
  }

  async createTagAdmin(dto: CreateTagDictionaryDto) {
    if (dto.moduleId !== undefined) await this.ensureModule(BigInt(dto.moduleId))
    const row = await this.prisma.tagDictionary.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        group: dto.group?.trim() ?? '',
        moduleId: dto.moduleId ? BigInt(dto.moduleId) : null,
        description: dto.description?.trim() ?? '',
        status: dto.status ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { module: true },
    })
    return this.toTagVO(row)
  }

  async updateTagAdmin(id: bigint, dto: UpdateTagDictionaryDto) {
    const existing = await this.prisma.tagDictionary.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '标签不存在')
    if (dto.moduleId !== undefined) await this.ensureModule(BigInt(dto.moduleId))
    const row = await this.prisma.tagDictionary.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.group !== undefined && { group: dto.group.trim() }),
        ...(dto.moduleId !== undefined && { moduleId: BigInt(dto.moduleId) }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { module: true },
    })
    if (dto.name !== undefined && dto.name.trim() !== existing.name) {
      await this.refreshTagNameSnapshots(id, existing.name, dto.name.trim())
    }
    return this.toTagVO(row)
  }

  async listProductsAdmin(params: { page: number; pageSize: number; status?: number; moduleId?: bigint; productType?: string; keyword?: string }) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(params.status !== undefined && !Number.isNaN(params.status) && { status: params.status }),
      ...(params.moduleId && { moduleId: params.moduleId }),
      ...(params.productType && { productType: params.productType }),
      ...(params.keyword && {
        OR: [
          { title: { contains: params.keyword } },
          { subtitle: { contains: params.keyword } },
          { summary: { contains: params.keyword } },
        ],
      }),
    }
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { module: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.product.count({ where }),
    ])
    return { list: rows.map((p) => this.toAdminProductVO(p)), total, page: params.page, pageSize: params.pageSize }
  }

  async createProduct(dto: CreateProductDto) {
    const moduleId = BigInt(dto.moduleId)
    await this.ensureModule(moduleId)
    const tagSnapshot = await this.normalizeTagsForModule(moduleId, dto.tagIds, dto.tags)
    const recommendationConfig = await this.normalizeProductRecommendationConfig(moduleId, dto, tagSnapshot.ids)
    const product = await this.prisma.product.create({
      data: this.buildProductCreateData(dto, tagSnapshot, recommendationConfig),
      include: { module: true },
    })
    return this.toAdminProductVO(product)
  }

  async updateProduct(id: bigint, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } })
    if (!product) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '产品不存在')
    if (dto.moduleId !== undefined) await this.ensureModule(BigInt(dto.moduleId))
    const moduleId = BigInt(dto.moduleId ?? Number(product.moduleId))
    const tagSnapshot = dto.tags !== undefined || dto.tagIds !== undefined
      ? await this.normalizeTagsForModule(moduleId, dto.tagIds, dto.tags ?? [])
      : undefined
    const recommendationConfig = await this.normalizeProductRecommendationConfig(moduleId, dto, tagSnapshot?.ids)

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...this.buildProductUpdateData(dto, tagSnapshot, recommendationConfig),
        ...(dto.status !== undefined && {
          status: dto.status,
          publishedAt: dto.status === PRODUCT_STATUS.PUBLISHED ? product.publishedAt ?? new Date() : product.publishedAt,
        }),
      },
      include: { module: true },
    })
    return this.toAdminProductVO(updated)
  }

  async publishProduct(id: bigint) {
    return this.updateProduct(id, { status: PRODUCT_STATUS.PUBLISHED })
  }

  async unpublishProduct(id: bigint) {
    return this.updateProduct(id, { status: PRODUCT_STATUS.UNPUBLISHED })
  }

  async listLeadsAdmin(params: {
    page: number
    pageSize: number
    status?: string
    productId?: bigint
    partnerId?: bigint
    followScope?: string
    keyword?: string
  }) {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const where: Prisma.ProductLeadWhereInput = {
      ...(params.status
        ? { status: params.status }
        : params.followScope
          ? { status: { in: [...ACTIVE_LEAD_STATUSES] } }
          : {}),
      ...(params.productId && { productId: params.productId }),
      ...(params.partnerId && { partnerId: params.partnerId }),
      ...this.buildFollowScopeWhere(params.followScope, now, todayStart, tomorrowStart),
      ...(params.keyword && {
        OR: [
          { product: { title: { contains: params.keyword } } },
          { user: { nickname: { contains: params.keyword } } },
          { user: { phoneMasked: { contains: params.keyword } } },
          { message: { contains: params.keyword } },
        ],
      }),
    }
    const [rows, total] = await Promise.all([
      this.prisma.productLead.findMany({
        where,
        include: {
          ...this.leadInclude(),
          followUps: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: [{ nextFollowAt: 'asc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.productLead.count({ where }),
    ])
    return { list: rows.map((r) => this.toLeadVO(r)), total, page: params.page, pageSize: params.pageSize }
  }

  async leadSummaryAdmin() {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const activeStatusWhere = { status: { in: [...ACTIVE_LEAD_STATUSES] } }

    const [
      total,
      active,
      today,
      overdue,
      upcoming,
      converted,
      invalid,
    ] = await Promise.all([
      this.prisma.productLead.count(),
      this.prisma.productLead.count({ where: activeStatusWhere }),
      this.prisma.productLead.count({
        where: {
          ...activeStatusWhere,
          nextFollowAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      this.prisma.productLead.count({
        where: {
          ...activeStatusWhere,
          nextFollowAt: { lt: now },
        },
      }),
      this.prisma.productLead.count({
        where: {
          ...activeStatusWhere,
          nextFollowAt: { gte: tomorrowStart },
        },
      }),
      this.prisma.productLead.count({ where: { status: 'converted' } }),
      this.prisma.productLead.count({ where: { status: 'invalid' } }),
    ])

    return { total, active, today, overdue, upcoming, converted, invalid }
  }

  async detailLeadAdmin(id: bigint) {
    const lead = await this.prisma.productLead.findUnique({
      where: { id },
      include: {
        ...this.leadInclude(),
        followUps: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!lead) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '线索不存在')
    return this.toLeadVO(lead)
  }

  async followLeadAdmin(id: bigint, adminId: bigint, dto: FollowProductLeadDto) {
    const existing = await this.prisma.productLead.findUnique({ where: { id } })
    if (!existing) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '线索不存在')

    const lead = await this.prisma.$transaction(async (tx) => {
      await tx.productLead.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.followUpNote !== undefined && { followUpNote: dto.followUpNote.trim() }),
          nextFollowAt: dto.nextFollowAt ? new Date(dto.nextFollowAt) : null,
        },
        include: {
          ...this.leadInclude(),
          followUps: { orderBy: { createdAt: 'desc' } },
        },
      })
      await tx.productLeadFollowUp.create({
        data: {
          leadId: id,
          operatorId: adminId,
          operatorType: 'admin',
          fromStatus: existing.status,
          toStatus: dto.status,
          note: dto.followUpNote?.trim() ?? '',
          nextFollowAt: dto.nextFollowAt ? new Date(dto.nextFollowAt) : null,
        },
      })
      return tx.productLead.findUniqueOrThrow({
        where: { id },
        include: {
          ...this.leadInclude(),
          followUps: { orderBy: { createdAt: 'desc' } },
        },
      })
    })
    return this.toLeadVO(lead)
  }

  async listPartnerProducts(userId: bigint, params: { page: number; pageSize: number }) {
    await this.ensureActivePartnerForUser(userId)
    return this.listPublic({ page: params.page, pageSize: params.pageSize })
  }

  async listPartnerLeads(userId: bigint, params: { page: number; pageSize: number }) {
    const partnerId = await this.ensureActivePartnerForUser(userId)
    const [rows, total] = await Promise.all([
      this.prisma.productLead.findMany({
        where: { partnerId },
        include: this.leadInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.productLead.count({ where: { partnerId } }),
    ])
    return { list: rows.map((r) => this.toLeadVO(r)), total, page: params.page, pageSize: params.pageSize }
  }

  private async buildPublicProductWhere(moduleCode?: string, productType?: string): Promise<Prisma.ProductWhereInput> {
    return {
      status: PRODUCT_STATUS.PUBLISHED,
      deletedAt: null,
      ...(productType && { productType }),
      module: {
        status: 1,
        deletedAt: null,
        ...(moduleCode && { code: moduleCode }),
      },
    }
  }

  private buildRecommendationEventWhere(params: {
    moduleId?: bigint
    moduleCode?: string
    productType?: string
    recommendationForm?: string
    startDate?: string
    endDate?: string
  }): Prisma.RecommendationEventWhereInput {
    const createdAt: Prisma.DateTimeFilter = {}
    if (params.startDate) createdAt.gte = new Date(params.startDate)
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      createdAt.lte = end
    }
    return {
      ...(params.moduleId && { moduleId: params.moduleId }),
      ...(params.moduleCode && { moduleCode: params.moduleCode }),
      ...(params.productType && { productType: params.productType }),
      ...(params.recommendationForm && { recommendationForm: params.recommendationForm }),
      ...(Object.keys(createdAt).length && { createdAt }),
    }
  }

  private buildEventOverview(groups: Array<{ eventType: string; _count: { _all: number } }>) {
    const countOf = (eventType: string) => groups.find((item) => item.eventType === eventType)?._count._all ?? 0
    const impressions = countOf('impression')
    const clicks = countOf('click')
    const leads = countOf('lead_submit')
    const assessments = countOf('assessment_submit')
    return {
      impressions,
      clicks,
      leads,
      assessments,
      clickRate: this.percent(clicks, impressions),
      leadRate: this.percent(leads, clicks || impressions),
    }
  }

  private buildProductEventStats(
    groups: Array<{ productId: bigint | null; eventType: string; _count: { _all: number } }>,
    productMap: Map<string, Product & { module: ProductModule }>
  ) {
    const statMap = new Map<string, {
      productId: number
      product: Record<string, unknown> | null
      impressions: number
      clicks: number
      leads: number
      assessments: number
    }>()

    for (const group of groups) {
      if (!group.productId) continue
      const key = group.productId.toString()
      const product = productMap.get(key)
      const current = statMap.get(key) ?? {
        productId: Number(group.productId),
        product: product ? this.toAdminProductVO(product) : null,
        impressions: 0,
        clicks: 0,
        leads: 0,
        assessments: 0,
      }
      if (group.eventType === 'impression') current.impressions += group._count._all
      if (group.eventType === 'click') current.clicks += group._count._all
      if (group.eventType === 'lead_submit') current.leads += group._count._all
      if (group.eventType === 'assessment_submit') current.assessments += group._count._all
      statMap.set(key, current)
    }

    return Array.from(statMap.values())
      .map((item) => ({
        ...item,
        clickRate: this.percent(item.clicks, item.impressions),
        leadRate: this.percent(item.leads, item.clicks || item.impressions),
      }))
      .sort((a, b) => b.leads - a.leads || b.clicks - a.clicks || b.impressions - a.impressions)
  }

  private buildEventTrend(events: Array<{ createdAt: Date; eventType: string }>) {
    const trendMap = new Map<string, { date: string; impressions: number; clicks: number; leads: number; assessments: number }>()
    for (const event of events) {
      const date = event.createdAt.toISOString().slice(0, 10)
      const current = trendMap.get(date) ?? { date, impressions: 0, clicks: 0, leads: 0, assessments: 0 }
      if (event.eventType === 'impression') current.impressions += 1
      if (event.eventType === 'click') current.clicks += 1
      if (event.eventType === 'lead_submit') current.leads += 1
      if (event.eventType === 'assessment_submit') current.assessments += 1
      trendMap.set(date, current)
    }
    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  private percent(numerator: number, denominator: number) {
    if (!denominator) return 0
    return Math.round((numerator / denominator) * 10000) / 100
  }

  private buildProductCreateData(
    dto: CreateProductDto,
    tagSnapshot: { ids: bigint[]; names: string[] },
    recommendationConfig?: { primaryTagIds?: bigint[]; secondaryTagIds?: bigint[]; excludeTagIds?: bigint[] }
  ): Prisma.ProductUncheckedCreateInput {
    return {
      moduleId: BigInt(dto.moduleId),
      productType: dto.productType ?? 'service',
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() ?? '',
      coverUrl: dto.coverUrl ?? '',
      priceText: dto.priceText?.trim() ?? '',
      summary: dto.summary?.trim() ?? '',
      detail: dto.detail ?? '',
      targetUserText: dto.targetUserText?.trim() ?? '',
      painPointText: dto.painPointText?.trim() ?? '',
      serviceProcess: dto.serviceProcess?.trim() ?? '',
      serviceMode: dto.serviceMode?.trim() ?? '',
      serviceDuration: dto.serviceDuration?.trim() ?? '',
      appointmentRequired: dto.appointmentRequired ?? false,
      specText: dto.specText?.trim() ?? '',
      deliveryText: dto.deliveryText?.trim() ?? '',
      afterSaleText: dto.afterSaleText?.trim() ?? '',
      stockStatus: dto.stockStatus ?? 'available',
      tags: tagSnapshot.names,
      tagIds: tagSnapshot.ids,
      primaryTagIds: recommendationConfig?.primaryTagIds ?? tagSnapshot.ids,
      secondaryTagIds: recommendationConfig?.secondaryTagIds ?? [],
      excludeTagIds: recommendationConfig?.excludeTagIds ?? [],
      priority: dto.priority ?? 0,
      sortOrder: dto.sortOrder ?? 0,
    }
  }

  private buildProductUpdateData(
    dto: UpdateProductDto,
    tagSnapshot?: { ids: bigint[]; names: string[] },
    recommendationConfig?: { primaryTagIds?: bigint[]; secondaryTagIds?: bigint[]; excludeTagIds?: bigint[] }
  ): Prisma.ProductUncheckedUpdateInput {
    return {
      ...(dto.moduleId !== undefined && { moduleId: BigInt(dto.moduleId) }),
      ...(dto.productType !== undefined && { productType: dto.productType }),
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(dto.subtitle !== undefined && { subtitle: dto.subtitle.trim() }),
      ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
      ...(dto.priceText !== undefined && { priceText: dto.priceText.trim() }),
      ...(dto.summary !== undefined && { summary: dto.summary.trim() }),
      ...(dto.detail !== undefined && { detail: dto.detail }),
      ...(dto.targetUserText !== undefined && { targetUserText: dto.targetUserText.trim() }),
      ...(dto.painPointText !== undefined && { painPointText: dto.painPointText.trim() }),
      ...(dto.serviceProcess !== undefined && { serviceProcess: dto.serviceProcess.trim() }),
      ...(dto.serviceMode !== undefined && { serviceMode: dto.serviceMode.trim() }),
      ...(dto.serviceDuration !== undefined && { serviceDuration: dto.serviceDuration.trim() }),
      ...(dto.appointmentRequired !== undefined && { appointmentRequired: dto.appointmentRequired }),
      ...(dto.specText !== undefined && { specText: dto.specText.trim() }),
      ...(dto.deliveryText !== undefined && { deliveryText: dto.deliveryText.trim() }),
      ...(dto.afterSaleText !== undefined && { afterSaleText: dto.afterSaleText.trim() }),
      ...(dto.stockStatus !== undefined && { stockStatus: dto.stockStatus }),
      ...(tagSnapshot !== undefined && { tags: tagSnapshot.names, tagIds: tagSnapshot.ids }),
      ...(recommendationConfig?.primaryTagIds !== undefined && { primaryTagIds: recommendationConfig.primaryTagIds }),
      ...(recommendationConfig?.secondaryTagIds !== undefined && { secondaryTagIds: recommendationConfig.secondaryTagIds }),
      ...(recommendationConfig?.excludeTagIds !== undefined && { excludeTagIds: recommendationConfig.excludeTagIds }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    }
  }

  private async resolveLeadPartnerId(userId: bigint, inviteCode?: string): Promise<bigint | null> {
    const cleanCode = inviteCode?.trim().toUpperCase()
    if (cleanCode) {
      const code = await this.prisma.invitationCode.findFirst({
        where: {
          code: cleanCode,
          ownerType: 'partner',
          status: 1,
        },
      })
      if (code) {
        const partner = await this.prisma.partner.findFirst({
          where: { id: code.ownerId, status: ACTIVE_PARTNER_STATUS, deletedAt: null },
          select: { id: true },
        })
        if (partner) return partner.id
      }
    }

    const relation = await this.prisma.customerRelation.findFirst({
      where: { customerUserId: userId, status: 1 },
      orderBy: { boundAt: 'desc' },
      select: { partnerId: true },
    })
    return relation?.partnerId ?? null
  }

  private async ensureModule(id: bigint) {
    const module = await this.prisma.productModule.findFirst({ where: { id, deletedAt: null } })
    if (!module) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '产品模块不存在')
    return module
  }

  private async ensureProductBelongsToModule(productId: bigint, moduleId: bigint) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, moduleId, deletedAt: null },
      select: { id: true },
    })
    if (!product) throw new BusinessException(ErrorCode.PARAMS_INVALID, '产品不属于所选模块')
  }

  private buildFollowScopeWhere(
    followScope: string | undefined,
    now: Date,
    todayStart: Date,
    tomorrowStart: Date
  ): Prisma.ProductLeadWhereInput {
    if (followScope === 'overdue') return { nextFollowAt: { lt: now } }
    if (followScope === 'today') return { nextFollowAt: { gte: todayStart, lt: tomorrowStart } }
    if (followScope === 'upcoming') return { nextFollowAt: { gte: tomorrowStart } }
    return {}
  }

  private async ensureActivePartnerForUser(userId: bigint): Promise<bigint> {
    const member = await this.prisma.partnerMember.findFirst({
      where: {
        userId,
        status: 1,
        partner: { status: ACTIVE_PARTNER_STATUS, deletedAt: null },
      },
      select: { partnerId: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!member) throw new BusinessException(ErrorCode.FORBIDDEN, '当前用户不是有效 B 端成员')
    return member.partnerId
  }

  private scoreProduct(
    product: Pick<Product, 'tags' | 'tagIds' | 'primaryTagIds' | 'secondaryTagIds' | 'priority'>,
    userTags: string[],
    userTagIds: bigint[] = [],
    userTagWeights: Map<string, number> = new Map()
  ): number {
    const tagSet = new Set(userTags)
    const tagIdSet = new Set(userTagIds.map(String))
    const primaryMatches = product.primaryTagIds.filter((tagId) => tagIdSet.has(String(tagId)))
    const secondaryMatches = product.secondaryTagIds.filter((tagId) => tagIdSet.has(String(tagId)))
    const configuredIds = new Set([...product.primaryTagIds, ...product.secondaryTagIds].map(String))
    const matchedById = product.tagIds.filter((tagId) => tagIdSet.has(String(tagId)) && !configuredIds.has(String(tagId)))
    const matchedByName = product.tags.filter((tag) => tagSet.has(tag))

    const primaryScore = primaryMatches.reduce((sum, tagId) => sum + this.tagWeight(userTagWeights, tagId) * 20, 0)
    const secondaryScore = secondaryMatches.reduce((sum, tagId) => sum + this.tagWeight(userTagWeights, tagId) * 10, 0)
    const fallbackScore = Math.max(
      matchedById.reduce((sum, tagId) => sum + this.tagWeight(userTagWeights, tagId) * 5, 0),
      matchedByName.length * 10
    )
    return Math.round(product.priority + primaryScore + secondaryScore + fallbackScore)
  }

  private getMatchType(
    product: Pick<Product, 'tagIds' | 'primaryTagIds' | 'secondaryTagIds'>,
    userTagIds: bigint[],
  ): 'primary' | 'secondary' | 'fallback' {
    const tagIdSet = new Set(userTagIds.map(String))
    const hasPrimaryMatch = product.primaryTagIds.some((tagId) => tagIdSet.has(String(tagId)))
    if (hasPrimaryMatch) return 'primary'

    const hasSecondaryMatch = product.secondaryTagIds.some((tagId) => tagIdSet.has(String(tagId)))
    if (hasSecondaryMatch) return 'secondary'

    return 'fallback'
  }

  private hasExcludedTagMatch(excludeTagIds: bigint[], userTagIds: bigint[] = []) {
    if (!excludeTagIds.length || !userTagIds.length) return false
    const userSet = new Set(userTagIds.map(String))
    return excludeTagIds.some((tagId) => userSet.has(String(tagId)))
  }

  private tagWeight(weights: Map<string, number>, tagId: bigint) {
    return weights.get(String(tagId)) ?? 1
  }

  private normalizeTagWeights(value: Prisma.JsonValue | undefined, tagIds: bigint[] = []) {
    const weights = new Map<string, number>()
    const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    for (const tagId of tagIds) {
      const key = String(tagId)
      const weight = Number((raw as Record<string, unknown>)[key] ?? 1)
      weights.set(key, Number.isFinite(weight) && weight > 0 ? Math.min(weight, 5) : 1)
    }
    return weights
  }

  private normalizeTagWeightsInput(value: Record<string, number> | undefined, tagIds: bigint[] = []) {
    const result: Record<string, number> = {}
    for (const tagId of tagIds) {
      const key = String(tagId)
      const weight = Number(value?.[key] ?? 1)
      result[key] = Number.isFinite(weight) && weight > 0 ? Math.min(Math.round(weight), 5) : 1
    }
    return result
  }

  private async listActiveRecommendationRulesForScoring(moduleCode?: string) {
    return this.prisma.assessmentRecommendationRule.findMany({
      where: {
        status: 1,
        deletedAt: null,
        module: {
          status: 1,
          deletedAt: null,
          ...(moduleCode && { code: moduleCode }),
        },
        product: {
          status: PRODUCT_STATUS.PUBLISHED,
          deletedAt: null,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { scoreBoost: 'desc' }, { updatedAt: 'desc' }],
    })
  }

  private matchBestRecommendationRule(productId: bigint, rules: AssessmentRecommendationRule[], tags: string[], tagIds: bigint[] = []) {
    const tagSet = new Set(tags)
    const tagIdSet = new Set(tagIds.map(String))
    return rules
      .filter((rule) => rule.productId === productId)
      .filter((rule) => {
        if (rule.conditionTagIds.length > 0) {
          return rule.conditionTagIds.every((tagId) => tagIdSet.has(String(tagId)))
        }
        return rule.conditionTags.length > 0 && rule.conditionTags.every((tag) => tagSet.has(tag))
      })
      .sort((a, b) => b.scoreBoost - a.scoreBoost || a.sortOrder - b.sortOrder)[0]
  }

  private cleanTags(tags: string[]) {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20)
  }

  private cleanTagIds(tagIds: Array<number | bigint> = []) {
    const ids = tagIds
      .map((id) => BigInt(id))
      .filter((id) => id > 0n)
    return Array.from(new Map(ids.map((id) => [String(id), id])).values()).slice(0, 20)
  }

  private async normalizeTagsForModule(moduleId: bigint | undefined, tagIds: Array<number | bigint> | undefined, tags: string[] = []) {
    const ids = this.cleanTagIds(tagIds ?? [])
    const names = this.cleanTags(tags)
    if (!ids.length && !names.length) return { ids: [], names: [] }
    const and: Prisma.TagDictionaryWhereInput[] = [
      {
        OR: [
          ...(ids.length ? [{ id: { in: ids } }] : []),
          ...(names.length ? [{ name: { in: names } }] : []),
        ],
      },
    ]
    if (moduleId) and.push({ OR: [{ moduleId }, { moduleId: null }] })
    const tagRows = await this.prisma.tagDictionary.findMany({
      where: {
        deletedAt: null,
        AND: and,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    const resolvedIds = this.cleanTagIds(tagRows.map((tag) => tag.id))
    return {
      ids: resolvedIds,
      names: this.cleanTags([...tagRows.map((tag) => tag.name), ...names]),
    }
  }

  private async normalizeProductRecommendationConfig(
    moduleId: bigint,
    dto: Pick<CreateProductDto | UpdateProductDto, 'primaryTagIds' | 'secondaryTagIds' | 'excludeTagIds'>,
    fallbackPrimaryTagIds?: bigint[]
  ) {
    const hasPrimary = dto.primaryTagIds !== undefined
    const hasSecondary = dto.secondaryTagIds !== undefined
    const hasExclude = dto.excludeTagIds !== undefined
    if (!hasPrimary && !hasSecondary && !hasExclude && fallbackPrimaryTagIds === undefined) return undefined
    return {
      primaryTagIds: hasPrimary ? (await this.normalizeTagsForModule(moduleId, dto.primaryTagIds, [])).ids : fallbackPrimaryTagIds ?? [],
      secondaryTagIds: hasSecondary ? (await this.normalizeTagsForModule(moduleId, dto.secondaryTagIds, [])).ids : undefined,
      excludeTagIds: hasExclude ? (await this.normalizeTagsForModule(moduleId, dto.excludeTagIds, [])).ids : undefined,
    }
  }

  private async normalizeTagsForModuleCode(moduleCode: string, tagIds: number[] | undefined, tags: string[] = []) {
    const module = await this.prisma.productModule.findFirst({
      where: { code: moduleCode.trim(), deletedAt: null },
      select: { id: true },
    })
    return this.normalizeTagsForModule(module?.id, tagIds, tags)
  }

  private async resolveTagIdsByNames(tags: string[] = [], moduleId?: bigint, moduleCode?: string) {
    const tagSnapshot = moduleCode
      ? await this.normalizeTagsForModuleCode(moduleCode, undefined, tags)
      : await this.normalizeTagsForModule(moduleId, undefined, tags)
    return tagSnapshot.ids
  }

  private async refreshTagNameSnapshots(tagId: bigint, oldName: string, newName: string) {
    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "Product"
        SET tags = array_replace(tags, ${oldName}, ${newName})
        WHERE ${tagId} = ANY("tagIds")
      `,
      this.prisma.$executeRaw`
        UPDATE "AssessmentOption"
        SET tags = array_replace(tags, ${oldName}, ${newName})
        WHERE ${tagId} = ANY("tagIds")
      `,
      this.prisma.$executeRaw`
        UPDATE "AssessmentRecommendationRule"
        SET "conditionTags" = array_replace("conditionTags", ${oldName}, ${newName})
        WHERE ${tagId} = ANY("conditionTagIds")
      `,
      this.prisma.$executeRaw`
        UPDATE "UserAssessment"
        SET tags = array_replace(tags, ${oldName}, ${newName})
        WHERE ${tagId} = ANY("tagIds")
      `,
      this.prisma.$executeRaw`
        UPDATE "ProductLead"
        SET "needTags" = array_replace("needTags", ${oldName}, ${newName})
        WHERE ${tagId} = ANY("needTagIds")
      `,
    ])
  }

  private ensureTemplateQuestions(questions: AssessmentQuestionInputDto[]) {
    if (!questions.length) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '至少需要配置 1 道评估题')
    }
    const questionKeys = new Set<string>()
    for (const question of questions) {
      const key = question.key.trim()
      if (questionKeys.has(key)) {
        throw new BusinessException(ErrorCode.PARAMS_INVALID, `题目标识重复: ${key}`)
      }
      questionKeys.add(key)
      if (!question.options.length) {
        throw new BusinessException(ErrorCode.PARAMS_INVALID, `题目「${question.title}」至少需要 1 个选项`)
      }
      const optionValues = new Set<string>()
      for (const option of question.options) {
        const value = option.value.trim()
        if (optionValues.has(value)) {
          throw new BusinessException(ErrorCode.PARAMS_INVALID, `题目「${question.title}」选项值重复: ${value}`)
        }
        optionValues.add(value)
      }
    }
  }

  private async buildQuestionCreateData(moduleId: bigint, questions: AssessmentQuestionInputDto[]) {
    return Promise.all(questions.map(async (question, questionIndex) => ({
      key: question.key.trim(),
      title: question.title.trim(),
      type: question.type ?? 'single',
      sortOrder: question.sortOrder ?? questionIndex,
      options: {
        create: await Promise.all(question.options.map(async (option, optionIndex) => {
          const tagSnapshot = await this.normalizeTagsForModule(moduleId, option.tagIds, option.tags ?? [])
          return {
            label: option.label.trim(),
            value: option.value.trim(),
            tags: tagSnapshot.names,
            tagIds: tagSnapshot.ids,
            tagWeights: this.normalizeTagWeightsInput(option.tagWeights, tagSnapshot.ids),
            sortOrder: option.sortOrder ?? optionIndex,
          }
        })),
      },
    })))
  }

  private leadInclude() {
    return {
      product: { select: { id: true, title: true, coverUrl: true, priceText: true } },
      user: { select: { id: true, nickname: true, avatar: true, phoneMasked: true, tags: true } },
      partner: { select: { id: true, displayName: true, partnerNo: true } },
    } satisfies Prisma.ProductLeadInclude
  }

  private assessmentTemplateInclude(includeModule = false) {
    return {
      ...(includeModule && { module: true }),
      questions: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        },
      },
    } satisfies Prisma.AssessmentTemplateInclude
  }

  private recommendationRuleInclude() {
    return {
      module: true,
      product: { include: { module: true } },
    } satisfies Prisma.AssessmentRecommendationRuleInclude
  }

  private toModuleVO(module: ProductModule) {
    return {
      id: Number(module.id),
      code: module.code,
      name: module.name,
      description: module.description,
      icon: module.icon,
      coverUrl: module.coverUrl,
      showOnHome: module.showOnHome,
      assessmentEnabled: module.assessmentEnabled,
      assessmentType: module.assessmentType,
      sortOrder: module.sortOrder,
      status: module.status,
      createdAt: module.createdAt.toISOString(),
      updatedAt: module.updatedAt.toISOString(),
    }
  }

  private toPublicProductVO(
    product: Product & { module: ProductModule },
    userTags: string[] = [],
    score = 0,
    includeDetail = false,
    ruleReason = '',
    userTagIds: bigint[] = []
  ) {
    const matchedTags = product.tags.filter((tag) => userTags.includes(tag))
    return {
      id: Number(product.id),
      module: this.toModuleVO(product.module),
      productType: product.productType,
      title: product.title,
      subtitle: product.subtitle,
      coverUrl: product.coverUrl,
      priceText: product.priceText,
      summary: product.summary,
      targetUserText: product.targetUserText,
      painPointText: product.painPointText,
      serviceProcess: product.serviceProcess,
      serviceMode: product.serviceMode,
      serviceDuration: product.serviceDuration,
      appointmentRequired: product.appointmentRequired,
      specText: product.specText,
      deliveryText: product.deliveryText,
      afterSaleText: product.afterSaleText,
      stockStatus: product.stockStatus,
      tags: product.tags,
      tagIds: product.tagIds.map(Number),
      primaryTagIds: product.primaryTagIds.map(Number),
      secondaryTagIds: product.secondaryTagIds.map(Number),
      excludeTagIds: product.excludeTagIds.map(Number),
      matchedTags,
      matchedTagIds: product.tagIds.filter((tagId) => userTagIds.some((id) => id === tagId)).map(Number),
      recommendReason: ruleReason || (matchedTags.length > 0 ? `因为你关注了${matchedTags.slice(0, 2).join('、')}` : '平台精选推荐'),
      score,
      publishedAt: product.publishedAt?.toISOString() ?? null,
      ...(includeDetail && { detail: product.detail }),
    }
  }

  private toAdminProductVO(product: Product & { module: ProductModule }) {
    return {
      ...this.toPublicProductVO(product, [], 0, true),
      priority: product.priority,
      sortOrder: product.sortOrder,
      status: product.status,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    }
  }

  private toLeadVO(
    lead: ProductLead & {
      product: { id: bigint; title: string; coverUrl: string; priceText: string }
      user: { id: bigint; nickname: string; avatar: string; phoneMasked: string; tags: string[] }
      partner: { id: bigint; displayName: string; partnerNo: string } | null
      followUps?: ProductLeadFollowUp[]
    }
  ) {
    return {
      id: Number(lead.id),
      productId: Number(lead.productId),
      product: { ...lead.product, id: Number(lead.product.id) },
      userId: Number(lead.userId),
      user: { ...lead.user, id: Number(lead.user.id) },
      partnerId: lead.partnerId ? Number(lead.partnerId) : null,
      partner: lead.partner ? { ...lead.partner, id: Number(lead.partner.id) } : null,
      sourceInviteCode: lead.sourceInviteCode,
      sourceScene: lead.sourceScene,
      needTags: lead.needTags,
      needTagIds: lead.needTagIds.map(Number),
      message: lead.message,
      status: lead.status,
      followUpNote: lead.followUpNote,
      nextFollowAt: lead.nextFollowAt?.toISOString() ?? null,
      followUps: lead.followUps?.map((item) => ({
        id: Number(item.id),
        leadId: Number(item.leadId),
        operatorId: item.operatorId ? Number(item.operatorId) : null,
        operatorType: item.operatorType,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        note: item.note,
        nextFollowAt: item.nextFollowAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })) ?? [],
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    }
  }

  private toAssessmentTemplateVO(
    template: AssessmentTemplate & {
      module?: ProductModule
      questions: Array<AssessmentQuestion & { options: AssessmentOption[] }>
    }
  ) {
    return {
      id: Number(template.id),
      moduleId: Number(template.moduleId),
      module: template.module ? this.toModuleVO(template.module) : undefined,
      title: template.title,
      subtitle: template.subtitle,
      version: template.version,
      status: template.status,
      sortOrder: template.sortOrder,
      questions: template.questions.map((question) => ({
        id: Number(question.id),
        key: question.key,
        title: question.title,
        type: question.type,
        sortOrder: question.sortOrder,
        options: question.options.map((option) => ({
          id: Number(option.id),
          label: option.label,
          value: option.value,
          tags: option.tags,
          tagIds: option.tagIds.map(Number),
          tagWeights: option.tagWeights,
          sortOrder: option.sortOrder,
        })),
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }
  }

  private toRecommendationRuleVO(
    rule: AssessmentRecommendationRule & {
      module: ProductModule
      product: Product & { module: ProductModule }
    }
  ) {
    return {
      id: Number(rule.id),
      moduleId: Number(rule.moduleId),
      module: this.toModuleVO(rule.module),
      productId: Number(rule.productId),
      product: this.toAdminProductVO(rule.product),
      name: rule.name,
      conditionTags: rule.conditionTags,
      conditionTagIds: rule.conditionTagIds.map(Number),
      scoreBoost: rule.scoreBoost,
      reason: rule.reason,
      status: rule.status,
      sortOrder: rule.sortOrder,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    }
  }

  private toTagVO(tag: TagDictionary & { module?: ProductModule | null }) {
    return {
      id: Number(tag.id),
      code: tag.code,
      name: tag.name,
      group: tag.group,
      moduleId: tag.moduleId ? Number(tag.moduleId) : null,
      module: tag.module ? this.toModuleVO(tag.module) : null,
      description: tag.description,
      status: tag.status,
      sortOrder: tag.sortOrder,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    }
  }

  private toAssessmentVO(assessment: {
    id: bigint
    userId: bigint
    moduleCode: string
    assessmentType: string
    tags: string[]
    tagIds: bigint[]
    tagWeights: Prisma.JsonValue
    summary: string
    answers: Prisma.JsonValue
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: Number(assessment.id),
      userId: Number(assessment.userId),
      moduleCode: assessment.moduleCode,
      assessmentType: assessment.assessmentType,
      tags: assessment.tags,
      tagIds: assessment.tagIds.map(Number),
      tagWeights: assessment.tagWeights,
      summary: assessment.summary,
      answers: assessment.answers,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    }
  }
}
