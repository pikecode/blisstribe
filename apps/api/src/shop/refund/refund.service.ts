import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { RefundRepository } from './refund.repository'
import { OrderRepository } from '../order/order.repository'
import { PaymentService } from '../payment/payment.service'
import { CreateRefundDto } from '../dto/refund.dto'

@Injectable()
export class RefundService {
  constructor(
    private prisma: PrismaService,
    private refundRepository: RefundRepository,
    private orderRepository: OrderRepository,
    private paymentService: PaymentService
  ) {}

  async requestRefund(userId: bigint, orderId: bigint, dto: CreateRefundDto) {
    const order = await this.orderRepository.findById(orderId)
    if (!order) {
      throw new NotFoundException('订单不存在')
    }
    if (order.userId !== userId) {
      throw new NotFoundException('无权访问此订单')
    }
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException('订单未支付，无法申请退款')
    }
    if (order.fulfillmentStatus !== 'pending' || order.completedAt) {
      throw new BadRequestException('订单已发货或完成，无法申请退款')
    }

    const refundAmount = order.paymentAmountFen - order.refundedAmountFen
    if (refundAmount <= 0 || dto.amountInFen !== refundAmount) {
      throw new BadRequestException('目前仅支持按剩余实付金额整单退款')
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ShopOrder" WHERE id = ${orderId} FOR UPDATE`
      const currentOrder = await tx.shopOrder.findUnique({ where: { id: orderId } })
      if (
        !currentOrder ||
        currentOrder.paymentStatus !== 'paid' ||
        currentOrder.fulfillmentStatus !== 'pending' ||
        currentOrder.paymentAmountFen - currentOrder.refundedAmountFen !== dto.amountInFen
      ) {
        throw new BadRequestException('订单状态已变化，无法申请退款')
      }

      const existing = await tx.shopRefund.findFirst({
        where: { orderId, status: { in: ['pending', 'processing', 'approved'] } },
      })
      if (existing) {
        throw new BadRequestException('订单已有进行中的退款申请')
      }

      return tx.shopRefund.create({
        data: {
          orderId,
          refundNo: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          outRefundNo: `OUT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          requestedAmountFen: dto.amountInFen,
          reason: dto.reason || '',
        },
      })
    })
  }

  async approveRefund(refundId: bigint, adminId: bigint, adminNote?: string) {
    const refund = await this.refundRepository.findById(refundId)
    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }
    if (refund.status !== 'pending') {
      throw new BadRequestException('只能审批待审核的退款申请')
    }

    const claimed = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ShopOrder" WHERE id = ${refund.orderId} FOR UPDATE`
      const order = await tx.shopOrder.findUnique({ where: { id: refund.orderId } })
      if (
        !order ||
        order.paymentStatus !== 'paid' ||
        order.fulfillmentStatus !== 'pending' ||
        order.paymentAmountFen - order.refundedAmountFen !== refund.requestedAmountFen
      ) {
        throw new BadRequestException('订单状态或退款金额已变化')
      }
      return tx.shopRefund.updateMany({
        where: { id: refundId, status: 'pending' },
        data: {
          status: 'processing',
          approvedAmountFen: refund.requestedAmountFen,
          approvedByAdminId: adminId,
          approvedAt: new Date(),
          adminNotes: adminNote || null,
        },
      })
    })
    if (claimed.count !== 1) {
      throw new BadRequestException('退款状态已变化')
    }

    // 网关超时结果不确定时保留 processing，避免错误重试造成重复退款。
    const refundResult = await this.paymentService.processRefund(
      refund.orderId,
      refund.outRefundNo,
      refund.requestedAmountFen
    )
    return { ...refund, status: 'processing', wechatRefundId: refundResult.refundId }
  }

  async rejectRefund(refundId: bigint, adminId: bigint, reason?: string) {
    const result = await this.prisma.shopRefund.updateMany({
      where: { id: refundId, status: 'pending' },
      data: {
        status: 'rejected',
        approvedByAdminId: adminId,
        approvedAt: new Date(),
        adminNotes: reason || null,
      },
    })
    if (result.count !== 1) {
      throw new BadRequestException('退款不存在或已处理')
    }
    return this.refundRepository.findById(refundId)
  }

  async handleRefundCallback(data: any) {
    const outRefundNo = data.out_refund_no
    const refundId = data.refund_id
    if (!outRefundNo || !data.status) {
      throw new BadRequestException('退款回调数据格式错误')
    }
    const refund = await this.refundRepository.findByOutRefundNo(outRefundNo)
    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }

    if (data.status === 'SUCCESS') {
      if (!refundId) {
        throw new BadRequestException('退款成功回调缺少退款单号')
      }
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.shopRefund.updateMany({
          where: { id: refund.id, status: 'processing' },
          data: {
            status: 'success',
            wechatRefundId: refundId,
            completedAt: new Date(),
          },
        })
        if (changed.count === 0) {
          if (refund.status === 'success' && refund.wechatRefundId === refundId) return
          throw new BadRequestException('退款记录状态异常')
        }

        const order = await tx.shopOrder.findUnique({
          where: { id: refund.orderId },
          include: { items: true },
        })
        if (!order) {
          throw new NotFoundException('订单不存在')
        }
        if (
          refund.requestedAmountFen !== order.paymentAmountFen - order.refundedAmountFen ||
          order.fulfillmentStatus !== 'pending'
        ) {
          throw new BadRequestException('退款金额或履约状态异常，需人工核查')
        }
        for (const item of order.items) {
          const updated = await tx.shopProduct.updateMany({
            where: { id: item.productId, soldStock: { gte: item.quantity } },
            data: { soldStock: { decrement: item.quantity } },
          })
          if (updated.count !== 1) throw new BadRequestException('商品销量状态异常')
        }
        const updatedOrder = await tx.shopOrder.updateMany({
          where: {
            id: refund.orderId,
            paymentStatus: 'paid',
            fulfillmentStatus: 'pending',
            refundedAmountFen: order.refundedAmountFen,
          },
          data: {
            refundedAmountFen: { increment: refund.requestedAmountFen },
            fulfillmentStatus: 'refunded',
          },
        })
        if (updatedOrder.count !== 1) throw new BadRequestException('订单退款状态已变化')
      })
      return { message: 'success' }
    }

    if (data.status === 'CLOSED' || data.status === 'ABNORMAL') {
      await this.prisma.shopRefund.updateMany({
        where: { id: refund.id, status: 'processing' },
        data: { status: 'failed' },
      })
      return { message: 'refund failed' }
    }
    return { message: 'refund processing' }
  }

  async getUserRefunds(userId: bigint, filters: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1)
    const limit = Math.min(100, Math.max(1, filters.limit || 20))
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

    return {
      refunds: refunds.map((refund) => this.toUserRefund(refund)),
      total,
      page,
      pageSize: limit,
    }
  }

  async getAllRefunds(filters: { status?: string; page?: number; pageSize?: number; limit?: number }) {
    const page = Math.max(1, filters.page || 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || filters.limit || 20))
    const limit = pageSize
    const offset = (page - 1) * limit

    const result = await this.refundRepository.findAllRefunds({
      limit,
      offset,
      status: filters.status,
    })
    return {
      list: result.refunds.map((refund) => this.toAdminRefund(refund)),
      total: result.total,
      page,
      pageSize,
    }
  }

  async getRefundDetail(refundId: bigint, userId?: bigint) {
    const refund = userId
      ? await this.refundRepository.findById(refundId)
      : await this.refundRepository.findAdminById(refundId)

    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }

    if (userId) {
      const order = await this.orderRepository.findById(refund.orderId)
      if (!order || order.userId !== userId) {
        throw new NotFoundException('无权访问此退款记录')
      }
    }

    return userId ? this.toUserRefund(refund) : this.toAdminRefund(refund)
  }

  private toUserRefund(refund: any) {
    return {
      id: refund.id,
      orderId: refund.orderId,
      requestedAmountFen: refund.requestedAmountFen,
      approvedAmountFen: refund.approvedAmountFen,
      reason: refund.reason,
      status: refund.status,
      wechatRefundId: refund.wechatRefundId,
      completedAt: refund.completedAt,
      ...(refund.status === 'rejected'
        ? { rejectionReason: refund.adminNotes || '' }
        : {}),
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    }
  }

  private toAdminRefund(refund: any) {
    const user = refund.order?.user
    return {
      ...refund,
      requestAmountFen: refund.requestedAmountFen,
      orderNo: refund.order?.orderNo || '',
      userName: user?.nickname || '',
      userPhone: user?.phoneMasked || '',
      user: user
        ? { id: user.id, nickname: user.nickname, phoneMasked: user.phoneMasked }
        : undefined,
      reasonSummary: refund.reason,
      rejectionReason: refund.status === 'rejected' ? refund.adminNotes || '' : undefined,
      remark: refund.adminNotes || undefined,
    }
  }
}
