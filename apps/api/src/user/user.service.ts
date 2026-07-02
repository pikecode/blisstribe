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
        ...(dto.birthday !== undefined && {
          birthday: dto.birthday ? new Date(dto.birthday) : null,
        }),
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
    status: number
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
      status: user.status === 1 ? 'active' : user.status === 0 ? 'disabled' : 'pending',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}
