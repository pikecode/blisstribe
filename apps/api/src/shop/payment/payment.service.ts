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

  async createPayment(orderId: bigint, clientIp: string): Promise<{ prepayId: string; outTradeNo: string }> {
    // Find order via OrderRepository.findById()
    const order = await this.orderRepository.findById(orderId)

    // Validate: order exists
    if (!order) {
      throw new NotFoundException('订单不存在')
    }

    // Validate: paymentStatus === 'unpaid'
    if (order.paymentStatus !== 'unpaid') {
      throw new BadRequestException('订单状态不支持支付')
    }

    // Call wechatPay.createPrepay()
    const prepayResult = await this.wechatPayService.createPrepay({
      outTradeNo: order.orderNo,
      amount: order.paymentAmountFen,
      description: `BlissTribe订单${order.orderNo}`,
      notifyUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}/shop/webhooks/wechat-pay`,
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
    await this.prisma.$transaction(async (tx: any) => {
      // Check if payment already processed (idempotency)
      const existingPayment = await tx.shopPayment.findFirst({
        where: {
          orderId: order.id,
          wechatTransactionId: transactionId,
        },
      })

      // If found, return early (duplicate callback)
      if (existingPayment) {
        return
      }

      // Update shopPayment
      await tx.shopPayment.update({
        where: { outTradeNo },
        data: {
          wechatTransactionId: transactionId,
          status: 'success',
          paidAt: new Date(),
        },
      })

      // Update shopOrder - only update payment status, not order status
      await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          paidAt: new Date(),
        },
      })

      // For each order.items, update shopProduct
      for (const item of order.items) {
        await tx.shopProduct.update({
          where: { id: item.productId },
          data: {
            reservedStock: { decrement: item.quantity },
            soldStock: { increment: item.quantity },
          },
        })
      }
    })

    return { message: 'success' }
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
