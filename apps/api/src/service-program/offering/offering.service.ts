import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type ServiceOfferingItem } from '@prisma/client'
import { PrismaService } from '../../common/prisma.service'
import {
  CreateServiceInstitutionDto,
  CreateServiceOfferingDto,
  UpdateServiceInstitutionDto,
  UpdateServiceOfferingDto,
  ServiceOfferingItemDto,
} from '../dto/offering.dto'

import { validateReceptionHours } from '../appointment/work-hours'

const offeringInclude = {
  product: { select: { id: true, title: true, coverUrl: true, status: true, productType: true, deletedAt: true, module: { select: { status: true, deletedAt: true } } } },
  institution: { select: { id: true, name: true, address: true, status: true, deletedAt: true, receptionHours: true } },
  items: { where: { retiredAt: null }, orderBy: { sortOrder: 'asc' as const } },
}

@Injectable()
export class ServiceOfferingService {
  constructor(private readonly prisma: PrismaService) {}

  async listInstitutions() {
    const rows = await this.prisma.serviceInstitution.findMany({
      where: { deletedAt: null },
      include: { partner: { select: { id: true, partnerNo: true, displayName: true } } },
      orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
    })
    return rows.map((row) => ({ ...row, id: Number(row.id), partnerId: Number(row.partnerId), partner: { ...row.partner, id: Number(row.partner.id) } }))
  }

  async createInstitution(dto: CreateServiceInstitutionDto) {
    if (dto.receptionHours) { try { validateReceptionHours(dto.receptionHours) } catch { throw new BadRequestException('接待时间配置无效') } }
    const partnerId = BigInt(dto.partnerId)
    const partner = await this.prisma.partner.findFirst({ where: { id: partnerId, deletedAt: null } })
    if (!partner) throw new NotFoundException('合作主体不存在')

    const existing = await this.prisma.serviceInstitution.findUnique({ where: { partnerId } })
    if (existing) throw new ConflictException('该合作主体已关联履约机构')

    return this.prisma.serviceInstitution.create({
      data: {
        partnerId,
        name: dto.name.trim(),
        address: dto.address?.trim() || '',
        contactName: dto.contactName?.trim() || '',
        contactPhone: dto.contactPhone?.trim() || '',
        receptionHours: dto.receptionHours ? { ...dto.receptionHours } : undefined,
      },
    })
  }

