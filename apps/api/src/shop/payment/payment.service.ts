import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { OrderRepository } from '../order/order.repository'
import { PaymentRepository } from './payment.repository'
import { WechatPayService } from './wechat-pay.service'

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private orderRepository: OrderRepository,
    private paymentRepository: PaymentRepository,
    private wechatPayService: WechatPayService
  ) {}

  async createPayment(
    orderId: bigint,
    userId: bigint,
    clientIp: string
  ): Promise<{ prepayId: string; outTradeNo: string }> {
    // Find order via OrderRepository.findById()
    const order = await this.orderRepository.findById(orderId)

    // Validate: order exists
    if (!order) {
      throw new NotFoundException('订单不存在')
    }

    if (order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    if (
      order.status !== 'pending_payment' ||
      order.paymentStatus !== 'unpaid' ||
      order.expiresAt <= new Date()
    ) {
      throw new BadRequestException('订单状态不支持支付')
    }

    // Call wechatPay.createPrepay()
    const prepayResult = await this.wechatPayService.createPrepay({
      outTradeNo: order.orderNo,
      amount: order.paymentAmountFen,
      description: `BlissTribe订单${order.orderNo}`,
      notifyUrl: `${process.env.API_BASE_URL || 'http://localhost:3000/api/v1'}/shop/webhooks/wechat-pay`,
      clientIp,
    })

    // Create ShopPayment record
    const payment = await this.paymentRepository.create({
      orderId,
      outTradeNo: order.orderNo,
      prepayId: prepayResult.prepayId,
      amountFen: order.paymentAmountFen,
      status: 'pending',
    })

    // Return { prepayId, outTradeNo }
    return {
      prepayId: payment.prepayId || '',
      outTradeNo: payment.outTradeNo,
    }
  }

  async handleWechatNotify(data: any): Promise<{ message: string }> {
    // Extract: out_trade_no, transaction_id, amount.total from decrypted data
    const outTradeNo = data.out_trade_no
    const transactionId = data.transaction_id
    const amountTotal = data.amount?.total

    if (!outTradeNo || !transactionId || amountTotal === undefined) {
      throw new BadRequestException('WeChat 回调数据格式错误')
    }

    // Find order via findByOrderNo(out_trade_no)
    const order = await this.prisma.shopOrder.findUnique({
      where: { orderNo: outTradeNo },
      include: { items: true },
    })

    // Validate: order exists
    if (!order) {
      throw new BadRequestException('订单不存在')
    }

    // Validate: amount matches
    if (amountTotal !== order.paymentAmountFen) {
      throw new BadRequestException('支付金额与订单金额不符')
    }

    // Use $transaction() for atomic updates
    const result = await this.prisma.$transaction(async (tx: any) => {
      const payment = await tx.shopPayment.findUnique({ where: { outTradeNo } })
      if (payment && payment.orderId !== order.id) {
        throw new BadRequestException('支付记录与订单不匹配')
      }
      if (payment?.status === 'success') {
        if (payment.wechatTransactionId === transactionId) return
        throw new BadRequestException('订单已由其他交易完成支付')
      }

      const now = new Date()
      if (order.status === 'cancelled' || order.paymentStatus !== 'unpaid') {
        await tx.shopPaymentException.upsert({
          where: { eventKey: `wechat:${transactionId}` },
          create: {
            eventKey: `wechat:${transactionId}`,
            orderId: order.id,
            outTradeNo,
            wechatTransactionId: transactionId,
            amountFen: amountTotal,
          },
          update: {},
        })
        return 'late_payment'
      }

      const paidOrder = await tx.shopOrder.updateMany({
        where: {
          id: order.id,
          status: { in: ['pending_payment', 'closing'] },
          paymentStatus: 'unpaid',
        },
        data: {
          status: 'paid',
          paymentStatus: 'paid',
          paidAt: now,
        },
      })
      if (paidOrder.count !== 1) {
        const currentOrder = await tx.shopOrder.findUnique({ where: { id: order.id } })
        if (currentOrder?.status === 'cancelled') {
          await tx.shopPaymentException.upsert({
            where: { eventKey: `wechat:${transactionId}` },
            create: {
              eventKey: `wechat:${transactionId}`,
              orderId: order.id,
              outTradeNo,
              wechatTransactionId: transactionId,
              amountFen: amountTotal,
            },
            update: {},
          })
          return 'late_payment'
        }
        throw new BadRequestException('订单状态已变化，无法确认支付')
      }

      if (payment) {
        const updatedPayment = await tx.shopPayment.updateMany({
          where: { id: payment.id, status: 'pending' },
          data: {
            wechatTransactionId: transactionId,
            status: 'success',
            paidAt: now,
          },
        })
        if (updatedPayment.count !== 1) {
          throw new BadRequestException('支付记录状态已变化')
        }
      } else {
        await tx.shopPayment.create({
          data: {
            orderId: order.id,
            outTradeNo,
            wechatTransactionId: transactionId,
            amountFen: amountTotal,
            status: 'success',
            paidAt: now,
          },
        })
      }

      for (const item of order.items) {
        const updatedProduct = await tx.shopProduct.updateMany({
          where: { id: item.productId, reservedStock: { gte: item.quantity } },
          data: {
            reservedStock: { decrement: item.quantity },
            soldStock: { increment: item.quantity },
          },
        })
        if (updatedProduct.count !== 1) {
          throw new BadRequestException('预留库存状态异常')
        }
      }
      return 'paid'
    })

    return { message: result === 'late_payment' ? 'payment_exception_recorded' : 'success' }
  }

  async closeUnpaidOrder(
    orderId: bigint,
    reason: string
  ): Promise<'closed' | 'paid' | 'pending'> {
    const order = await this.prisma.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    })
    if (!order) throw new NotFoundException('订单不存在')
    if (order.status === 'cancelled') return 'closed'
    if (order.paymentStatus === 'paid') return 'paid'
    if (!['pending_payment', 'closing'].includes(order.status)) return 'pending'

    if (order.status === 'pending_payment') {
      const claimed = await this.prisma.shopOrder.updateMany({
        where: { id: orderId, status: 'pending_payment', paymentStatus: 'unpaid' },
        data: { status: 'closing' },
      })
      if (claimed.count !== 1) return 'pending'
    }

    const trade = await this.wechatPayService.queryTrade(order.orderNo)
    if (trade.tradeState === 'SUCCESS') {
      if (!trade.transactionId || trade.amountFen === undefined) return 'pending'
      await this.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: trade.transactionId,
        amount: { total: trade.amountFen },
      })
      return 'paid'
    }

    let finalTradeState = trade.tradeState
    if (trade.tradeState === 'NOTPAY') {
      finalTradeState = (await this.wechatPayService.closeTrade(order.orderNo)).tradeState
    }
    if (!['CLOSED', 'REVOKED', 'PAYERROR'].includes(finalTradeState)) return 'pending'

    await this.prisma.$transaction(async (tx: any) => {
      const cancelled = await tx.shopOrder.updateMany({
        where: { id: orderId, status: 'closing', paymentStatus: 'unpaid' },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      })
      if (cancelled.count !== 1) return

      for (const item of order.items) {
        const released = await tx.shopProduct.updateMany({
          where: { id: item.productId, reservedStock: { gte: item.quantity } },
          data: { reservedStock: { decrement: item.quantity } },
        })
        if (released.count !== 1) {
          throw new BadRequestException('预留库存状态异常')
        }
      }
    })
    return 'closed'
  }

  async processRefund(
    orderId: bigint,
    refundNo: string,
    amount: number
  ): Promise<{ refundId: string }> {
    // Find order via OrderRepository.findById()
    const order = await this.orderRepository.findById(orderId)

    // Validate: order exists
    if (!order) {
      throw new NotFoundException('订单不存在')
    }

    // Get payment: order.payments[0]
    const payment = await this.prisma.shopPayment.findFirst({
      where: { orderId },
    })

    // Validate: payment.wechatTransactionId exists
    if (!payment || !payment.wechatTransactionId) {
      throw new BadRequestException('订单未完成支付，无法退款')
    }

    // Call wechatPay.refund()
    const refundResult = await this.wechatPayService.refund({
      transactionId: payment.wechatTransactionId,
      outRefundNo: refundNo,
      amount,
      reason: 'User requested',
    })

    // Return { refundId }
    return { refundId: refundResult.refundId }
  }
}
