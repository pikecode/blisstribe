import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { WechatPayService } from '../../payment-channel/wechat-pay.service'

import { recordServiceNotice } from '../notice'
import { movePackageStock, closePackageOrder } from '../goods/inventory'

@Injectable()
export class ServicePaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPay: WechatPayService
  ) {}

  async createPayment(orderId: bigint, userId: bigint, clientIp: string, openId: string) {
    this.wechatPay.assertCheckoutEnabled(userId)
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: orderId, userId },
      include: { payments: true },
    })
    if (!order) throw new NotFoundException('服务订单不存在')
    if (order.paymentAmountFen <= 0) throw new BadRequestException('免费服务方案不需要支付')
    if (order.status !== 'pending_payment' || order.paymentStatus !== 'unpaid' || order.expiresAt <= new Date()) {
      throw new BadRequestException('订单状态不支持支付')
    }

    const pending = order.payments.find((item) => item.status === 'pending' && item.prepayId)
    if (pending?.prepayId) return this.paymentResponse(pending.prepayId, pending.outTradeNo, false)

    if (this.wechatPay.isMockPaymentEnabled()) {
      await this.prisma.servicePayment.upsert({
        where: { outTradeNo: order.orderNo },
        update: { prepayId: `mock-${order.orderNo}` },
        create: { orderId, outTradeNo: order.orderNo, prepayId: `mock-${order.orderNo}`, amountFen: order.paymentAmountFen },
      })
      await this.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `MOCK-${order.orderNo}`,
        amount: { total: order.paymentAmountFen },
      })
      return { mock: true, status: 'paid', prepayId: `mock-${order.orderNo}`, outTradeNo: order.orderNo }
    }

    const result = await this.wechatPay.createPrepay({
      outTradeNo: order.orderNo,
      amount: order.paymentAmountFen,
      description: `BlissTribe服务${order.orderNo}`,
      notifyUrl: this.wechatPay.getNotifyUrl('wechat-pay', 'service-program'),
      clientIp,
      openId,
      userId,
      expiresAt: order.expiresAt,
    })
    const payment = await this.prisma.servicePayment.upsert({
      where: { outTradeNo: order.orderNo },
      update: { prepayId: result.prepayId },
      create: { orderId, outTradeNo: order.orderNo, prepayId: result.prepayId, amountFen: order.paymentAmountFen },
    })
    return this.paymentResponse(payment.prepayId || '', payment.outTradeNo, false)
  }

  async handleWechatNotify(data: any): Promise<{ message: string }> {
    const outTradeNo = data?.out_trade_no
    const transactionId = data?.transaction_id
    const amountFen = data?.amount?.total
    if (typeof outTradeNo !== 'string' || typeof transactionId !== 'string' || !Number.isSafeInteger(amountFen)) {
      throw new BadRequestException('微信支付回调数据格式错误')
    }

    const order = await this.prisma.serviceOrder.findUnique({
      where: { orderNo: outTradeNo },
      include: { items: true, payments: true, offering: { select: { validityDays: true } } },
    })
    if (!order) throw new BadRequestException('服务订单不存在')
    if (amountFen !== order.paymentAmountFen) throw new BadRequestException('支付金额与服务订单金额不符')

    const currentPayment = order.payments.find((item) => item.outTradeNo === outTradeNo)
    if (currentPayment?.status === 'success') {
      if (currentPayment.wechatTransactionId !== transactionId) throw new BadRequestException('订单已由其他微信交易完成支付')
      return { message: 'success' }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${order.id} FOR UPDATE`
      const currentOrder = await tx.serviceOrder.findUnique({ where: { id: order.id }, include: { plan: true } })
      if (!currentOrder) throw new BadRequestException('服务订单不存在')
      if (currentOrder.paymentStatus === 'paid' && currentOrder.plan) return 'success'

      if (currentOrder.status === 'closed' || currentOrder.paymentStatus !== 'unpaid') {
        await tx.servicePayment.upsert({
          where: { outTradeNo },
          create: { orderId: order.id, outTradeNo, wechatTransactionId: transactionId, amountFen, status: 'exception', paidAt: new Date() },
          update: { wechatTransactionId: transactionId, status: 'exception', paidAt: new Date() },
        })
        await tx.auditLog.create({
          data: {
            actorType: 'system', action: 'service_payment.late_success', targetType: 'service_order', targetId: order.id,
            reason: '关闭后的服务订单收到微信支付成功通知', metadata: { outTradeNo, transactionId, amountFen },
          },
        })
        return 'late_payment'
      }

      const now = new Date()
      const claimed = await tx.serviceOrder.updateMany({
        where: { id: order.id, status: 'pending_payment', paymentStatus: 'unpaid' },
        data: { status: 'paid', paymentStatus: 'paid', paidAt: now },
      })
      if (claimed.count !== 1) {
        const latest = await tx.serviceOrder.findUnique({ where: { id: order.id }, include: { plan: true } })
        if (latest?.paymentStatus === 'paid' && latest.plan) return 'success'
        throw new BadRequestException('服务订单状态已变化，无法确认支付')
      }

      await movePackageStock(tx, order.items, 'paid')
      await tx.servicePayment.upsert({
        where: { outTradeNo },
        create: { orderId: order.id, outTradeNo, wechatTransactionId: transactionId, amountFen, status: 'success', paidAt: now },
        update: { wechatTransactionId: transactionId, status: 'success', paidAt: now },
      })

      const snapshot = order.offeringSnapshot as Record<string, unknown>
      const snapshotValidityDays = Number(snapshot.validityDays)
      const validityDays = Number.isSafeInteger(snapshotValidityDays) && snapshotValidityDays > 0
        ? snapshotValidityDays
        : order.offering.validityDays
      const plan = await tx.servicePlan.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          institutionId: order.institutionId,
          startsAt: now,
          expiresAt: new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000),
        },
      })
      await tx.serviceEntitlement.createMany({
        data: order.items.map((item) => ({ planId: plan.id, orderItemId: item.id, totalQuantity: item.quantity })),
      })

      if (order.leadId) {
        const lead = await tx.productLead.findUnique({ where: { id: order.leadId } })
        if (lead && !['converted', 'invalid'].includes(lead.status)) {
          await tx.productLead.update({ where: { id: lead.id }, data: { status: 'converted' } })
          await tx.productLeadFollowUp.create({
            data: { leadId: lead.id, operatorType: 'system', fromStatus: lead.status, toStatus: 'converted', note: '服务订单支付成功' },
          })
        }
      }
      await recordServiceNotice(tx, { eventKey: `order:${order.id}:paid`, userId: order.userId, title: '支付成功，服务已生效', detail: '权益已经发放，可查看服务内容和预约。', path: `/pages/services/detail?id=${plan.id}` })
      await tx.auditLog.create({
        data: {
          actorType: 'system', action: 'service_payment.confirmed', targetType: 'service_order', targetId: order.id,
          metadata: { outTradeNo, transactionId, amountFen, planId: Number(plan.id) },
        },
      })
      return 'success'
    })
    return { message: result === 'late_payment' ? 'payment_exception_recorded' : 'success' }
  }

  async confirmPayment(orderId: bigint, userId: bigint) {
    const order = await this.prisma.serviceOrder.findFirst({ where: { id: orderId, userId }, include: { payments: true } })
    if (!order) throw new NotFoundException('服务订单不存在')
    if (order.paymentStatus === 'unpaid' && order.payments.some((item) => item.status === 'pending')) {
      const trade = await this.wechatPay.queryTrade(order.orderNo)
      if (trade.tradeState === 'SUCCESS' && trade.transactionId && trade.amountFen !== undefined) {
        await this.handleWechatNotify({ out_trade_no: order.orderNo, transaction_id: trade.transactionId, amount: { total: trade.amountFen } })
      } else if (order.expiresAt <= new Date() && ['NOTPAY', 'NOT_CREATED', 'CLOSED'].includes(trade.tradeState)) {
        const finalState = trade.tradeState === 'NOTPAY'
          ? (await this.wechatPay.closeTrade(order.orderNo)).tradeState
          : trade.tradeState
        if (['CLOSED', 'NOT_CREATED'].includes(finalState)) {
          await this.prisma.$transaction(tx => closePackageOrder(tx, order.id, '支付超时', true))
        }
      }
    }
    const current = await this.prisma.serviceOrder.findUniqueOrThrow({ where: { id: orderId } })
    return { paymentStatus: current.paymentStatus, status: current.status }
  }

  private paymentResponse(prepayId: string, outTradeNo: string, mock: boolean) {
    return { mock, prepayId, outTradeNo, paymentParams: this.wechatPay.buildClientPaymentParams(prepayId) }
  }
}
