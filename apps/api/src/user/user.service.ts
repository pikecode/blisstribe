import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../common/prisma.service'
import { UploadService } from '../upload/upload.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode, type User } from '@blisstribe/shared'
import type { UpdateUserDto, SetPasswordDto } from './dto'

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async getInfo(userId: string): Promise<User> {
    const user = await this.findUserOrThrow(userId)
    return this.toUserVO(user)
  }

  async updateInfo(userId: string, dto: UpdateUserDto): Promise<User> {
    const current = await this.findUserOrThrow(userId)
    const tagSnapshot = dto.tags !== undefined || dto.tagIds !== undefined
      ? await this.normalizeUserTags(dto.tagIds, dto.tags ?? [])
      : undefined
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
        ...(tagSnapshot !== undefined && { tags: tagSnapshot.names, tagIds: tagSnapshot.ids }),
        ...(dto.identity !== undefined && { identity: dto.identity }),
        ...(dto.douyinPayCode !== undefined && { douyinPayCode: dto.douyinPayCode }),
      },
    })
    if (dto.avatar !== undefined && dto.avatar !== current.avatar) {
      this.uploadService.deleteFile(current.avatar)
    }
    return this.toUserVO(user)
  }

  private async normalizeUserTags(tagIds: number[] | undefined, tags: string[] = []) {
    const ids = this.cleanTagIds(tagIds ?? [])
    const names = this.cleanTags(tags)
    if (!ids.length && !names.length) return { ids: [], names: [] }
    const rows = await this.prisma.tagDictionary.findMany({
      where: {
        deletedAt: null,
        status: 1,
        OR: [
          ...(ids.length ? [{ id: { in: ids } }] : []),
          ...(names.length ? [{ name: { in: names } }] : []),
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    return {
      ids: this.cleanTagIds(rows.map((item) => item.id)),
      names: this.cleanTags(rows.map((item) => item.name)),
    }
  }

  private cleanTags(tags: string[]) {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20)
  }

  private cleanTagIds(tagIds: Array<number | bigint>) {
    const ids = tagIds
      .map((tagId) => BigInt(tagId))
      .filter((tagId) => tagId > 0n)
    return Array.from(new Map(ids.map((tagId) => [String(tagId), tagId])).values()).slice(0, 20)
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
    const deletedAt = new Date()
    const tombstone = `deleted_${userId}_${deletedAt.getTime()}`
    const wxTombstone = `deleted_wx_${userId}_${deletedAt.getTime()}`
    await this.prisma.$transaction([
      // 注销采用软删除和关键标识墓碑化，既保留业务审计关系，又释放手机号/微信重新注册能力。
      this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: {
          deletedAt,
          status: 0,
          phoneCiphertext: Buffer.alloc(0),
          phoneHash: tombstone,
          phoneMasked: '已注销',
          nickname: '已注销用户',
          avatar: '',
          birthday: null,
          passwordHash: null,
          realName: null,
          wechatId: null,
          email: null,
          age: null,
          favoriteColor: null,
          occupation: null,
          tags: [],
          tagIds: [],
          identity: null,
          douyinPayCode: null,
        },
      }),
      // 解绑微信账号，避免同一个微信身份后续仍命中旧账号。
      this.prisma.wechatAccount.updateMany({
        where: { userId: BigInt(userId) },
        data: {
          wxOpenIdHash: wxTombstone,
          wxUnionId: null,
          wxNickname: null,
          wxAvatar: null,
          wxGender: 0,
          wxCountry: null,
          wxProvince: null,
          wxCity: null,
          status: 0,
        },
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
    tagIds?: bigint[]
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
      tagIds: user.tagIds?.map(Number) ?? [],
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
