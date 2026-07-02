import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode } from '@blisstribe/shared'
import { randomBytes } from 'crypto'

@Injectable()
export class InvitationService {
  constructor(private readonly prisma: PrismaService) {}

  // 生成6位随机邀请码
  generateInviteCode(): string {
    return randomBytes(3).toString('hex').toUpperCase().slice(0, 6)
  }

  // 为用户生成唯一邀请码
  async createInviteCode(userId: bigint): Promise<string> {
    let code = this.generateInviteCode()
    let attempts = 0
    while (attempts < 10) {
      const exist = await this.prisma.user.findUnique({ where: { inviteCode: code } })
      if (!exist) break
      code = this.generateInviteCode()
      attempts++
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { inviteCode: code },
    })

    return code
  }

  // 获取我的邀请码（没有则生成）
  async getMyCode(userId: bigint): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    })
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND)

    if (user.inviteCode) return user.inviteCode

    return this.createInviteCode(userId)
  }

  // 使用邀请码入会
  async useInviteCode(userId: bigint, code: string): Promise<void> {
    const inviter = await this.prisma.user.findUnique({
      where: { inviteCode: code },
    })
    if (!inviter) throw new BusinessException(ErrorCode.PARAMS_INVALID, '邀请码无效')
    if (inviter.id === userId) throw new BusinessException(ErrorCode.PARAMS_INVALID, '不能使用自己的邀请码')

    // 更新被邀请人
    await this.prisma.user.update({
      where: { id: userId },
      data: { invitedBy: inviter.id },
    })

    // 创建邀请记录
    await this.prisma.memberInvitation.create({
      data: {
        inviterId: inviter.id,
        inviteeId: userId,
        inviteCode: code,
        status: 2, // 已入会
      },
    })
  }

  // 获取我的邀请记录
  async getMyInvitations(userId: bigint): Promise<{
    inviteCode: string
    totalInvited: number
    invitees: Array<{
      id: number
      nickname: string
      avatar: string
      createdAt: string
    }>
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inviteCode: true },
    })
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND)

    const records = await this.prisma.memberInvitation.findMany({
      where: { inviterId: userId, status: 2 },
      include: {
        invitee: {
          select: { id: true, nickname: true, avatar: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      inviteCode: user.inviteCode || '',
      totalInvited: records.length,
      invitees: records.map((r) => ({
        id: Number(r.invitee!.id),
        nickname: r.invitee!.nickname,
        avatar: r.invitee!.avatar,
        createdAt: r.invitee!.createdAt.toISOString(),
      })),
    }
  }

  // 后台：获取邀请统计
  async getStats(): Promise<{
    totalInviters: number
    totalInvitees: number
    topInviters: Array<{
      id: number
      nickname: string
      inviteCount: number
    }>
  }> {
    const [totalInvitersResult, totalInviteesResult, topInviters] = await Promise.all([
      this.prisma.memberInvitation.groupBy({
        by: ['inviterId'],
        _count: { inviterId: true },
      }),
      this.prisma.memberInvitation.count({ where: { status: 2 } }),
      this.prisma.memberInvitation.groupBy({
        by: ['inviterId'],
        _count: { inviteeId: true },
        where: { status: 2 },
        orderBy: { _count: { inviteeId: 'desc' } },
        take: 10,
      }),
    ])

    const inviterIds = topInviters.map((t) => t.inviterId)
    const users = await this.prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, nickname: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u.nickname]))

    return {
      totalInviters: totalInvitersResult.length,
      totalInvitees: totalInviteesResult,
      topInviters: topInviters.map((t) => ({
        id: Number(t.inviterId),
        nickname: userMap.get(t.inviterId) || '',
        inviteCount: t._count.inviteeId,
      })),
    }
  }

  // 后台：获取邀请记录列表
  async getRecords(params: {
    page: number
    pageSize: number
    keyword?: string
  }): Promise<{
    list: Array<{
      id: number
      inviterNickname: string
      inviteeNickname: string
      inviteCode: string
      status: number
      createdAt: string
    }>
    total: number
  }> {
    const where: Record<string, unknown> = {}
    if (params.keyword) {
      const users = await this.prisma.user.findMany({
        where: { nickname: { contains: params.keyword } },
        select: { id: true },
      })
      const userIds = users.map((u) => u.id)
      where.OR = [
        { inviterId: { in: userIds } },
        { inviteeId: { in: userIds } },
      ]
    }

    const [records, total] = await Promise.all([
      this.prisma.memberInvitation.findMany({
        where,
        include: {
          inviter: { select: { nickname: true } },
          invitee: { select: { nickname: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.memberInvitation.count({ where }),
    ])

    return {
      list: records.map((r) => ({
        id: Number(r.id),
        inviterNickname: r.inviter.nickname,
        inviteeNickname: r.invitee?.nickname || '待注册',
        inviteCode: r.inviteCode,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    }
  }
}
