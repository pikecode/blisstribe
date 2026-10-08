import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'

const CHANNEL_RESULTS = new Set([
  'paid',
  'refunded',
  'closed',
  'not_found',
  'unknown',
])

@Injectable()
export class PaymentExceptionService {
  constructor(private prisma: PrismaService) {}

  async list(page = 1, pageSize = 20, status?: string) {
    const safePage = Math.max(1, Math.floor(page) || 1)
    const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize) || 20))
    const where = status ? { status } : {}
    const [list, total] = await this.prisma.$transaction([
      this.prisma.shopPaymentException.findMany({
        where,
        include: {
          order: { select: { orderNo: true, status: true, paymentStatus: true } },
          reviews: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      this.prisma.shopPaymentException.count({ where }),
    ])
    return { list, total, page: safePage, pageSize: safePageSize }
  }

  async review(
    id: bigint,
    adminId: bigint,
    input: { channelCheckResult: string; resolutionNote: string }
  ) {
    if (!CHANNEL_RESULTS.has(input.channelCheckResult)) {
      throw new BadRequestException('渠道核查结果无效')
    }
    const resolutionNote = input.resolutionNote?.trim()
    if (!resolutionNote || resolutionNote.length > 2000) {
      throw new BadRequestException('核查说明必填且不能超过 2000 个字符')
    }
    const exists = await this.prisma.shopPaymentException.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new NotFoundException('支付异常记录不存在')

    return this.prisma.shopPaymentExceptionReview.create({
      data: {
        paymentExceptionId: id,
        channelCheckResult: input.channelCheckResult,
        resolutionNote,
        reviewedByAdminId: adminId,
      },
    })
  }
}
