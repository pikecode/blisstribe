import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../common/prisma.service'
import { WechatPayService } from '../../payment-channel/wechat-pay.service'
import { CreateServiceRefundDto } from '../dto/refund.dto'

const refundInclude = {
  disputes: { select: { id: true, proposedByAdminId: true, reviewedByAdminId: true, appointment: { select: { completedByAdminId: true } } } },
  items: { include: { entitlement: { include: { orderItem: true } } } },
  events: { orderBy: { createdAt: 'asc' as const } },
  user: { select: { id: true, nickname: true, phoneMasked: true } },
  order: {
    include: {
      offering: { select: { id: true, name: true } },
      institution: { select: { id: true, name: true } },
      plan: true,
      payments: { where: { status: 'success' }, orderBy: { paidAt: 'desc' as const }, take: 1 },
    },
  },
}

import { recordServiceNotice } from '../notice'
import { movePackageStock } from '../goods/inventory'

@Injectable()
export class ServiceRefundService {
  constructor(private readonly prisma: PrismaService, private readonly wechatPay: WechatPayService) {}

  async create(orderId: bigint, userId: bigint, dto: CreateServiceRefundDto) {
    if (!dto.reason.trim()) throw new BadRequestException('请填写退款原因')
    const ids = dto.items.map((item) => item.entitlementId)
    if (new Set(ids).size !== ids.length) throw new BadRequestException('退款项目不能重复')

    const refundId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${orderId} FOR UPDATE`
      const order = await tx.serviceOrder.findFirst({
        where: { id: orderId, userId, paymentStatus: { in: ['paid', 'partially_refunded', 'refunded'] } },
        include: {
          plan: { include: { entitlements: { include: { orderItem: true } } } },
          refunds: { where: { status: { in: ['pending', 'processing'] } }, select: { id: true } },
        },
      })
      if (!order?.plan) throw new NotFoundException('可退款的服务订单不存在')
      if (order.refunds.length) throw new BadRequestException('订单已有进行中的退款申请')

      const itemData: Array<{ entitlementId: bigint; orderItemId: bigint; quantity: number; amountFen: number }> = []
      const affectedAppointmentIds: bigint[] = []
      for (const requested of dto.items) {
        const entitlement = order.plan.entitlements.find((item) => item.id === BigInt(requested.entitlementId))
        if (!entitlement) throw new BadRequestException('退款项目不属于当前服务订单')
        await tx.$queryRaw`SELECT id FROM "ServiceEntitlement" WHERE id = ${entitlement.id} FOR UPDATE`

        const appointmentIds = [...new Set(requested.appointmentIds || [])].map(BigInt)
        const appointments = appointmentIds.length
          ? await tx.serviceAppointment.findMany({
              where: { id: { in: appointmentIds }, userId, planId: order.plan.id, entitlementId: entitlement.id, status: { in: ['pending', 'confirmed'] } },
            })
          : []
        if (appointments.length !== appointmentIds.length) throw new BadRequestException('关联预约已变化，请刷新后重试')
        if (appointments.length > requested.quantity) throw new BadRequestException('取消的预约数量不能超过退款数量')

        const available = entitlement.totalQuantity - entitlement.reservedQuantity - entitlement.usedQuantity
          - entitlement.refundFrozen - entitlement.refundedQuantity - entitlement.expiredQuantity
        if (requested.quantity > available + appointments.length) throw new BadRequestException('退款数量超过未使用权益')

        if (appointmentIds.length) {
          const cancelled = await tx.serviceAppointment.updateMany({
            where: { id: { in: appointmentIds }, status: { in: ['pending', 'confirmed'] } },
            data: { status: 'refund_pending', cancelReason: '关联服务退款申请' },
          })
          if (cancelled.count !== appointmentIds.length) throw new BadRequestException('关联预约状态已变化')
          affectedAppointmentIds.push(...appointmentIds)
        }
        const frozen = await tx.serviceEntitlement.updateMany({
          where: {
            id: entitlement.id,
            reservedQuantity: entitlement.reservedQuantity,
            refundFrozen: entitlement.refundFrozen,
            usedQuantity: entitlement.usedQuantity,
            refundedQuantity: entitlement.refundedQuantity,
            expiredQuantity: entitlement.expiredQuantity,
          },
          data: {
            reservedQuantity: { decrement: appointments.length },
            refundFrozen: { increment: requested.quantity },
          },
        })
        if (!frozen.count) throw new BadRequestException('权益数量已变化，请刷新后重试')

        const amountFen = Math.floor(entitlement.orderItem.allocatedAmountFen * (entitlement.refundedQuantity + requested.quantity) / entitlement.totalQuantity)
          - Math.floor(entitlement.orderItem.allocatedAmountFen * entitlement.refundedQuantity / entitlement.totalQuantity)
        if (amountFen < 0 || (amountFen === 0 && entitlement.orderItem.kind !== 'goods')) throw new BadRequestException('退款金额计算异常')
        itemData.push({ entitlementId: entitlement.id, orderItemId: entitlement.orderItemId, quantity: requested.quantity, amountFen })
      }

      const requestedAmountFen = itemData.reduce((sum, item) => sum + item.amountFen, 0)
      if (requestedAmountFen > order.paymentAmountFen - order.refundedAmountFen) throw new BadRequestException('退款金额超过订单剩余实付金额')
      const token = `${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`
      const refund = await tx.serviceRefund.create({
        data: {
          orderId, userId, refundNo: `SR-${token}`, outRefundNo: `SROUT-${token}`,
          requestedAmountFen, reason: dto.reason.trim(), items: { create: itemData },
          events: { create: { eventType: 'request_submitted', actorType: 'user', actorId: userId, toStatus: 'pending', detail: '患者提交服务退款申请，相关权益已冻结' } },
        },
      })
      if (affectedAppointmentIds.length) {
        await tx.serviceAppointment.updateMany({ where: { id: { in: affectedAppointmentIds }, status: 'refund_pending' }, data: { refundId: refund.id } })
      }
      await recordServiceNotice(tx, { eventKey: `refund:${refund.id}:submitted`, userId, title: '退款申请已提交', detail: '相关权益已冻结，等待平台审核。', path: `/pages/services/refund-detail?id=${refund.id}` })
      return refund.id
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return this.detailMine(refundId, userId)
  }

  async listMine(userId: bigint) {
    const rows = await this.prisma.serviceRefund.findMany({ where: { userId }, include: refundInclude, orderBy: { createdAt: 'desc' } })
    return rows.map((row) => this.toVO(row, false))
  }

  async detailMine(id: bigint, userId: bigint) {
    const row = await this.prisma.serviceRefund.findFirst({ where: { id, userId }, include: refundInclude })
    if (!row) throw new NotFoundException('退款申请不存在')
    return this.toVO(row, false)
  }

  async withdraw(id: bigint, userId: bigint) {
    return this.releaseFrozen(id, { userId, status: 'pending' }, 'withdrawn', 'user', userId, '患者撤回退款申请')
  }

  async listAdmin(status?: string) {
    const rows = await this.prisma.serviceRefund.findMany({ where: { status: status || undefined }, include: refundInclude, orderBy: { createdAt: 'desc' }, take: 200 })
    return rows.map((row) => this.toVO(row, true))
  }

  async detailAdmin(id: bigint) {
    const row = await this.prisma.serviceRefund.findUnique({ where: { id }, include: refundInclude })
    if (!row) throw new NotFoundException('退款申请不存在')
    return this.toVO(row, true)
  }

  async review(id: bigint, adminId: bigint, approved: boolean, note?: string) {
    const refund = await this.prisma.serviceRefund.findUnique({ where: { id }, include: refundInclude })
    if (!refund) throw new NotFoundException('退款申请不存在')
    if (refund.status !== 'pending') throw new BadRequestException('仅待审核退款可以审批')
    if (refund.disputes.some(row => row.appointment.completedByAdminId === adminId || row.proposedByAdminId === adminId || row.reviewedByAdminId === adminId)) throw new ForbiddenException('例外退费须由原登记人及方案提出人以外的管理账号审核')
    if (!approved) {
      if (!note?.trim()) throw new BadRequestException('拒绝退款必须填写原因')
      return this.releaseFrozen(id, { status: 'pending' }, 'rejected', 'admin', adminId, note.trim())
    }
    if (refund.requestedAmountFen > 0 && !this.wechatPay.isMockPaymentEnabled() && !refund.order.payments[0]?.wechatTransactionId) {
      throw new BadRequestException('原支付交易号不存在，无法退款')
    }
    const claimed = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceRefund.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'processing', approvedAmountFen: refund.requestedAmountFen, approvedByAdminId: adminId, approvedAt: new Date(), adminNote: note?.trim() || '', lastAttemptAt: new Date() },
      })
      if (changed.count) await tx.serviceRefundEvent.create({ data: { refundId: id, eventType: 'approved', actorType: 'admin', actorId: adminId, fromStatus: 'pending', toStatus: 'processing', detail: note?.trim() || '管理员批准退款' } })
      return changed.count
    })
    if (!claimed) throw new BadRequestException('退款状态已变化')

    try {
      if (refund.requestedAmountFen === 0) {
        await this.handleWechatNotify({ out_refund_no: refund.outRefundNo, refund_id: `LOCAL-ZERO-${refund.id}`, refund_status: 'SUCCESS', amount: { refund: 0, total: refund.order.paymentAmountFen } }, true)
      } else if (this.wechatPay.isMockPaymentEnabled()) {
        await this.handleWechatNotify({ out_refund_no: refund.outRefundNo, refund_id: `MOCK-${refund.outRefundNo}`, refund_status: 'SUCCESS', amount: { refund: refund.requestedAmountFen, total: refund.order.paymentAmountFen, currency: 'CNY' } })
      } else {
        const payment = refund.order.payments[0]
        if (!payment?.wechatTransactionId) throw new BadRequestException('原支付交易号不存在，无法退款')
        const result = await this.wechatPay.refund({
          transactionId: payment.wechatTransactionId, outRefundNo: refund.outRefundNo,
          amount: refund.requestedAmountFen, totalAmount: refund.order.paymentAmountFen,
          reason: refund.reason, business: 'service-program',
        })
        await this.prisma.serviceRefund.updateMany({ where: { id, status: 'processing' }, data: { wechatRefundId: result.refundId, lastProviderStatus: 'SUBMITTED', lastErrorCode: null } })
      }
    } catch {
      await this.prisma.$transaction(async (tx) => {
        await tx.serviceRefund.updateMany({ where: { id, status: 'processing' }, data: { lastProviderStatus: 'UNKNOWN', lastErrorCode: 'provider_result_unknown' } })
        await tx.serviceRefundEvent.create({ data: { refundId: id, eventType: 'provider_result_unknown', actorType: 'system', fromStatus: 'processing', toStatus: 'processing', providerStatus: 'UNKNOWN', detail: '微信退款提交结果未知，请查询渠道状态，禁止重复提交' } })
      })
    }
    return this.detailAdmin(id)
  }

  async queryProvider(id: bigint, adminId: bigint) {
    const refund = await this.prisma.serviceRefund.findUnique({ where: { id }, include: refundInclude })
    if (!refund) throw new NotFoundException('退款申请不存在')
    if (refund.status !== 'processing') throw new BadRequestException('仅可查询处理中的退款')
    if (refund.requestedAmountFen === 0) {
      await this.handleWechatNotify({ out_refund_no: refund.outRefundNo, refund_id: `LOCAL-ZERO-${refund.id}`, refund_status: 'SUCCESS', amount: { refund: 0, total: refund.order.paymentAmountFen } }, true)
      return this.detailAdmin(id)
    }
    try {
      const result = await this.wechatPay.queryRefund(refund.outRefundNo)
      if (result.refundStatus === 'SUCCESS' && (result.outRefundNo !== refund.outRefundNo
        || !result.refundId || result.amountFen !== refund.requestedAmountFen
        || result.totalAmountFen !== refund.order.paymentAmountFen)) {
        await this.recordProvider(id, adminId, 'ABNORMAL', '微信成功结果的退款单号或金额与本地记录不匹配')
        return this.detailAdmin(id)
      }
      await this.recordProvider(id, adminId, result.refundStatus || 'UNKNOWN', '管理员查询微信退款结果')
      if (result.refundStatus === 'SUCCESS') {
        await this.handleWechatNotify({ out_refund_no: refund.outRefundNo, refund_id: result.refundId, refund_status: 'SUCCESS', amount: { refund: result.amountFen, total: result.totalAmountFen, currency: 'CNY' } })
      }
    } catch {
      await this.recordProvider(id, adminId, 'UNKNOWN', '微信退款查单结果未知')
    }
    return this.detailAdmin(id)
  }

  async resolveClosed(id: bigint, adminId: bigint) {
    const refund = await this.prisma.serviceRefund.findUnique({ where: { id }, include: refundInclude })
    if (!refund || refund.status !== 'processing') throw new BadRequestException('仅处理中退款可核对关闭结果')
    const result = await this.wechatPay.queryRefund(refund.outRefundNo)
    if (result.refundStatus !== 'CLOSED' || result.outRefundNo !== refund.outRefundNo || result.amountFen !== refund.requestedAmountFen || result.totalAmountFen !== refund.order.paymentAmountFen) throw new BadRequestException('微信未确认匹配的退款关闭结果，保持冻结并继续查单')
    return this.releaseFrozen(id, { status: 'processing' }, 'rejected', 'admin', adminId, '微信确认退款已关闭且未退款；冻结权益已释放，可重新申请或联系平台处理')
  }

  async handleWechatNotify(data: any, localZero = false) {
    const outRefundNo = data?.out_refund_no
    const providerStatus = typeof data?.refund_status === 'string' ? data.refund_status : ''
    if (!outRefundNo || !providerStatus) throw new BadRequestException('退款通知数据格式错误')
    const refund = await this.prisma.serviceRefund.findUnique({ where: { outRefundNo }, include: refundInclude })
    if (!refund) throw new NotFoundException('退款申请不存在')
    if (localZero && refund.requestedAmountFen !== 0) throw new BadRequestException('仅零元商品允许本地完成，无资金退款')
    if (!localZero && refund.requestedAmountFen === 0) throw new BadRequestException('零元商品不通过微信退款通知完成')
    if (providerStatus !== 'SUCCESS') {
      await this.recordProvider(refund.id, null, providerStatus, '收到微信退款状态通知')
      return { message: 'refund processing' }
    }
    if (!data.refund_id || data.amount?.refund !== refund.requestedAmountFen || data.amount?.total !== refund.order.paymentAmountFen) {
      throw new BadRequestException('微信退款单号或金额与本地记录不匹配')
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${refund.orderId} FOR UPDATE`
      const changed = await tx.serviceRefund.updateMany({
        where: { id: refund.id, status: 'processing' },
        data: { status: 'success', wechatRefundId: localZero ? null : data.refund_id, completedAt: new Date(), lastProviderStatus: localZero ? 'LOCAL_NO_PAYMENT' : 'SUCCESS', lastErrorCode: null },
      })
      if (!changed.count) {
        const current = await tx.serviceRefund.findUnique({ where: { id: refund.id } })
        if (current?.status === 'success' && (localZero || current.wechatRefundId === data.refund_id)) return
        throw new BadRequestException('退款状态异常')
      }
      await movePackageStock(tx, refund.items.filter(item => !item.fromGoodsReturn || item.goodsReusable).map(item => ({ kind: item.entitlement.orderItem.kind, skuId: item.entitlement.orderItem.skuId, quantity: item.quantity })), 'refunded')
      for (const item of refund.items) {
        if (item.compensation) continue
        const moved = await tx.serviceEntitlement.updateMany({
          where: { id: item.entitlementId, refundFrozen: { gte: item.quantity } },
          data: { refundFrozen: { decrement: item.quantity }, refundedQuantity: { increment: item.quantity } },
        })
        if (!moved.count) throw new BadRequestException('退款权益冻结数量异常')
      }
      await tx.serviceAppointment.updateMany({ where: { refundId: refund.id, status: 'refund_pending' }, data: { status: 'cancelled', cancelledAt: new Date() } })
      const newRefunded = refund.order.refundedAmountFen + refund.requestedAmountFen
      const fullyRefunded = newRefunded === refund.order.paymentAmountFen
      await tx.serviceOrder.update({
        where: { id: refund.orderId },
        data: { refundedAmountFen: newRefunded, paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded', status: fullyRefunded ? 'refunded' : 'partially_refunded' },
      })
      const rights = await tx.serviceEntitlement.findMany({ where: { planId: refund.order.plan!.id } })
      const noRemaining = rights.every((item) => item.reservedQuantity === 0 && item.refundFrozen === 0
        && item.totalQuantity === item.usedQuantity + item.refundedQuantity + item.expiredQuantity)
      if (noRemaining) {
        const allRefunded = rights.every((item) => item.totalQuantity === item.refundedQuantity)
        await tx.servicePlan.update({ where: { id: refund.order.plan!.id }, data: { status: allRefunded ? 'refunded' : 'completed' } })
      }
      const disputes = await tx.serviceDispute.findMany({ where: { refundId: refund.id, status: 'executing', acceptedAt: { not: null } } })
      for (const dispute of disputes) {
        await tx.serviceDispute.update({ where: { id: dispute.id }, data: { status: 'resolved', resolvedAt: new Date(), settlementHeld: false } })
        await tx.serviceDisputeEvent.create({ data: { disputeId: dispute.id, actorType: 'wechat', actorId: 0n, eventType: 'refund_success', detail: '微信确认例外退费成功，患者已接受的方案执行完成，异议结案。' } })
        await recordServiceNotice(tx, { eventKey: `dispute:${dispute.id}:refund_success`, userId: refund.userId, title: '服务异议退费已完成', detail: '微信确认例外退费成功，可核对原支付账单。', path: `/pages/services/dispute-detail?id=${dispute.id}` })
      }
      await recordServiceNotice(tx, { eventKey: `refund:${refund.id}:success`, userId: refund.userId, title: localZero ? '零元商品已取消交付' : '微信确认退款成功', detail: localZero ? '零元项目权益已终结，无资金退回，不影响其他项目成交价格。' : '可在原微信支付账单中查看退款记录。', path: `/pages/services/refund-detail?id=${refund.id}` })
      await tx.serviceRefundEvent.create({ data: { refundId: refund.id, eventType: localZero ? 'zero_amount_completed' : 'provider_success', actorType: localZero ? 'system' : 'wechat', fromStatus: 'processing', toStatus: 'success', providerStatus: localZero ? 'LOCAL_NO_PAYMENT' : 'SUCCESS', detail: localZero ? '零元商品已终结，无微信资金退款' : '微信确认退款成功，权益退款数量已结转' } })
    })
    return { message: 'success' }
  }

