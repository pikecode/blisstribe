import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'

@Injectable()
export class OrderRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: bigint) {
    return this.prisma.shopOrder.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        refunds: true,
      },
    })
  }

  async findByOrderNo(orderNo: string) {
    return this.prisma.shopOrder.findUnique({
      where: { orderNo },
      include: {
        items: true,
      },
    })
  }

  async findUserOrders(
    userId: bigint,
    filters: { limit?: number; offset?: number; status?: string }
  ) {
    const { limit = 20, offset = 0, status } = filters

    const where = {
      userId,
      ...(status && { status }),
    }

    const [orders, total] = await Promise.all([
      this.prisma.shopOrder.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.shopOrder.count({ where }),
    ])

    return { orders, total }
  }

  async updateStatus(id: bigint, status: string) {
    return this.prisma.shopOrder.update({
      where: { id },
      data: { status },
    })
  }

  async updateFulfillmentStatus(id: bigint, fulfillmentStatus: string) {
    return this.prisma.shopOrder.update({
      where: { id },
      data: { fulfillmentStatus },
    })
  }
}
