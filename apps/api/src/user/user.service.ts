import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode, type User } from '@blisstribe/shared'
import type { UpdateUserDto, SetPasswordDto } from './dto'

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getInfo(userId: string): Promise<User> {
    const user = await this.findUserOrThrow(userId)
    return this.toUserVO(user)
  }

  async updateInfo(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname.trim() }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.birthday !== undefined && { birthday: dto.birthday ? new Date(dto.birthday) : null }),
        ...(dto.realName !== undefined && { realName: dto.realName }),
        ...(dto.wechatId !== undefined && { wechatId: dto.wechatId }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.age !== undefined && { age: dto.age }),
        ...(dto.favoriteColor !== undefined && { favoriteColor: dto.favoriteColor }),
        ...(dto.occupation !== undefined && { occupation: dto.occupation }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.identity !== undefined && { identity: dto.identity }),
        ...(dto.douyinPayCode !== undefined && { douyinPayCode: dto.douyinPayCode }),
      },
    })
    return this.toUserVO(user)
  }

  async setPassword(userId: string, dto: SetPasswordDto): Promise<void> {
    if (dto.password !== dto.confirmPassword) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID)
    }
    // TODO: 用 RSA 私钥解密 dto.password，再 bcrypt 哈希
    const passwordHash = await bcrypt.hash(dto.password, 12)
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { passwordHash },
    })
  }

  async deactivateAccount(userId: string): Promise<void> {
    await this.findUserOrThrow(userId)
    const tombstone = `deleted_${userId}_${Date.now()}`
    await this.prisma.$transaction([
      // 软删除用户，墓碑化手机 hash 使同一手机可重新注册
      this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: {
          deletedAt: new Date(),
          status: 0,
          phoneHash: tombstone,
          phoneMasked: '***',
        },
      }),
      // 解绑微信账号（墓碑化 openId hash）
      this.prisma.wechatAccount.updateMany({
        where: { userId: BigInt(userId) },
        data: { wxOpenIdHash: tombstone, status: 0 },
      }),
      // 作废所有 session
      this.prisma.userSession.updateMany({
        where: { userId: BigInt(userId) },
        data: { status: 0 },
      }),
    ])
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    })
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND)
    return user
  }

  private toUserVO(user: {
    id: bigint
    phoneMasked: string
    nickname: string
    avatar: string
    gender: number
    birthday?: Date | null
    realName?: string | null
    wechatId?: string | null
    email?: string | null
    age?: number | null
    favoriteColor?: string | null
    occupation?: string | null
    tags: string[]
    identity?: string | null
    level: string
    douyinPayCode?: string | null
    status: number
    inviteCode?: string | null
    createdAt: Date
    updatedAt: Date
  }): User {
    return {
      id: Number(user.id),
      phone: user.phoneMasked,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender as 0 | 1 | 2,
      birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : undefined,
      realName: user.realName ?? undefined,
      wechatId: user.wechatId ?? undefined,
      email: user.email ?? undefined,
      age: user.age ?? undefined,
      favoriteColor: user.favoriteColor ?? undefined,
      occupation: user.occupation ?? undefined,
      tags: user.tags,
      identity: (user.identity ?? undefined) as User['identity'],
      level: (user.level || 'normal') as User['level'],
      douyinPayCode: user.douyinPayCode ?? undefined,
      status: user.status === 1 ? 'active' : user.status === 0 ? 'disabled' : 'pending',
      inviteCode: user.inviteCode ?? undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}
