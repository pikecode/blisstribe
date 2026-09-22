import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { ShopRefund } from '@prisma/client'

@Injectable()
export class RefundRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: bigint): Promise<ShopRefund | null> {
    return this.prisma.shopRefund.findUnique({
      where: { id },
    })
  }

  async findByRefundNo(refundNo: string): Promise<ShopRefund | null> {
    return this.prisma.shopRefund.findUnique({
      where: { refundNo },
    })
  }

  async findByOutRefundNo(outRefundNo: string): Promise<ShopRefund | null> {
    return this.prisma.shopRefund.findUnique({
      where: { outRefundNo },
    })
  }

  async findByWechatRefundNo(outRefundNo: string): Promise<ShopRefund | null> {
    return this.prisma.shopRefund.findUnique({
      where: { outRefundNo },
    })
  }

  async findOrderRefunds(
    orderId: bigint,
    filters: {
      limit: number
      offset: number
      status?: string
    }
  ): Promise<{
    refunds: ShopRefund[]
    total: number
  }> {
    const where: any = { orderId }

    if (filters.status) {
      where.status = filters.status
    }

    const [refunds, total] = await Promise.all([
      this.prisma.shopRefund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      this.prisma.shopRefund.count({ where }),
    ])

    return { refunds, total }
  }

  async findAllRefunds(filters: {
    limit: number
    offset: number
    status?: string
  }): Promise<{
    refunds: ShopRefund[]
    total: number
  }> {
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    const [refunds, total] = await Promise.all([
      this.prisma.shopRefund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      this.prisma.shopRefund.count({ where }),
    ])

    return { refunds, total }
  }

  async create(data: {
    orderId: bigint
    refundNo: string
    outRefundNo: string
    requestedAmountFen: number
    reason: string
  }): Promise<ShopRefund> {
    return this.prisma.shopRefund.create({
      data,
    })
  }

  async update(id: bigint, data: Partial<ShopRefund>): Promise<ShopRefund> {
    return this.prisma.shopRefund.update({
      where: { id },
      data,
    })
  }
}
