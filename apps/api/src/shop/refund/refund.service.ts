import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { RefundRepository } from './refund.repository'
import { OrderRepository } from '../order/order.repository'
import { PaymentService } from '../payment/payment.service'
import { CreateRefundDto, ApproveRefundDto } from '../dto/refund.dto'

@Injectable()
export class RefundService {
  constructor(
    private prisma: PrismaService,
    private refundRepository: RefundRepository,
    private orderRepository: OrderRepository,
    private paymentService: PaymentService
  ) {}

  async requestRefund(userId: bigint, orderId: bigint, dto: CreateRefundDto) {
    // Find order via OrderRepository.findById()
    const order = await this.orderRepository.findById(orderId)

    // Validate: order exists and belongs to user
    if (!order) {
      throw new NotFoundException('订单不存在')
    }

    if (order.userId !== userId) {
      throw new NotFoundException('无权访问此订单')
    }

    // Validate: order.paymentStatus === 'paid'
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException('订单未支付，无法申请退款')
    }

    // Validate: order.fulfillmentStatus !== 'delivered' && !order.completedAt
    if (order.fulfillmentStatus === 'delivered' || order.completedAt) {
      throw new BadRequestException('订单已完成或已发货，无法申请退款')
    }

    // Generate unique refund number
    const refundNo = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const outRefundNo = `OUT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // Create ShopRefund record
    const refund = await this.refundRepository.create({
      orderId,
      refundNo,
      outRefundNo,
      requestedAmountFen: dto.amountInFen,
      reason: dto.reason || '',
    })

    return refund
  }

  async approveRefund(refundId: bigint, approve: boolean, adminNote?: string) {
    // Find refund via repository
    const refund = await this.refundRepository.findById(refundId)

    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }

    // Validate: refund.status === 'pending'
    if (refund.status !== 'pending') {
      throw new BadRequestException('只能审批待审核的退款申请')
    }

    if (approve) {
      // Use $transaction() for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Get order and payment details
        const order = await tx.shopOrder.findUnique({
          where: { id: refund.orderId },
          include: { payments: true },
        })

        if (!order) {
          throw new NotFoundException('订单不存在')
        }

        // Call PaymentService.processRefund() to initiate WeChat refund
        const refundResult = await this.paymentService.processRefund(
          refund.orderId,
          refund.outRefundNo,
          refund.requestedAmountFen
        )

        // Update ShopRefund
        await tx.shopRefund.update({
          where: { id: refundId },
          data: {
            status: 'approved',
            approvedAmountFen: refund.requestedAmountFen,
            approvedByAdminId: BigInt(1), // Will be replaced with actual admin ID from context
          },
        })

        // Update ShopOrder with refundStatus
        await tx.shopOrder.update({
          where: { id: refund.orderId },
          data: {
            refundedAmountFen: refund.requestedAmountFen,
          },
        })

        return { ...refund, status: 'approved', wechatRefundId: refundResult.refundId }
      })

      return result
    } else {
      // Reject refund
      const rejected = await this.refundRepository.update(refundId, {
        status: 'rejected',
      })

      return rejected
    }
  }

  async handleRefundCallback(data: any) {
    // Extract: out_refund_no, refund_id from WeChat callback
    const outRefundNo = data.out_refund_no
    const refundId = data.refund_id

    // Find shopRefund where outRefundNo = out_refund_no
    const refund = await this.refundRepository.findByOutRefundNo(outRefundNo)

    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }

    if (refundId) {
      // Refund succeeded
      // Use $transaction() for atomicity
      await this.prisma.$transaction(async (tx) => {
        // Check idempotency: if already processed, return early
        const existing = await tx.shopRefund.findUnique({
          where: { id: refund.id },
        })

        if (existing && existing.wechatRefundId === refundId) {
          // Already processed
          return
        }

        // Update shopRefund
        await tx.shopRefund.update({
          where: { id: refund.id },
          data: {
            status: 'success',
            wechatRefundId: refundId,
            completedAt: new Date(),
          },
        })

        // Get order and its items
        const order = await tx.shopOrder.findUnique({
          where: { id: refund.orderId },
          include: { items: true },
        })

        if (!order) {
          throw new NotFoundException('订单不存在')
        }

        // For each order item: update shopProduct (decrement soldStock)
        for (const item of order.items) {
          await tx.shopProduct.update({
            where: { id: item.productId },
            data: {
              soldStock: { decrement: item.quantity },
            },
          })
        }

        // Update shopOrder
        await tx.shopOrder.update({
          where: { id: refund.orderId },
          data: {
            fulfillmentStatus: 'refunded',
          },
        })
      })

      return { message: 'success' }
    } else {
      // Refund failed
      await this.refundRepository.update(refund.id, {
        status: 'failed',
      })

      await this.prisma.shopOrder.update({
        where: { id: refund.orderId },
        data: {
          fulfillmentStatus: 'refund_failed',
        },
      })

      return { message: 'refund failed' }
    }
  }

  async getUserRefunds(userId: bigint, filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    // Get refunds for user's orders
    const where: any = {
      order: {
        userId,
      },
    }

    if (filters.status) {
      where.status = filters.status
    }

    const [refunds, total] = await Promise.all([
      this.prisma.shopRefund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.shopRefund.count({ where }),
    ])

    return { refunds, total }
  }

  async getAllRefunds(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    return this.refundRepository.findAllRefunds({
      limit,
      offset,
      status: filters.status,
    })
  }

  async getRefundDetail(refundId: bigint, userId?: bigint) {
    const refund = await this.refundRepository.findById(refundId)

    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }

    if (userId) {
      const order = await this.orderRepository.findById(refund.orderId)
      if (!order || order.userId !== userId) {
        throw new NotFoundException('无权访问此退款记录')
      }
    }

    return refund
  }
}
