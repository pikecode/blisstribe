import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomBytes } from 'crypto'
import { PrismaService } from '../../common/prisma.service'
import { CreateServiceOrderDto } from '../dto/order.dto'
import { ExtendServicePlanDto } from '../dto/extension.dto'
import { waitingDays } from './wait-days'
import { recordServiceNotice } from '../notice'
import { servicePlanStatus } from '../plan-status'
import { reservePackageStock, movePackageStock, closePackageOrder } from '../goods/inventory'

const orderInclude = {
  offering: { select: { id: true, name: true } },
  institution: { select: { id: true, name: true, address: true } },
  items: { orderBy: { id: 'asc' as const } },
  plan: { include: { disputes: { select: { status: true } }, entitlements: { include: { orderItem: true, goodsReturns: { include: { refund: { select: { status: true } } } } }, orderBy: { id: 'asc' as const } } } },
}

@Injectable()
export class ServiceOrderService {
  constructor(private readonly prisma: PrismaService) {}

  async extendPlan(orderId: bigint, adminId: bigint, dto: ExtendServicePlanDto) {
    const startAt = new Date(dto.startAt)
    const endAt = new Date(dto.endAt)
    if (endAt <= startAt || endAt > new Date() || !dto.reason.trim()) throw new BadRequestException('请填写已发生的有效等待区间及机构原因')
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServicePlan" WHERE "orderId" = ${orderId} FOR UPDATE`
      const plan = await tx.servicePlan.findUnique({ where: { orderId }, include: { entitlements: true } })
      if (!plan || !['active', 'expired'].includes(plan.status)) throw new BadRequestException('当前服务计划不能延期')
      const right = plan.entitlements.find((item) => item.id === BigInt(dto.entitlementId))
      const orderItem = right ? await tx.serviceOrderItem.findUnique({ where: { id: right.orderItemId } }) : null
      if (!right || orderItem?.kind !== 'service' || right.totalQuantity <= right.usedQuantity + right.refundedQuantity) throw new BadRequestException('请选择未全部使用或退款的服务项目')
      if (startAt < plan.startsAt) throw new BadRequestException('等待不能早于服务生效时间')
      const history = await tx.auditLog.findMany({ where: { action: 'service_plan.institution_wait', targetType: 'service_plan', targetId: plan.id } })
      const intervals = history.map((item) => item.metadata as unknown as { startAt: string; endAt: string })
      const addedDays = waitingDays([...intervals, dto]) - waitingDays(intervals)
      const expiresAt = new Date(plan.expiresAt.getTime() + addedDays * 86400000)
      await tx.servicePlan.update({ where: { id: plan.id }, data: { expiresAt, status: expiresAt > new Date() ? 'active' : 'expired' } })
      await recordServiceNotice(tx, { eventKey: `plan:${plan.id}:extension:${history.length}`, userId: plan.userId, title: '服务有效期已调整', detail: `机构等待新增顺延 ${addedDays} 天，有效期至 ${expiresAt.toISOString().slice(0,10)}。`, path: `/pages/services/detail?id=${plan.id}` })
      await tx.auditLog.create({ data: { actorType: 'admin', actorId: adminId, action: 'service_plan.institution_wait', targetType: 'service_plan', targetId: plan.id, reason: dto.reason.trim(), metadata: { startAt: startAt.toISOString(), endAt: endAt.toISOString(), entitlementId: dto.entitlementId, addedDays, expiresAt: expiresAt.toISOString() } } })
    })
    return this.detailAdmin(orderId)
  }

  async notices(userId: bigint) {
    const rows = await this.prisma.serviceNotice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 })
    return rows.map((row) => ({ ...row, id: Number(row.id), userId: Number(row.userId) }))
  }
  async readNotice(id: bigint, userId: bigint) {
    await this.prisma.serviceNotice.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } })
    return { success: true }
  }
  async eligibility(offeringId: bigint, userId: bigint) {
    const offering = await this.prisma.serviceOffering.findFirst({ where: { id: offeringId, status: 1, deletedAt: null, institution: { status: 1, deletedAt: null }, product: { status: 1, deletedAt: null } }, include: { items: { where: { retiredAt: null } } } })
    if (!offering) return { canBuy: false, reason: '服务方案已下架', earliestStartAt: null }
    const quantities = new Map<bigint, number>()
    for (const item of offering.items.filter(item => item.kind === 'goods')) {
      if (!item.skuId) return { canBuy: false, reason: '套餐商品配置异常，请联系客服', earliestStartAt: null }
      quantities.set(item.skuId, (quantities.get(item.skuId) || 0) + item.quantity)
    }
    for (const [skuId, quantity] of quantities) {
      const sku = await this.prisma.shopProductSku.findUnique({ where: { id: skuId }, include: { product: true } })
      if (!sku || !sku.enabled || sku.product.status !== 1 || sku.product.deletedAt || sku.totalStock - sku.reservedStock - sku.soldStock < quantity) return { canBuy: false, reason: '套餐实物已下架或库存不足，请选择其他方案', earliestStartAt: null }
    }
    const slots = await this.prisma.serviceAppointmentSlot.findMany({ where: { institutionId: offering.institutionId, enabled: true, startAt: { gt: new Date(Date.now() + 3600000) } }, orderBy: { startAt: 'asc' }, include: { _count: { select: { appointments: { where: { status: { in: ['pending', 'confirmed', 'arrived'] } } } } } } })
    const slot = slots.find((item) => item._count.appointments < item.capacity)
    if (!slot) return { canBuy: false, reason: '机构暂未开放可约时段，请先咨询', earliestStartAt: null }
    if (offering.requiresQualification) {
      const qualification = await this.prisma.serviceQualification.findFirst({ where: { offeringId, status: 'active', lead: { userId }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } })
      if (!qualification) return { canBuy: false, reason: '请先完成机构评估并确认购买资格', earliestStartAt: slot.startAt }
    }
    return { canBuy: true, reason: '', earliestStartAt: slot.startAt }
  }

  async create(userId: bigint, dto: CreateServiceOrderDto) {
    const clientRequestId = dto.clientRequestId.trim()
    if (!clientRequestId) throw new BadRequestException('请求标识不能为空')
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { userId_clientRequestId: { userId, clientRequestId } },
      include: orderInclude,
    })
    if (existing) return this.toOrderVO(existing)

    const eligibility = await this.eligibility(BigInt(dto.offeringId), userId)
    if (!eligibility.canBuy) throw new BadRequestException(eligibility.reason)

    const offering = await this.prisma.serviceOffering.findFirst({
      where: {
        id: BigInt(dto.offeringId),
        status: 1,
        deletedAt: null,
        product: { status: 1, deletedAt: null },
        institution: { status: 1, deletedAt: null },
      },
      include: { institution: true, product: true, items: { where: { retiredAt: null }, orderBy: { sortOrder: 'asc' } } },
    })
    if (!offering) throw new NotFoundException('服务方案不存在或已下架')
    if (!offering.items.length) throw new BadRequestException('服务方案未配置服务项目')

    const allocatedTotal = offering.items.reduce((sum, item) => sum + item.allocatedAmountFen, 0)
    if (allocatedTotal !== offering.priceFen) throw new BadRequestException('服务方案价格配置异常，请联系客服')

    const lead = dto.leadId
      ? await this.prisma.productLead.findFirst({ where: { id: BigInt(dto.leadId), userId, productId: offering.productId } })
      : await this.prisma.productLead.findFirst({ where: { userId, productId: offering.productId }, orderBy: { createdAt: 'desc' } })
    if (dto.leadId && !lead) throw new ForbiddenException('咨询记录与当前用户或服务产品不匹配')

    const qualification = offering.requiresQualification
      ? await this.prisma.serviceQualification.findFirst({
          where: {
            offeringId: offering.id,
            status: 'active',
            lead: { userId },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { lead: true },
          orderBy: { confirmedAt: 'desc' },
        })
      : null
    if (offering.requiresQualification && !qualification) {
      throw new ForbiddenException('该方案需要机构确认购买资格')
    }

    const now = new Date()
    const paymentExpiresAt = new Date(now.getTime() + 30 * 60 * 1000)
    const free = offering.priceFen === 0
    const sourceLead = qualification?.lead ?? lead

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ServiceOffering" WHERE id = ${offering.id} FOR UPDATE`
        const currentOffering = await tx.serviceOffering.findUniqueOrThrow({ where: { id: offering.id } })
        if (currentOffering.status !== 1 || currentOffering.version !== offering.version || currentOffering.deletedAt) {
          throw new BadRequestException('方案已调整或下架，请刷新后重新购买')
        }
        // 同一患者的免费领取串行处理，避免不同请求编号重复发放权益。
        if (free) {
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
          const claimed = await tx.serviceOrder.findFirst({
            where: { userId, offeringId: offering.id, paymentAmountFen: 0, plan: { isNot: null } },
            include: orderInclude,
          })
          if (claimed) return claimed
        }
        await reservePackageStock(tx, offering.items)
        const order = await tx.serviceOrder.create({
          data: {
            orderNo: this.generateOrderNo(),
            clientRequestId,
            userId,
            offeringId: offering.id,
            institutionId: offering.institutionId,
            leadId: sourceLead?.id,
            qualificationId: qualification?.id,
            sourcePartnerId: sourceLead?.partnerId,
            status: free ? 'paid' : 'pending_payment',
            paymentStatus: free ? 'paid' : 'unpaid',
            totalAmountFen: offering.priceFen,
            paymentAmountFen: offering.priceFen,
            offeringSnapshot: {
              id: Number(offering.id),
              productId: Number(offering.productId),
              name: offering.name,
              subtitle: offering.subtitle,
              version: offering.version,
              validityDays: offering.validityDays,
              requiresQualification: offering.requiresQualification,
              appointmentNotice: offering.appointmentNotice,
              refundNotice: offering.refundNotice,
            },
            institutionSnapshot: {
              id: Number(offering.institution.id),
              name: offering.institution.name,
              address: offering.institution.address,
            },
            pricingSnapshot: {
              totalAmountFen: offering.priceFen,
              defaultPromoterRateBps: offering.defaultPromoterRateBps,
            },
            expiresAt: paymentExpiresAt,
            paidAt: free ? now : null,
            items: {
              create: offering.items.map((item) => ({
                offeringItemId: item.id,
                kind: item.kind, skuId: item.skuId, deliveryMethod: item.deliveryMethod, returnNotice: item.returnNotice, goodsSnapshot: item.goodsSnapshot as Prisma.InputJsonValue,
                itemName: item.name,
                itemDescription: item.description,
                quantity: item.quantity,
                allocatedAmountFen: item.allocatedAmountFen,
                institutionSettlementFen: item.institutionSettlementFen,
              })),
            },
          },
          include: { items: true },
        })

        if (free) {
          await movePackageStock(tx, order.items, 'paid')
          await recordServiceNotice(tx, { eventKey: `order:${order.id}:claimed`, userId, title: '服务已领取', detail: '服务权益已生效，可进入我的服务预约。', path: '/pages/services/index' })
          const plan = await tx.servicePlan.create({
            data: {
              orderId: order.id,
              userId,
              institutionId: offering.institutionId,
              startsAt: now,
              expiresAt: new Date(now.getTime() + offering.validityDays * 24 * 60 * 60 * 1000),
            },
          })
          await tx.serviceEntitlement.createMany({
            data: order.items.map((item) => ({
              planId: plan.id,
              orderItemId: item.id,
              totalQuantity: item.quantity,
            })),
          })
          if (sourceLead && !['converted', 'invalid'].includes(sourceLead.status)) {
            await tx.productLead.update({ where: { id: sourceLead.id }, data: { status: 'converted' } })
            await tx.productLeadFollowUp.create({
              data: {
                leadId: sourceLead.id,
                operatorType: 'system',
                fromStatus: sourceLead.status,
                toStatus: 'converted',
                note: '免费服务方案已确认并发放权益',
              },
            })
          }
        }
        return tx.serviceOrder.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude })
      })
      return this.toOrderVO(created)
    } catch (error) {
      const uniqueTarget = error instanceof Prisma.PrismaClientKnownRequestError
        ? String(error.meta?.target || '')
        : ''
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && uniqueTarget.includes('clientRequestId')) {
        const duplicated = await this.prisma.serviceOrder.findUniqueOrThrow({
          where: { userId_clientRequestId: { userId, clientRequestId } },
          include: orderInclude,
        })
        return this.toOrderVO(duplicated)
      }
      throw error
    }
  }

  async listMine(userId: bigint, params: { status?: string; page: number; pageSize: number }) {
    await this.closeExpired(userId)
    const page = Math.max(1, Math.min(1000000, Math.floor(Number.isFinite(params.page) ? params.page : 1)))
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number.isFinite(params.pageSize) ? params.pageSize : 20)))
    const where: Prisma.ServiceOrderWhereInput = { userId, status: params.status || undefined }
    const [rows, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.serviceOrder.count({ where }),
    ])
    return { list: rows.map((row) => this.toOrderVO(row)), total, page, pageSize }
  }

  async detailMine(id: bigint, userId: bigint) {
    await this.closeExpired(userId)
    const row = await this.prisma.serviceOrder.findFirst({ where: { id, userId }, include: orderInclude })
    if (!row) throw new NotFoundException('服务订单不存在')
    return this.toOrderVO(row)
  }

  async listAdmin(params: { keyword?: string; status?: string; institutionId?: bigint; page: number; pageSize: number }) {
    const page = Math.max(1, Math.min(1000000, Math.floor(Number.isFinite(params.page) ? params.page : 1)))
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number.isFinite(params.pageSize) ? params.pageSize : 20)))
    const keyword = params.keyword?.trim()
    const planStatuses = ['active', 'aftercare', 'completed', 'expired']
    const filterPlan = planStatuses.includes(params.status || '')
    const planOrderIds = filterPlan ? await this.prisma.$queryRaw<Array<{ orderId: bigint }>>`
      SELECT p."orderId" FROM "ServicePlan" p JOIN "ServiceEntitlement" e ON e."planId" = p.id JOIN "ServiceOrderItem" oi ON oi.id = e."orderItemId"
      GROUP BY p.id
      HAVING (CASE
        WHEN (SUM(e."refundFrozen") > 0 OR EXISTS (SELECT 1 FROM "ServiceDispute" sd WHERE sd."planId" = p.id AND sd.status <> 'resolved') OR EXISTS (SELECT 1 FROM "ServiceGoodsReturn" gr JOIN "ServiceEntitlement" er ON er.id = gr."entitlementId" LEFT JOIN "ServiceRefund" rf ON rf.id = gr."refundId" WHERE er."planId" = p.id AND gr.status IN ('requested','approved','shipped','disputed','refund_pending') AND COALESCE(rf.status, '') <> 'success')) AND (NOT BOOL_OR(e."totalQuantity" > e."usedQuantity" + e."reservedQuantity" + e."refundFrozen" + e."refundedQuantity" + e."expiredQuantity" AND (oi.kind = 'goods' OR p."expiresAt" > NOW()))) AND SUM(e."reservedQuantity") = 0 THEN 'aftercare'
        WHEN SUM(e."reservedQuantity") > 0 OR (BOOL_OR(e."totalQuantity" > e."usedQuantity" + e."reservedQuantity" + e."refundFrozen" + e."refundedQuantity" + e."expiredQuantity" AND (oi.kind = 'goods' OR p."expiresAt" > NOW()))) THEN 'active'
        WHEN SUM(e."totalQuantity") = SUM(e."refundedQuantity") THEN 'refunded'
        WHEN SUM(e."totalQuantity" - e."usedQuantity" - e."reservedQuantity" - e."refundFrozen" - e."refundedQuantity" - e."expiredQuantity") > 0 OR SUM(e."expiredQuantity") > 0 THEN 'expired'
        WHEN (SUM(e."refundFrozen") > 0 OR EXISTS (SELECT 1 FROM "ServiceDispute" sd WHERE sd."planId" = p.id AND sd.status <> 'resolved') OR EXISTS (SELECT 1 FROM "ServiceGoodsReturn" gr JOIN "ServiceEntitlement" er ON er.id = gr."entitlementId" LEFT JOIN "ServiceRefund" rf ON rf.id = gr."refundId" WHERE er."planId" = p.id AND gr.status IN ('requested','approved','shipped','disputed','refund_pending') AND COALESCE(rf.status, '') <> 'success')) THEN 'aftercare' ELSE 'completed' END) = ${params.status}
    ` : []
    const where: Prisma.ServiceOrderWhereInput = {
      status: filterPlan ? undefined : params.status || undefined,
      ...(filterPlan ? { id: { in: planOrderIds.map((item) => item.orderId) } } : {}),
      institutionId: params.institutionId,
      ...(keyword ? { OR: [
        { orderNo: { contains: keyword, mode: 'insensitive' } },
        { user: { nickname: { contains: keyword, mode: 'insensitive' } } },
        { user: { phoneMasked: { contains: keyword } } },
      ] } : {}),
    }
    const include = this.adminOrderInclude()
    const [rows, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.serviceOrder.count({ where }),
    ])
    return { list: rows.map((row) => this.toAdminOrderVO(row)), total, page, pageSize }
  }

  async detailAdmin(id: bigint) {
    const row = await this.prisma.serviceOrder.findUnique({ where: { id }, include: this.adminOrderInclude() })
    if (!row) throw new NotFoundException('服务订单不存在')
    return this.toAdminOrderVO(row)
  }

  async cancel(id: bigint, userId: bigint) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id, userId },
      include: { payments: { where: { status: 'pending' }, select: { id: true } } },
    })
    if (!order) throw new NotFoundException('服务订单不存在')
    if (order.payments.length) throw new BadRequestException('支付结果确认中，请先刷新支付状态')
    const result = await this.prisma.$transaction(tx => closePackageOrder(tx, id, '用户取消'))
    if (!result) throw new BadRequestException('订单不存在或当前状态不能取消')
    return this.detailMine(id, userId)
  }

  async listPlans(userId: bigint) {
    await this.expirePlans(userId)
    const rows = await this.prisma.servicePlan.findMany({
      where: { userId },
      include: {
        order: { include: { offering: { select: { id: true, name: true } } } },
        institution: { select: { id: true, name: true, address: true } },
        disputes: { select: { status: true } },
        entitlements: { include: { orderItem: true, goodsReturns: { include: { refund: { select: { status: true } } } } }, orderBy: { id: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map((row) => this.toPlanVO(row))
  }

  async detailPlan(id: bigint, userId: bigint) {
    await this.expirePlans(userId)
    const row = await this.prisma.servicePlan.findFirst({
      where: { id, userId },
      include: {
        order: { include: { offering: { select: { id: true, name: true } } } },
        institution: { select: { id: true, name: true, address: true } },
        disputes: { select: { status: true } },
        entitlements: { include: { orderItem: true, goodsReturns: { include: { refund: { select: { status: true } } } } }, orderBy: { id: 'asc' } },
      },
    })
    if (!row) throw new NotFoundException('服务计划不存在')
    const waits = await this.prisma.auditLog.findMany({ where: { action: 'service_plan.institution_wait', targetType: 'service_plan', targetId: row.id }, orderBy: { createdAt: 'desc' } })
    return { ...this.toPlanVO(row), extensions: waits.map((item) => ({ id: Number(item.id), reason: item.reason, createdAt: item.createdAt, ...(item.metadata as Record<string, unknown>) })) }
  }

  async releaseExpiredOrders() { await this.closeExpired() }

  private async closeExpired(userId?: bigint) {
    const rows = await this.prisma.serviceOrder.findMany({ where: { userId, status: 'pending_payment', paymentStatus: 'unpaid', expiresAt: { lte: new Date() }, payments: { none: { status: 'pending' } } }, select: { id: true }, orderBy: { expiresAt: 'asc' }, take: 100 })
    for (const row of rows) await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${row.id} FOR UPDATE`
      const pendingPayment = await tx.servicePayment.count({ where: { orderId: row.id, status: 'pending' } })
      if (!pendingPayment) await closePackageOrder(tx, row.id, '支付超时')
    })
  }

  private async expirePlans(userId: bigint) {
    await this.prisma.servicePlan.updateMany({
      where: { userId, status: 'active', expiresAt: { lte: new Date() } },
      data: { status: 'expired' },
    })
  }

  private generateOrderNo() {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
    return `SERVICE-${timestamp}-${randomBytes(3).toString('hex').toUpperCase()}`
  }

  private adminOrderInclude() {
    return {
      offering: { select: { id: true, name: true } },
      institution: { select: { id: true, name: true, address: true } },
      user: { select: { id: true, nickname: true, phoneMasked: true } },
      items: { orderBy: { id: 'asc' as const } },
      payments: { orderBy: { createdAt: 'desc' as const } },
      plan: { include: { disputes: { select: { status: true } }, entitlements: { include: { orderItem: true, goodsReturns: { include: { refund: { select: { status: true } } } } }, orderBy: { id: 'asc' as const } }, appointments: { orderBy: { requestedStartAt: 'desc' as const } } } },
      refunds: { include: { items: true }, orderBy: { createdAt: 'desc' as const } },
    }
  }

  private toAdminOrderVO(row: any) {
    return {
      ...this.toOrderVO(row, true),
      user: row.user ? { ...row.user, id: Number(row.user.id) } : undefined,
      payments: row.payments?.map((item: any) => ({ ...item, id: Number(item.id), orderId: Number(item.orderId) })) || [],
      refunds: row.refunds?.map((item: any) => ({ ...item, id: Number(item.id), orderId: Number(item.orderId), userId: Number(item.userId), items: item.items?.map((detail: any) => ({ ...detail, id: Number(detail.id), refundId: Number(detail.refundId), entitlementId: Number(detail.entitlementId), orderItemId: Number(detail.orderItemId) })) || [] })) || [],
      plan: row.plan ? {
        ...this.toPlanVO(row.plan, true),
        appointments: row.plan.appointments?.map((item: any) => ({ ...item, id: Number(item.id), planId: Number(item.planId), entitlementId: Number(item.entitlementId), userId: Number(item.userId), institutionId: Number(item.institutionId), refundId: item.refundId ? Number(item.refundId) : null })) || [],
      } : null,
    }
  }

  private toOrderVO(row: any, admin = false) {
    return {
      ...row,
      pricingSnapshot: admin ? row.pricingSnapshot : undefined,
      sourcePartnerId: admin && row.sourcePartnerId ? Number(row.sourcePartnerId) : null,
      id: Number(row.id), userId: Number(row.userId), offeringId: Number(row.offeringId), institutionId: Number(row.institutionId),
      leadId: row.leadId ? Number(row.leadId) : null, qualificationId: row.qualificationId ? Number(row.qualificationId) : null,

      offering: row.offering ? { ...row.offering, id: Number(row.offering.id) } : undefined,
      institution: row.institution ? { ...row.institution, id: Number(row.institution.id) } : undefined,
      items: row.items?.map((item: any) => ({ ...item, id: Number(item.id), orderId: Number(item.orderId), offeringItemId: Number(item.offeringItemId), skuId: item.skuId ? Number(item.skuId) : null, institutionSettlementFen: admin ? item.institutionSettlementFen : undefined })) || [],
      plan: row.plan ? this.toPlanVO(row.plan, admin) : null,
    }
  }

  private toPlanVO(row: any, admin = false) {
    const displayStatus = servicePlanStatus(row)
    return {
      ...row,
      status: displayStatus,
      disputes: undefined,
      hasAftercare: row.disputes?.some((entry: any) => entry.status !== 'resolved') || row.entitlements?.some((item: any) => item.refundFrozen > 0 || item.goodsReturns?.some((entry: any) => ['requested','approved','shipped','disputed','refund_pending'].includes(entry.status) && entry.refund?.status !== 'success')) || false,
      id: Number(row.id), orderId: Number(row.orderId), userId: Number(row.userId), institutionId: Number(row.institutionId),
      order: row.order ? { id: Number(row.order.id), orderNo: row.order.orderNo, status: row.order.status, paymentStatus: row.order.paymentStatus, offering: row.order.offering ? { id: Number(row.order.offering.id), name: row.order.offering.name } : undefined } : undefined,
      institution: row.institution ? { ...row.institution, id: Number(row.institution.id) } : undefined,
      entitlements: row.entitlements?.map((item: any) => ({
        ...item,
        goodsReturns: undefined,
        id: Number(item.id), planId: Number(item.planId), orderItemId: Number(item.orderItemId),
        availableQuantity: item.orderItem?.kind === 'goods' || row.expiresAt <= new Date() ? 0 : item.totalQuantity - item.reservedQuantity - item.usedQuantity - item.refundFrozen - item.refundedQuantity - item.expiredQuantity,
        refundableQuantity: item.totalQuantity - item.reservedQuantity - item.usedQuantity - item.refundFrozen - item.refundedQuantity - item.expiredQuantity,
        orderItem: item.orderItem ? { ...item.orderItem, id: Number(item.orderItem.id), orderId: Number(item.orderItem.orderId), offeringItemId: Number(item.orderItem.offeringItemId), skuId: item.orderItem.skuId ? Number(item.orderItem.skuId) : null, institutionSettlementFen: admin ? item.orderItem.institutionSettlementFen : undefined } : undefined,
      })) || [],
    }
  }
}
