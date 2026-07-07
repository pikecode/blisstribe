import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { createHmac } from 'crypto'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode, type User } from '@blisstribe/shared'
import type {
  AdminLoginDto,
  AdminCreateUserDto,
  AdminUpdateUserDto,
  CreateAdminDto,
  UpdateAdminDto,
  ResetPasswordDto,
} from './dto'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: AdminLoginDto): Promise<{ token: string; admin: { id: number; username: string; nickname: string } }> {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    })
    if (!admin || admin.status !== 1) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND)
    }
    const valid = await bcrypt.compare(dto.password, admin.passwordHash)
    if (!valid) throw new BusinessException(ErrorCode.PASSWORD_WRONG)

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    const token = this.jwt.sign({ adminId: admin.id.toString(), username: admin.username })
    return {
      token: `Bearer ${token}`,
      admin: {
        id: Number(admin.id),
        username: admin.username,
        nickname: admin.nickname,
      },
    }
  }

  async listUsers(page: number, pageSize: number, keyword?: string): Promise<{ list: User[]; total: number; page: number; pageSize: number }> {
    const where = keyword
      ? { nickname: { contains: keyword } }
      : undefined
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])
    return {
      list: list.map((u) => this.toUserVO(u)),
      total,
      page,
      pageSize,
    }
  }

  async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: BigInt(id) } })
    if (!user) throw new BusinessException(ErrorCode.USER_NOT_FOUND)
    return this.toUserVO(user)
  }

  async createUser(dto: AdminCreateUserDto): Promise<User> {
    const phoneHash = this.hmac(dto.phone)
    const exist = await this.prisma.user.findUnique({ where: { phoneHash } })
    if (exist) throw new BusinessException(ErrorCode.PHONE_ALREADY_REGISTERED)

    const user = await this.prisma.user.create({
      data: {
        phoneCiphertext: Buffer.from(dto.phone),
        phoneHash,
        phoneMasked: this.maskPhone(dto.phone),
        nickname: dto.nickname,
        avatar: dto.avatar ?? '',
        gender: dto.gender ?? 0,
        status: 1,
        inviteCode: this.generateInviteCode(),
      },
    })
    return this.toUserVO(user)
  }

  async updateUser(id: string, dto: AdminUpdateUserDto): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
      },
    })
    return this.toUserVO(user)
  }

  async updateUserStatus(id: string, status: number): Promise<{ status: number }> {
    await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { status },
    })
    return { status }
  }

  async getProfile(adminId: string): Promise<{ id: number; username: string; nickname: string; avatar: string }> {
    const admin = await this.prisma.admin.findUnique({ where: { id: BigInt(adminId) } })
    if (!admin) throw new BusinessException(ErrorCode.USER_NOT_FOUND)
    return {
      id: Number(admin.id),
      username: admin.username,
      nickname: admin.nickname,
      avatar: admin.avatar,
    }
  }

  private hmac(input: string): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET')!
    return createHmac('sha256', secret).update(input).digest('hex')
  }

  private maskPhone(phone: string): string {
    if (phone.length < 7) return phone
    return phone.slice(0, 3) + '****' + phone.slice(-4)
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // ===== 管理员管理 =====

  async listAdmins(page: number, pageSize: number, keyword?: string): Promise<{
    list: { id: number; username: string; nickname: string; avatar: string; status: number; roles: { id: number; code: string; name: string }[]; lastLoginAt: string | null; createdAt: string }[]
    total: number
    page: number
    pageSize: number
  }> {
    const where = keyword ? { username: { contains: keyword } } : undefined
    const [rows, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { adminRoles: { include: { role: true } } },
      }),
      this.prisma.admin.count({ where }),
    ])
    return {
      list: rows.map((a) => ({
        id: Number(a.id),
        username: a.username,
        nickname: a.nickname,
        avatar: a.avatar,
        status: a.status,
        roles: a.adminRoles.map((ar) => ({
          id: Number(ar.role.id),
          code: ar.role.code,
          name: ar.role.name,
        })),
        lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }

  async createAdmin(dto: CreateAdminDto): Promise<{ id: number; username: string }> {
    const exist = await this.prisma.admin.findUnique({ where: { username: dto.username } })
    if (exist) throw new BusinessException(ErrorCode.PARAMS_INVALID, '用户名已存在')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const admin = await this.prisma.admin.create({
      data: {
        username: dto.username,
        passwordHash,
        nickname: dto.nickname,
        avatar: dto.avatar ?? '',
        status: 1,
        ...(dto.roleIds?.length && {
          adminRoles: {
            create: dto.roleIds.map((rid) => ({ roleId: BigInt(rid) })),
          },
        }),
      },
    })
    return { id: Number(admin.id), username: admin.username }
  }

  async updateAdmin(id: string, dto: UpdateAdminDto): Promise<{ id: number }> {
    await this.prisma.admin.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.nickname !== undefined && { nickname: dto.nickname }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      },
    })
    return { id: Number(id) }
  }

  async updateAdminStatus(id: string, status: number): Promise<{ status: number }> {
    await this.prisma.admin.update({
      where: { id: BigInt(id) },
      data: { status },
    })
    return { status }
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    const passwordHash = await bcrypt.hash(dto.password, 10)
    await this.prisma.admin.update({
      where: { id: BigInt(id) },
      data: { passwordHash },
    })
  }

  async assignRoles(id: string, roleIds: string[]): Promise<{ roleIds: number[] }> {
    // 事务：先清旧再建新
    await this.prisma.$transaction([
      this.prisma.adminRole.deleteMany({ where: { adminId: BigInt(id) } }),
      ...roleIds.map((rid) =>
        this.prisma.adminRole.create({
          data: { adminId: BigInt(id), roleId: BigInt(rid) },
        })
      ),
    ])
    return { roleIds: roleIds.map(Number) }
  }

  // ===== 角色与权限 =====

  async listRoles(): Promise<{ id: number; code: string; name: string; status: number }[]> {
    const roles = await this.prisma.role.findMany({ orderBy: { createdAt: 'asc' } })
    return roles.map((r) => ({ id: Number(r.id), code: r.code, name: r.name, status: r.status }))
  }

  async createRole(code: string, name: string): Promise<{ id: number; code: string; name: string }> {
    const role = await this.prisma.role.create({ data: { code, name, status: 1 } })
    return { id: Number(role.id), code: role.code, name: role.name }
  }

  private toUserVO(user: {
    id: bigint
    phoneMasked: string
    nickname: string
    avatar: string
    gender: number
    birthday?: Date | null
    tags: string[]
    level: string
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
      tags: user.tags,
      level: (user.level || 'normal') as User['level'],
      status: user.status === 1 ? 'active' : user.status === 0 ? 'disabled' : 'pending',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}