  private async releaseFrozen(id: bigint, where: Record<string, unknown>, status: 'rejected' | 'withdrawn', actorType: string, actorId: bigint, detail: string) {
    await this.prisma.$transaction(async (tx) => {
      const refund = await tx.serviceRefund.findFirst({ where: { id, ...where }, include: { items: true } })
      if (!refund) throw new BadRequestException('退款申请不存在或状态已变化')
      const changed = await tx.serviceRefund.updateMany({ where: { id, status: String(where.status) }, data: { status, adminNote: status === 'rejected' ? detail : '' } })
      if (!changed.count) throw new BadRequestException('退款状态已变化')
      for (const item of refund.items) {
        if (item.compensation) continue
        const released = await tx.serviceEntitlement.updateMany({ where: { id: item.entitlementId, refundFrozen: { gte: item.quantity } }, data: { refundFrozen: { decrement: item.quantity }, usedQuantity: item.fromGoodsReturn ? { increment: item.quantity } : undefined } })
        if (!released.count) throw new BadRequestException('退款冻结数量异常')
      }
      await tx.serviceAppointment.updateMany({ where: { refundId: id, status: 'refund_pending' }, data: { status: 'cancelled', cancelledAt: new Date() } })
      await recordServiceNotice(tx, { eventKey: `refund:${id}:${status}`, userId: refund.userId, title: status === 'rejected' ? '退款申请未通过' : '退款申请已撤回', detail, path: `/pages/services/refund-detail?id=${id}` })
      await tx.serviceRefundEvent.create({ data: { refundId: id, eventType: status, actorType, actorId, fromStatus: String(where.status), toStatus: status, detail } })
    })
    return actorType === 'user' ? this.detailMine(id, actorId) : this.detailAdmin(id)
  }

