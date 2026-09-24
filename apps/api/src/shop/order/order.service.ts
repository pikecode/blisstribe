import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { OrderRepository } from './order.repository'
import { OrderNoGenerator } from './order-no.generator'
import { CartService } from '../cart/cart.service'
import { CreateOrderDto } from '../dto/order.dto'
import { PaymentService } from '../payment/payment.service'

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private orderRepository: OrderRepository,
    private cartService: CartService,
    private paymentService: PaymentService
  ) {}

  async createOrder(userId: bigint, dto: CreateOrderDto) {
    if (!dto.receiverName?.trim() || !dto.receiverPhone?.trim() || !dto.shippingAddress?.trim()) {
      throw new BadRequestException('收货信息不完整')
    }
    const receiverName = dto.receiverName.trim()
    const receiverPhone = dto.receiverPhone.trim()
    const shippingAddress = dto.shippingAddress.trim()
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('订单商品不能为空')
    }

    const quantities = new Map<bigint, number>()
    for (const item of dto.items) {
      let productId: bigint
      try {
        productId = BigInt(item.productId)
      } catch {
        throw new BadRequestException('商品 ID 无效')
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('商品数量必须为正整数')
      }
      const quantity = (quantities.get(productId) || 0) + item.quantity
      if (!Number.isSafeInteger(quantity)) {
        throw new BadRequestException('商品数量超出限制')
      }
      quantities.set(productId, quantity)
    }

    return this.prisma.$transaction(async (tx: any) => {
      let totalAmountFen = 0
      const orderItems: Array<Record<string, unknown>> = []

      for (const [productId, quantity] of [...quantities].sort(([a], [b]) => a < b ? -1 : 1)) {
        const locked = await tx.$queryRaw`
          SELECT "id" FROM "ShopProduct" WHERE "id" = ${productId} FOR UPDATE
        `
        if (!Array.isArray(locked) || locked.length === 0) {
          throw new NotFoundException(`商品不存在：${productId}`)
        }

        const product = await tx.shopProduct.findUnique({ where: { id: productId } })
        if (!product || product.deletedAt) {
          throw new NotFoundException(`商品不存在：${productId}`)
        }
        if (product.status !== 1) {
          throw new BadRequestException(`商品已下架：${product.name}`)
        }

        const available = product.totalStock - product.reservedStock - product.soldStock
        if (available < quantity) {
          throw new BadRequestException(`商品库存不足：${product.name}`)
        }
        if (!Number.isSafeInteger(product.priceFen) || product.priceFen <= 0) {
          throw new BadRequestException(`商品价格无效：${product.name}`)
        }

        const subtotalFen = product.priceFen * quantity
        totalAmountFen += subtotalFen
        if (!Number.isSafeInteger(subtotalFen) || !Number.isSafeInteger(totalAmountFen)) {
          throw new BadRequestException('订单金额超出限制')
        }

        await tx.shopProduct.update({
          where: { id: productId },
          data: { reservedStock: { increment: quantity } },
        })
        orderItems.push({
          productId,
          productName: product.name,
          productImage: product.images[0] || null,
          unitPriceFen: product.priceFen,
          quantity,
          subtotalFen,
        })
      }

      const createdOrder = await tx.shopOrder.create({
        data: {
          userId,
          orderNo: OrderNoGenerator.generate(),
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'pending',
          totalAmountFen,
          discountAmountFen: 0,
          paymentAmountFen: totalAmountFen,
          receiverName,
          receiverPhone,
          shippingAddress,
          remark: dto.remark?.trim(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: { create: orderItems },
        },
        include: { items: true },
      })

      const cart = await tx.shopCart.findUnique({
        where: { userId },
        select: { id: true },
      })
      if (cart) {
        await tx.shopCartItem.deleteMany({
          where: { cartId: cart.id, productId: { in: [...quantities.keys()] } },
        })
      }

      return createdOrder
    })
  }

  async getOrderDetail(orderId: bigint, userId: bigint) {
    const order = await this.orderRepository.findById(orderId)

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Cannot access other user orders')
    }

    return order
  }

  async getUserOrders(
    userId: bigint,
    filters: { status?: string; page?: number; pageSize?: number; limit?: number }
  ) {
    const page = Math.max(1, filters.page || 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || filters.limit || 20))
    const result = await this.orderRepository.findUserOrders(userId, {
      status: filters.status,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })
    return {
      list: result.orders,
      total: result.total,
      page,
      pageSize,
      hasMore: page * pageSize < result.total,
    }
  }

  async cancelOrder(orderId: bigint, userId: bigint) {
    // Find order and verify ownership
    const order = await this.orderRepository.findById(orderId)

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Cannot cancel other user orders')
    }

    if (order.status !== 'pending_payment' || order.paymentStatus !== 'unpaid') {
      throw new BadRequestException(`订单当前状态不可取消：${order.status}`)
    }
    await this.paymentService.closeUnpaidOrder(orderId, 'User cancelled')

    return this.orderRepository.findById(orderId)
  }

  async getOrderByOrderNo(orderNo: string) {
    return this.orderRepository.findByOrderNo(orderNo)
  }

  async updateOrderPaymentStatus(
    orderId: bigint,
    paymentStatus: string
  ) {
    return this.prisma.shopOrder.update({
      where: { id: orderId },
      data: { paymentStatus },
    })
  }

  async listAdminOrders(filters: {
    status?: string
    paymentStatus?: string
    fulfillmentStatus?: string
    keyword?: string
    startDate?: string
    endDate?: string
    offset: number
    limit: number
  }) {
    const {
      status,
      paymentStatus,
      fulfillmentStatus,
      keyword,
      startDate,
      endDate,
      offset,
      limit,
    } = filters

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (fulfillmentStatus) {
      where.fulfillmentStatus = fulfillmentStatus
    }

    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { user: { nickname: { contains: keyword } } },
        { user: { phoneMasked: { contains: keyword } } },
      ]
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDateTime
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.shopOrder.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              phoneMasked: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.shopOrder.count({ where }),
    ])

    return {
      orders,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    }
  }

  async getOrderDetailByOrderNo(orderNo: string) {
    const order = await this.prisma.shopOrder.findUnique({
      where: { orderNo },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phoneMasked: true,
          },
        },
        items: true,
        payments: true,
        refunds: true,
      },
    })

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    return order
  }

  async shipOrder(
    orderId: bigint,
    dto: { trackingNo: string; logisticsCompany?: string }
  ) {
    const order = await this.orderRepository.findById(orderId)

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException('Order payment not completed')
    }

    if (order.fulfillmentStatus !== 'pending') {
      throw new BadRequestException('Order has already been shipped or completed')
    }

    const updated = await this.prisma.shopOrder.update({
      where: { id: orderId },
      data: {
        trackingNo: dto.trackingNo,
        fulfillmentStatus: 'shipped',
        shippedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            phoneMasked: true,
          },
        },
        items: true,
      },
    })

    return updated
  }
}
