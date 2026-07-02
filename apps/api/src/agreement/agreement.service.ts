import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode } from '@blisstribe/shared'

@Injectable()
export class AgreementService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(type: string) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { type, isCurrent: true },
    })
    if (!agreement) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND)
    return {
      id: Number(agreement.id),
      type: agreement.type,
      version: agreement.version,
      title: agreement.title,
      content: agreement.content,
      effectiveAt: agreement.effectiveAt.toISOString(),
    }
  }

  async list(page: number, pageSize: number, type?: string) {
    const where = type ? { type } : undefined
    const [list, total] = await Promise.all([
      this.prisma.agreement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.agreement.count({ where }),
    ])
    return {
      list: list.map((a) => ({
        id: Number(a.id),
        type: a.type,
        version: a.version,
        title: a.title,
        isCurrent: a.isCurrent,
        effectiveAt: a.effectiveAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }

  async create(body: { type: string; version: string; title: string; content: string }) {
    return this.prisma.agreement.create({
      data: {
        type: body.type,
        version: body.version,
        title: body.title,
        content: body.content,
        isCurrent: false,
        effectiveAt: new Date(),
      },
    })
  }

  async setCurrent(id: string) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id: BigInt(id) } })
    if (!agreement) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND)

    // 事务：同类型其他版本取消当前，当前版本设为 current
    await this.prisma.$transaction([
      this.prisma.agreement.updateMany({
        where: { type: agreement.type, isCurrent: true },
        data: { isCurrent: false },
      }),
      this.prisma.agreement.update({
        where: { id: BigInt(id) },
        data: { isCurrent: true },
      }),
    ])
    return { id: Number(id), isCurrent: true }
  }
}