  private async recordProvider(id: bigint, adminId: bigint | null, providerStatus: string, detail: string) {
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceRefund.updateMany({ where: { id, status: 'processing' }, data: { lastProviderStatus: providerStatus, lastErrorCode: providerStatus === 'UNKNOWN' || providerStatus === 'ABNORMAL' ? 'provider_query_unknown' : null } })
      if (changed.count) await tx.serviceRefundEvent.create({ data: { refundId: id, eventType: 'provider_query', actorType: adminId ? 'admin' : 'wechat', actorId: adminId, fromStatus: 'processing', toStatus: 'processing', providerStatus, detail } })
    })
  }

  private toVO(row: any, admin: boolean) {
    return {
      ...row,
      disputes: undefined,
      id: Number(row.id), orderId: Number(row.orderId), userId: Number(row.userId),
      approvedByAdminId: row.approvedByAdminId ? Number(row.approvedByAdminId) : null,
      user: row.user ? { ...row.user, id: Number(row.user.id) } : undefined,
      order: row.order ? { ...row.order, pricingSnapshot: admin ? row.order.pricingSnapshot : undefined, sourcePartnerId: admin ? row.order.sourcePartnerId : undefined, id: Number(row.order.id), offeringId: Number(row.order.offeringId), institutionId: Number(row.order.institutionId), offering: { ...row.order.offering, id: Number(row.order.offering.id) }, institution: { ...row.order.institution, id: Number(row.order.institution.id) }, plan: row.order.plan ? { ...row.order.plan, id: Number(row.order.plan.id) } : null, payments: undefined } : undefined,
      items: row.items?.map((item: any) => ({ ...item, id: Number(item.id), refundId: Number(item.refundId), entitlementId: Number(item.entitlementId), orderItemId: Number(item.orderItemId), entitlement: { ...item.entitlement, id: Number(item.entitlement.id), orderItem: { ...item.entitlement.orderItem, institutionSettlementFen: admin ? item.entitlement.orderItem.institutionSettlementFen : undefined, id: Number(item.entitlement.orderItem.id) } } })) || [],
      events: row.events?.map((event: any) => ({ ...event, detail: !admin && event.eventType === 'dispute_compensation' ? '患者已接受例外退费方案，等待财务审核。' : event.detail, id: Number(event.id), refundId: Number(event.refundId), actorId: event.actorId ? Number(event.actorId) : null })) || [],
      ...(admin ? {} : { adminNote: row.status === 'rejected' ? row.adminNote : '' }),
    }
  }
}
