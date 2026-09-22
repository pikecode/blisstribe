import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { ShopPayment } from '@prisma/client'

@Injectable()
export class PaymentRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    orderId: bigint
    outTradeNo: string
    prepayId: string
    amountFen: number
    status: string
  }): Promise<ShopPayment> {
    return this.prisma.shopPayment.create({
      data: {
        orderId: data.orderId,
        outTradeNo: data.outTradeNo,
        prepayId: data.prepayId,
        amountFen: data.amountFen,
        status: data.status,
      },
    })
  }

  async findByOrderIdAndTransactionId(
    orderId: bigint,
    wechatTransactionId: string
  ): Promise<ShopPayment | null> {
    return this.prisma.shopPayment.findFirst({
      where: {
        orderId,
        wechatTransactionId,
      },
    })
  }

  async updateByOrderId(
    orderId: bigint,
    data: {
      wechatTransactionId?: string
      status?: string
      paidAt?: Date
    }
  ): Promise<ShopPayment> {
    const payment = await this.prisma.shopPayment.findFirst({
      where: { orderId },
    })
    if (!payment) {
      throw new Error('Payment not found')
    }
    return this.prisma.shopPayment.update({
      where: { id: payment.id },
      data,
    })
  }

  async findByOrderId(orderId: bigint): Promise<ShopPayment | null> {
    return this.prisma.shopPayment.findFirst({
      where: { orderId },
    })
  }
}
