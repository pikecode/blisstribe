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

      const created = await tx.shopRefund.create({
        data: {
          orderId,
          refundNo: `REF-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          outRefundNo: `OUT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          requestedAmountFen: dto.amountInFen,
          reason: dto.reason || '',
        },
      })
      await tx.shopRefundEvent.create({
        data: {
          refundId: created.id,
          eventType: 'request_submitted',
          actorType: 'user',
          actorId: userId,
          toStatus: 'pending',
          detail: '用户提交整单退款申请',
        },
      })
      return created
    })
  }

  async approveRefund(refundId: bigint, adminId: bigint, adminNote?: string) {
    const approvalNote = adminNote?.trim().slice(0, 500)
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
      const updated = await tx.shopRefund.updateMany({
        where: { id: refundId, status: 'pending' },
        data: {
          status: 'processing',
          approvedAmountFen: refund.requestedAmountFen,
          approvedByAdminId: adminId,
          approvedAt: new Date(),
          adminNotes: approvalNote || null,
          lastAttemptAt: new Date(),
          lastErrorCode: null,
        },
      })
      if (updated.count === 1) {
        await tx.shopRefundEvent.create({
          data: {
            refundId,
            eventType: 'approved',
            actorType: 'admin',
            actorId: adminId,
            fromStatus: 'pending',
            toStatus: 'processing',
            detail: approvalNote || '管理员批准退款申请',
          },
        })
      }
      return updated
    })
    if (claimed.count !== 1) {
      throw new BadRequestException('退款状态已变化')
    }

    try {
      const refundResult = await this.paymentService.processRefund(
        refund.orderId,
        refund.outRefundNo,
        refund.requestedAmountFen
      )
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.shopRefund.updateMany({
          where: { id: refundId, status: 'processing' },
          data: {
            wechatRefundId: refundResult.refundId,
            lastProviderStatus: 'SUBMITTED',
            lastErrorCode: null,
          },
        })
        if (updated.count === 1) {
          await tx.shopRefundEvent.create({
            data: {
              refundId,
              eventType: 'provider_request_accepted',
              actorType: 'system',
              toStatus: 'processing',
              providerStatus: 'SUBMITTED',
              detail: '渠道已受理退款请求，等待最终通知或查单',
            },
          })
        }
      })
    } catch {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.shopRefund.updateMany({
          where: { id: refundId, status: 'processing' },
          data: {
            lastErrorCode: 'provider_result_unknown',
            lastProviderStatus: 'UNKNOWN',
          },
        })
        if (updated.count === 1) {
          await tx.shopRefundEvent.create({
            data: {
              refundId,
              eventType: 'provider_result_unknown',
              actorType: 'system',
              toStatus: 'processing',
              providerStatus: 'UNKNOWN',
              detail: '渠道提交结果未知；须先查询渠道状态，不得重复提交退款',
            },
          })
        }
      })
    }
    return this.refundRepository.findAdminById(refundId)
  }

  async rejectRefund(refundId: bigint, adminId: bigint, reason?: string) {
    const rejectionReason = reason?.trim()
    if (!rejectionReason || rejectionReason.length > 500) {
      throw new BadRequestException('拒绝退款时必须填写原因，且不能超过 500 个字符')
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shopRefund.updateMany({
        where: { id: refundId, status: 'pending' },
        data: {
          status: 'rejected',
          approvedByAdminId: adminId,
          approvedAt: new Date(),
          adminNotes: rejectionReason,
        },
      })
      if (updated.count === 1) {
        await tx.shopRefundEvent.create({
          data: {
            refundId,
            eventType: 'rejected',
            actorType: 'admin',
            actorId: adminId,
            fromStatus: 'pending',
            toStatus: 'rejected',
            detail: rejectionReason,
          },
        })
      }
      return updated
    })
    if (result.count !== 1) {
      throw new BadRequestException('退款不存在或已处理')
    }
    return this.refundRepository.findById(refundId)
  }

  async queryProviderRefund(refundId: bigint, adminId: bigint) {
    const refund = await this.refundRepository.findAdminById(refundId)
    if (!refund) throw new NotFoundException('退款记录不存在')
    if (refund.status !== 'processing') {
      throw new BadRequestException('仅可查询处理中的退款')
    }

    let providerResult: Awaited<ReturnType<PaymentService['queryRefund']>>
    try {
      providerResult = await this.paymentService.queryRefund(refund.outRefundNo)
    } catch {
      await this.recordProviderQuery(refundId, adminId, 'UNKNOWN', '渠道查单结果未知')
      return this.refundRepository.findAdminById(refundId)
    }

    const order = refund.order
    if (
      providerResult.refundStatus === 'SUCCESS' &&
      (providerResult.outRefundNo !== refund.outRefundNo ||
        !providerResult.refundId ||
        providerResult.amountFen !== refund.requestedAmountFen ||
        providerResult.totalAmountFen !== order.paymentAmountFen)
    ) {
      await this.recordProviderQuery(
        refundId,
        adminId,
        'ABNORMAL',
        '渠道成功结果的退款单号或金额与本地记录不匹配'
      )
      return this.refundRepository.findAdminById(refundId)
    }

    await this.recordProviderQuery(
      refundId,
      adminId,
      providerResult.refundStatus || 'UNKNOWN',
      '管理员发起微信渠道退款查单'
    )

    if (providerResult.refundStatus === 'SUCCESS') {
      try {
        await this.handleRefundCallback({
          out_refund_no: refund.outRefundNo,
          refund_id: providerResult.refundId,
          refund_status: 'SUCCESS',
          amount: {
            refund: providerResult.amountFen,
            total: providerResult.totalAmountFen,
          },
        })
      } catch {
        await this.recordProviderQuery(
          refundId,
          adminId,
          'SUCCESS',
          '渠道确认退款成功，但本地账务更新失败，需人工核查'
        )
      }
    }
    return this.refundRepository.findAdminById(refundId)
  }

  private async recordProviderQuery(
    refundId: bigint,
    adminId: bigint,
    providerStatus: string,
    detail: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shopRefund.updateMany({
        where: { id: refundId, status: 'processing' },
        data: {
          lastProviderStatus: providerStatus,
          lastErrorCode: providerStatus === 'UNKNOWN' ? 'provider_query_unknown' : null,
        },
      })
      if (updated.count === 1) {
        await tx.shopRefundEvent.create({
          data: {
            refundId,
            eventType: 'provider_query',
            actorType: 'admin',
            actorId: adminId,
            fromStatus: 'processing',
            toStatus: 'processing',
            providerStatus,
            detail,
          },
        })
      }
    })
  }

  async handleRefundCallback(data: any) {
    const outRefundNo = data.out_refund_no
    const refundId = data.refund_id
    const rawStatus = data.refund_status ?? data.status
    const providerStatus = typeof rawStatus === 'string' ? rawStatus.trim().slice(0, 64) : ''
    if (!outRefundNo || !providerStatus) {
      throw new BadRequestException('退款回调数据格式错误')
    }
    const refund = await this.refundRepository.findByOutRefundNo(outRefundNo)
    if (!refund) {
      throw new NotFoundException('退款记录不存在')
    }

    if (providerStatus === 'SUCCESS') {
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
            lastProviderStatus: 'SUCCESS',
            lastErrorCode: null,
          },
        })
        if (changed.count === 0) {
          const current = await tx.shopRefund.findUnique({ where: { id: refund.id } })
          if (current?.status === 'success' && current.wechatRefundId === refundId) return
          throw new BadRequestException('退款记录状态异常')
        }
        await tx.shopRefundEvent.create({
          data: {
            refundId: refund.id,
            eventType: 'provider_notification',
            actorType: 'wechat',
            fromStatus: 'processing',
            toStatus: 'success',
            providerStatus: 'SUCCESS',
            detail: '收到已验签解密的退款成功通知',
          },
        })

        const order = await tx.shopOrder.findUnique({
          where: { id: refund.orderId },
          include: { items: true },
        })
        if (!order) {
          throw new NotFoundException('订单不存在')
        }
        if (
          (data.amount?.refund !== undefined &&
            data.amount.refund !== refund.requestedAmountFen) ||
          (data.amount?.total !== undefined &&
            data.amount.total !== order.paymentAmountFen) ||
          (data.amount?.currency !== undefined && data.amount.currency !== 'CNY')
        ) {
          throw new BadRequestException('微信退款通知金额与订单不匹配')
        }
        if (
          refund.requestedAmountFen !== order.paymentAmountFen - order.refundedAmountFen ||
          order.fulfillmentStatus !== 'pending'
        ) {
          throw new BadRequestException('退款金额或履约状态异常，需人工核查')
        }
        for (const item of order.items) {
          const updated = await tx.shopProductSku.updateMany({
            where: { id: item.skuId, soldStock: { gte: item.quantity } },
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

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.shopRefund.updateMany({
        where: { id: refund.id, status: 'processing' },
        data: { lastProviderStatus: providerStatus },
      })
      if (changed.count === 1) {
        await tx.shopRefundEvent.create({
          data: {
            refundId: refund.id,
            eventType: 'provider_notification',
            actorType: 'wechat',
            fromStatus: 'processing',
            toStatus: 'processing',
            providerStatus,
            detail: '收到渠道状态通知；最终处理前须核对渠道状态',
          },
        })
      }
    })
    if (providerStatus === 'CLOSED' || providerStatus === 'ABNORMAL') {
      return { message: 'refund status requires provider query' }
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
