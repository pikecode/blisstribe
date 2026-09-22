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

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private orderRepository: OrderRepository,
    private cartService: CartService
  ) {}

  async createOrder(userId: bigint, dto: CreateOrderDto) {
    // Validate receiver info
    if (
      !dto.recipientName ||
      !dto.recipientPhone ||
      !dto.shippingAddress
    ) {
      throw new BadRequestException('Incomplete receiver information')
    }

    // Validate items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Items array cannot be empty')
    }

    // Use transaction for atomicity
    const order = await this.prisma.$transaction(async (tx: any) => {
      let totalAmountFen = 0n
      const orderItems: any[] = []

      // Validate and reserve stock for each item
      for (const item of dto.items) {
        // Query product (without include to avoid nested queries)
        const product = await tx.shopProduct.findUnique({
          where: { id: item.productId },
        })

        // Validate product exists
        if (!product) {
          throw new NotFoundException(
            `Product not found: ${item.productId}`
          )
        }

        // Validate product is published
        if (product.status !== 1) {
          throw new BadRequestException(
            `Product is not published: ${product.name}`
          )
        }

        // Validate product is not deleted
        if (product.deletedAt) {
          throw new BadRequestException(
            `Product has been deleted: ${product.name}`
          )
        }

        // Calculate available stock
        const available =
          product.totalStock - product.reservedStock - product.soldStock

        // Validate sufficient stock
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${item.quantity}`
          )
        }

        // Update product: reserve stock
        await tx.shopProduct.update({
          where: { id: item.productId },
          data: {
            reservedStock: {
              increment: item.quantity,
            },
          },
        })

        // Accumulate total amount
        totalAmountFen +=
          BigInt(product.priceFen) * BigInt(item.quantity)

        // Prepare order item
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          priceFen: product.priceFen,
        })
      }

      // Generate order number
      const orderNo = OrderNoGenerator.generate()

      // Calculate expiration (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      // Create order with items in same transaction
      const createdOrder = await tx.shopOrder.create({
        data: {
          userId,
          orderNo,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          fulfillmentStatus: 'pending',
          totalAmountFen: totalAmountFen,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          shippingAddress: dto.shippingAddress,
          remark: dto.remark,
          expiresAt,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      })

      return createdOrder
    })

    // Clear cart after successful order creation
    await this.cartService.clearCart(userId)

    return order
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
    filters: { status?: string; page?: number; limit?: number }
  ) {
    const { status, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    return this.orderRepository.findUserOrders(userId, {
      status,
      offset,
      limit,
    })
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

    // Check status is pending_payment
    if (order.status !== 'pending_payment') {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status`
      )
    }

    // Use transaction to release reserved stock
    await this.prisma.$transaction(async (tx: any) => {
      // Release stock for each item
      for (const item of order.items) {
        await tx.shopProduct.update({
          where: { id: item.productId },
          data: {
            reservedStock: {
              decrement: item.quantity,
            },
          },
        })
      }

      // Update order status
      await tx.shopOrder.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'User cancelled',
        },
      })
    })

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