  async updateInstitution(id: bigint, dto: UpdateServiceInstitutionDto) {
    if (dto.receptionHours) { try { validateReceptionHours(dto.receptionHours) } catch { throw new BadRequestException('接待时间配置无效') } }
    await this.requireInstitution(id, false)
    return this.prisma.serviceInstitution.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        address: dto.address?.trim(),
        contactName: dto.contactName?.trim(),
        contactPhone: dto.contactPhone?.trim(),
        status: dto.status,
        receptionHours: dto.receptionHours ? { ...dto.receptionHours } : undefined,
      },
    })
  }

  async listPublic(productId: bigint) {
    const rows = await this.prisma.serviceOffering.findMany({
      where: {
        productId,
        status: 1,
        deletedAt: null,
        product: { status: 1, deletedAt: null },
        institution: { status: 1, deletedAt: null },
      },
      include: offeringInclude,
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    })
    return rows.map((row) => this.toVO(row, false))
  }

  async detailPublic(id: bigint) {
    const row = await this.prisma.serviceOffering.findFirst({
      where: {
        id,
        status: 1,
        deletedAt: null,
        product: { status: 1, deletedAt: null },
        institution: { status: 1, deletedAt: null },
      },
      include: offeringInclude,
    })
    if (!row) throw new NotFoundException('服务方案不存在或已下架')
    const slots = await this.prisma.serviceAppointmentSlot.findMany({ where: { institutionId: row.institutionId, enabled: true, startAt: { gt: new Date(Date.now() + 3600000) } }, include: { _count: { select: { appointments: { where: { status: { in: ['pending', 'confirmed', 'arrived'] } } } } } }, orderBy: { startAt: 'asc' }, take: 100 })
    const available = slots.filter((item) => item.capacity > item._count.appointments)
    return { ...this.toVO(row, false), earliestStartAt: available[0]?.startAt || null, availableStartDates: available.slice(0, 5).map((item) => item.startAt) }
  }

  async listAdmin(params: { productId?: bigint; institutionId?: bigint; status?: number; page: number; pageSize: number }) {
    const page = Math.max(1, params.page)
    const pageSize = Math.min(100, Math.max(1, params.pageSize))
    const where: Prisma.ServiceOfferingWhereInput = {
      deletedAt: null,
      productId: params.productId,
      institutionId: params.institutionId,
      status: params.status,
    }
    const [rows, total] = await Promise.all([
      this.prisma.serviceOffering.findMany({
        where,
        include: offeringInclude,
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.serviceOffering.count({ where }),
    ])
    const readiness = await this.readinessForRows(rows)
    return { list: rows.map((row, index) => ({ ...this.toVO(row), readiness: readiness[index] })), total, page, pageSize }
  }

  async readiness(id: bigint) {
    return (await this.readinessForRows([await this.requireOffering(id)]))[0]
  }

  // 对列表批量查询时段和规格，避免每个套餐分别查库。
  private async readinessForRows(rows: Array<Prisma.ServiceOfferingGetPayload<{ include: typeof offeringInclude }>>) {
    if (!rows.length) return []
    const checkedAt = new Date()
    const institutionIds = [...new Set(rows.map(row => row.institutionId))]
    const skuIds = [...new Set(rows.flatMap(row => row.items.flatMap(item => item.kind === 'goods' && item.skuId ? [item.skuId] : [])))]
    const [slots, skus] = await Promise.all([
      this.prisma.serviceAppointmentSlot.findMany({ where: { institutionId: { in: institutionIds }, enabled: true, startAt: { gt: new Date(checkedAt.getTime() + 3600000) } }, select: { institutionId: true, capacity: true, _count: { select: { appointments: { where: { status: { in: ['pending', 'confirmed', 'arrived'] } } } } } } }),
      this.prisma.shopProductSku.findMany({ where: { id: { in: skuIds } }, include: { product: { select: { status: true, deletedAt: true } } } }),
    ])
    const availableInstitutions = new Set(slots.filter(slot => slot.capacity > slot._count.appointments).map(slot => slot.institutionId))
    const skuMap = new Map(skus.map(sku => [sku.id, sku]))
    return rows.map(row => {
      const checks: Array<{ key: string; label: string; passed: boolean; blocking: boolean; message: string; target: 'product' | 'institution' | 'offering' | 'slots' | 'goods' }> = []
      const add = (key: string, label: string, passed: boolean, blocking: boolean, message: string, target: typeof checks[number]['target']) => checks.push({ key, label, passed, blocking, message, target })
      add('product', '产品关联', !row.product.deletedAt && row.product.productType === 'service', true, '需关联有效的服务产品', 'product')
      add('visibility', '产品展示', row.product.status === 1 && row.product.module.status === 1 && !row.product.module.deletedAt, false, '请上架产品并启用所属模块', 'product')
      add('institution', '履约机构', row.institution.status === 1 && !row.institution.deletedAt, true, '请启用有效履约机构', 'institution')
      add('items', '服务项目', row.items.some(item => item.kind === 'service') && row.items.every(item => item.quantity > 0 && Number.isInteger(item.quantity)), true, '至少包含一个服务项目，数量须为正整数', 'offering')
      let amountError = ''
      try { this.validateAmounts(row.priceFen, row.items, row.defaultPromoterRateBps) } catch (error) { amountError = error instanceof Error ? error.message : '金额配置异常' }
      add('amount', '价格与分摊', !amountError, true, amountError || '售价、分摊及收益预算一致', 'offering')
      add('rules', '预约与退款规则', !!row.appointmentNotice.trim() && !!row.refundNotice.trim(), true, '请填写预约须知及退款规则', 'offering')
      add('slots', '预约时段', availableInstitutions.has(row.institutionId), false, '请开放至少一小时后仍有容量的时段', 'slots')
      const goods = row.items.filter(item => item.kind === 'goods')
      const quantities = new Map<bigint, number>()
      for (const item of goods) if (item.skuId) quantities.set(item.skuId, (quantities.get(item.skuId) || 0) + item.quantity)
      const goodsConfigured = goods.every(item => item.skuId && item.returnNotice.trim() && skuMap.get(item.skuId)?.enabled && skuMap.get(item.skuId)?.product.status === 1 && !skuMap.get(item.skuId)?.product.deletedAt)
      add('goods', '套餐实物配置', goodsConfigured, true, '请检查商品规格、上架状态及退货规则', 'goods')
      const inStock = goodsConfigured && [...quantities].every(([id, quantity]) => {
        const sku = skuMap.get(id)!
        return sku.totalStock - sku.reservedStock - sku.soldStock >= quantity
      })
      add('stock', '套餐实物库存', inStock, false, '同一规格所需数量合计超过可售库存，请补充库存', 'goods')
      const canPublish = checks.every(check => !check.blocking || check.passed)
      const availableNow = row.status === 1 && checks.every(check => check.passed)
      return { checkedAt, canPublish, availableNow, requiresQualification: row.requiresQualification, summary: !canPublish ? '配置待完善' : !checks.find(check => check.key === 'visibility')!.passed ? '展示待完善' : checks.some(check => !check.passed) ? '暂不可售' : row.status !== 1 ? '待上架' : '可售条件就绪', checks }
    })
  }

  async create(dto: CreateServiceOfferingDto) {
    await this.validateRelations(BigInt(dto.productId), BigInt(dto.institutionId))
    this.validateAmounts(dto.priceFen, dto.items, dto.defaultPromoterRateBps ?? 0)

    const row = await this.prisma.serviceOffering.create({
      data: {
        productId: BigInt(dto.productId),
        institutionId: BigInt(dto.institutionId),
        name: dto.name.trim(),
        subtitle: dto.subtitle?.trim() || '',
        priceFen: dto.priceFen,
        validityDays: dto.validityDays,
        requiresQualification: dto.requiresQualification ?? false,
        appointmentNotice: dto.appointmentNotice?.trim() || '',
        refundNotice: dto.refundNotice?.trim() || '',
        defaultPromoterRateBps: dto.defaultPromoterRateBps ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        items: { create: await this.itemData(dto.items) },
      },
      include: offeringInclude,
    })
    return this.toVO(row)
  }

  async update(id: bigint, dto: UpdateServiceOfferingDto) {
    const current = await this.requireOffering(id)
    if (current.status === 1) throw new BadRequestException('请先下架方案再修改')

    const productId = BigInt(dto.productId ?? Number(current.productId))
    const institutionId = BigInt(dto.institutionId ?? Number(current.institutionId))
    await this.validateRelations(productId, institutionId)

    const priceFen = dto.priceFen ?? current.priceFen
    const items = dto.items ?? current.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      allocatedAmountFen: item.allocatedAmountFen,
      institutionSettlementFen: item.institutionSettlementFen,
    }))
    this.validateAmounts(priceFen, items, dto.defaultPromoterRateBps ?? current.defaultPromoterRateBps)

    const nextItems = dto.items ? await this.itemData(dto.items) : undefined
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceOffering" WHERE id = ${id} FOR UPDATE`
      const locked = await tx.serviceOffering.findUniqueOrThrow({ where: { id } })
      if (locked.status === 1 || locked.version !== current.version) {
        throw new ConflictException('方案状态或内容已变化，请刷新后重新编辑')
      }
      if (dto.items) {
        await tx.serviceOfferingItem.updateMany({ where: { offeringId: id, retiredAt: null }, data: { retiredAt: new Date() } })
      }
      return tx.serviceOffering.update({
        where: { id },
        data: {
          productId,
          institutionId,
          name: dto.name?.trim(),
          subtitle: dto.subtitle?.trim(),
          priceFen: dto.priceFen,
          validityDays: dto.validityDays,
          requiresQualification: dto.requiresQualification,
          appointmentNotice: dto.appointmentNotice?.trim(),
          refundNotice: dto.refundNotice?.trim(),
          defaultPromoterRateBps: dto.defaultPromoterRateBps,
          sortOrder: dto.sortOrder,
          version: { increment: 1 },
          items: nextItems ? { create: nextItems } : undefined,
        },
        include: offeringInclude,
      })
    })
    return this.toVO(row)
  }

  async publish(id: bigint) {
    const current = await this.requireOffering(id)
    const readiness = (await this.readinessForRows([current]))[0]
    if (!readiness.canPublish) throw new BadRequestException(readiness.checks.filter(check => check.blocking && !check.passed).map(check => check.message).join('；'))
    await this.validateRelations(current.productId, current.institutionId)
    this.validateAmounts(current.priceFen, current.items, current.defaultPromoterRateBps)
    if (!current.appointmentNotice.trim() || !current.refundNotice.trim()) {
      throw new BadRequestException('请先完善预约须知和退款规则')
    }
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceOffering" WHERE id = ${id} FOR UPDATE`
      const locked = await tx.serviceOffering.findUniqueOrThrow({ where: { id } })
      if (locked.version !== current.version) throw new ConflictException('方案内容已变化，请刷新后重新上架')
      return tx.serviceOffering.update({ where: { id }, data: { status: 1, publishedAt: new Date() }, include: offeringInclude })
    })
    return this.toVO(row)
  }

  async unpublish(id: bigint) {
    await this.requireOffering(id)
    const row = await this.prisma.serviceOffering.update({
      where: { id },
      data: { status: 2 },
      include: offeringInclude,
    })
    return this.toVO(row)
  }

  private async validateRelations(productId: bigint, institutionId: bigint) {
    const [product, institution] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: productId, productType: 'service', deletedAt: null } }),
      this.requireInstitution(institutionId, true),
    ])
    if (!product) throw new BadRequestException('只能为有效的服务产品创建可售方案')
    return institution
  }

  private async requireInstitution(id: bigint, requireActive: boolean) {
    const row = await this.prisma.serviceInstitution.findFirst({
      where: { id, deletedAt: null, status: requireActive ? 1 : undefined },
    })
    if (!row) throw new NotFoundException(requireActive ? '履约机构不存在或已停用' : '履约机构不存在')
    return row
  }

  private async requireOffering(id: bigint) {
    const row = await this.prisma.serviceOffering.findFirst({
      where: { id, deletedAt: null },
      include: offeringInclude,
    })
    if (!row) throw new NotFoundException('服务方案不存在')
    return row
  }

  private validateAmounts(priceFen: number, items: Array<{ name: string; quantity: number; allocatedAmountFen: number; institutionSettlementFen: number }>, promoterRateBps: number) {
    if (!items.length || items.length > 50 || items.some(item => !item.name.trim())) {
      throw new BadRequestException('请维护 1 至 50 个完整的服务项目')
    }
    const allocatedTotal = items.reduce((sum, item) => sum + item.allocatedAmountFen, 0)
    if (allocatedTotal !== priceFen) throw new BadRequestException('项目分摊金额合计必须等于方案售价')
    const settlementTotal = items.reduce((sum, item) => sum + item.institutionSettlementFen * item.quantity, 0)
    const promoterTotal = Math.ceil(priceFen * promoterRateBps / 10000)
    // 零元项目可由其他项目覆盖成本；免费体验由活动预算承担，不能按零售价限制结算。
    if (priceFen > 0 && settlementTotal + promoterTotal > priceFen) {
      throw new BadRequestException('套餐售价不足以覆盖全部次数的机构结算和主理人收益')
    }
  }

  private async itemData(items: ServiceOfferingItemDto[]) {
    if (!items.some(item => (item.kind ?? 'service') === 'service')) throw new BadRequestException('服务套餐至少包含一个服务项目')
    return Promise.all(items.map(async (item, index) => {
      const kind = item.kind ?? 'service'
      let goodsSnapshot: Prisma.InputJsonValue = {}
      if (kind === 'goods') {
        if (!item.skuId || !item.returnNotice?.trim()) throw new BadRequestException('实物项目需选择商城规格并填写退货条件、期限和运费规则')
        const sku = await this.prisma.shopProductSku.findFirst({ where: { id: BigInt(item.skuId), enabled: true, product: { status: 1, deletedAt: null } }, include: { product: true } })
        if (!sku) throw new BadRequestException('套餐商品规格不存在或已下架')
        goodsSnapshot = { productId: Number(sku.productId), productName: sku.product.name, image: sku.product.images[0] || '', specifications: sku.specifications, skuCode: sku.skuCode }
      }
      return { name: item.name.trim(), description: item.description?.trim() || '', quantity: item.quantity, allocatedAmountFen: item.allocatedAmountFen, institutionSettlementFen: item.institutionSettlementFen, sortOrder: index, kind, skuId: kind === 'goods' ? BigInt(item.skuId!) : null, deliveryMethod: kind === 'goods' ? item.deliveryMethod ?? 'pickup' : 'pickup', returnNotice: kind === 'goods' ? item.returnNotice!.trim() : '', goodsSnapshot }
    }))
  }

  private toVO<T extends { id: bigint; productId: bigint; institutionId: bigint; items: ServiceOfferingItem[]; defaultPromoterRateBps: number }>(row: T, admin = true) {
    return {
      ...row,
      defaultPromoterRateBps: admin ? row.defaultPromoterRateBps : undefined,
      id: Number(row.id),
      productId: Number(row.productId),
      institutionId: Number(row.institutionId),
      items: row.items.map((item) => ({ ...item, id: Number(item.id), skuId: item.skuId ? Number(item.skuId) : null, offeringId: Number(item.offeringId), institutionSettlementFen: admin ? item.institutionSettlementFen : undefined })),
    }
  }
}
