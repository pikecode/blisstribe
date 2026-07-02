import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../common/prisma.service'
import { RedisService } from '../common/redis.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode, type User } from '@blisstribe/shared'
import type { WechatLoginDto, WechatPhoneDto, RegisterDto } from './dto'
import { InvitationService } from '../invitation/invitation.service'
import { randomUUID, createHmac } from 'crypto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly invitationService: InvitationService,
  ) {}

  // 微信登录：code 换 openid，判断新老用户
  async wechatLogin(dto: WechatLoginDto): Promise<unknown> {
    const session = await this.code2session(dto.code)
    const openIdHash = this.hmac(session.openid)

    // 查微信账号
    const wxAccount = await this.prisma.wechatAccount.findUnique({
      where: { wxOpenIdHash: openIdHash },
      include: { user: true },
    })

    if (wxAccount?.user && wxAccount.user.status === 1) {
      // 老用户：直接登录
      const tokens = await this.issueTokens(BigInt(wxAccount.userId), 'wechat-mp')
      await this.updateLastLogin(wxAccount.userId)
      return {
        isNewUser: false,
        ...tokens,
        userInfo: this.toUserVO(wxAccount.user),
      }
    }

    // 新用户：创建临时注册态
    const tempToken = `temp_${randomUUID()}`
    await this.prisma.userRegisterTemp.create({
      data: {
        tempToken,
        wxOpenIdHash: openIdHash,
        wxUnionId: session.unionid,
        wxNickname: dto.userInfo?.nickName,
        wxAvatar: dto.userInfo?.avatarUrl,
        wxGender: dto.userInfo?.gender ?? 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    return {
      isNewUser: true,
      tempToken,
      wxUserInfo: dto.userInfo
        ? {
            nickName: dto.userInfo.nickName,
            avatarUrl: dto.userInfo.avatarUrl,
            gender: dto.userInfo.gender,
          }
        : undefined,
    }
  }

  // 获取微信手机号（code 模式）
  async wechatPhone(dto: WechatPhoneDto): Promise<{ phone: string; phoneEncrypted: string }> {
    const temp = await this.prisma.userRegisterTemp.findUnique({
      where: { tempToken: dto.tempToken },
    })
    if (!temp || temp.expiresAt < new Date()) {
      throw new BusinessException(ErrorCode.TEMP_TOKEN_INVALID)
    }

    // 调用微信 getPhoneNumber 接口换取手机号
    const phone = await this.getPhoneByCode(dto.code)
    const phoneHash = this.hmac(phone)
    const phoneMasked = this.maskPhone(phone)

    // 唯一性检查
    const exist = await this.prisma.user.findUnique({ where: { phoneHash } })
    if (exist) throw new BusinessException(ErrorCode.PHONE_ALREADY_REGISTERED)

    // 写入临时态
    await this.prisma.userRegisterTemp.update({
      where: { tempToken: dto.tempToken },
      data: {
        phoneCiphertext: Buffer.from(this.aesEncrypt(phone)),
        phoneHash,
        phoneMasked,
      },
    })

    return { phone, phoneEncrypted: phoneMasked }
  }

  // 完善信息完成注册（phone 从临时态读，不接收客户端传入）
  async register(dto: RegisterDto): Promise<{ token: string; refreshToken: string; userInfo: User }> {
    const temp = await this.prisma.userRegisterTemp.findUnique({
      where: { tempToken: dto.tempToken },
    })
    if (!temp || temp.expiresAt < new Date()) {
      throw new BusinessException(ErrorCode.TEMP_TOKEN_INVALID)
    }
    if (!temp.phoneHash) throw new BusinessException(ErrorCode.GET_PHONE_FAILED)
    if (!dto.agreement) throw new BusinessException(ErrorCode.AGREEMENT_NOT_ACCEPTED)

    // 昵称校验
    const name = dto.nickname.trim()
    if (name.length < 2 || name.length > 20) {
      throw new BusinessException(ErrorCode.NICKNAME_FORMAT_ERROR)
    }

    // 创建用户 + 微信账号
    const inviteCode = this.invitationService.generateInviteCode()
    const user = await this.prisma.user.create({
      data: {
        phoneCiphertext: temp.phoneCiphertext ?? Buffer.alloc(0),
        phoneHash: temp.phoneHash,
        phoneMasked: temp.phoneMasked ?? '',
        nickname: name,
        avatar: dto.avatar,
        gender: dto.gender,
        birthday: dto.birthday ? new Date(dto.birthday) : null,
        realName: dto.realName,
        wechatId: dto.wechatId,
        email: dto.email,
        age: dto.age,
        favoriteColor: dto.favoriteColor,
        occupation: dto.occupation,
        tags: dto.tags ?? [],
        identity: dto.identity,
        status: 1,
        inviteCode,
        wechatAccount: {
          create: {
            wxOpenIdHash: temp.wxOpenIdHash ?? '',
            wxUnionId: temp.wxUnionId,
            wxNickname: temp.wxNickname,
            wxAvatar: temp.wxAvatar,
            wxGender: temp.wxGender,
          },
        },
        agreements: {
          create: [
            {
              agreementType: 'user',
              agreementVersion: '1.0',
              agreedAt: new Date(),
            },
            {
              agreementType: 'privacy',
              agreementVersion: '1.0',
              agreedAt: new Date(),
            },
          ],
        },
      },
    })

    // 清理临时态
    await this.prisma.userRegisterTemp.delete({ where: { tempToken: dto.tempToken } })

    const tokens = await this.issueTokens(user.id, 'wechat-mp')
    return {
      ...tokens,
      userInfo: this.toUserVO(user),
    }
  }

  // 刷新 Token
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string; expiresIn: number }> {
    let payload: { userId: string; jti: string }
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED)
    }

    // 校验会话是否仍有效
    const session = await this.prisma.userSession.findUnique({ where: { jti: payload.jti } })
    if (!session || session.status !== 1 || session.refreshExpiresAt < new Date()) {
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED)
    }

    // 校验 refreshToken 哈希
    const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash)
    if (!valid) throw new BusinessException(ErrorCode.TOKEN_INVALID)

    // 旧会话失效，签发新对
    await this.prisma.userSession.update({
      where: { jti: payload.jti },
      data: { status: 0 },
    })
    const tokens = await this.issueTokens(BigInt(payload.userId), session.platform ?? 'wechat-mp')
    const expiresIn = this.parseDurationToSeconds(this.config.get<string>('ACCESS_TOKEN_EXPIRES', '2h'))
    return { ...tokens, expiresIn }
  }

  async getRsaPublicKey(): Promise<{ publicKey: string; keyId: string }> {
    return {
      publicKey: this.config.get<string>('RSA_PUBLIC_KEY') || '',
      keyId: 'default',
    }
  }

  async logout(userId: string, jti: string): Promise<void> {
    // 会话失效 + Redis 黑名单兜底
    await this.prisma.userSession.update({
      where: { jti },
      data: { status: 0 },
    })
    const ttl = this.config.get<string>('ACCESS_TOKEN_EXPIRES', '2h')
    const seconds = this.parseDurationToSeconds(ttl)
    await this.redis.set(`auth:blacklist:${jti}`, '1', seconds)
    this.logger.log(`user ${userId} logout, jti=${jti}`)
  }

  // 签发 Access + Refresh Token
  private async issueTokens(userId: bigint, platform: string): Promise<{ token: string; refreshToken: string }> {
    const jti = randomUUID()
    const access = this.jwt.sign({ userId: userId.toString(), jti, platform })
    const refresh = this.jwt.sign(
      { userId: userId.toString(), jti },
      { secret: this.config.get<string>('JWT_REFRESH_SECRET'), expiresIn: this.config.get<string>('REFRESH_TOKEN_EXPIRES', '7d') }
    )

    const refreshHash = await bcrypt.hash(refresh, 10)
    const refreshTtl = this.parseDurationToSeconds(this.config.get<string>('REFRESH_TOKEN_EXPIRES', '7d'))
    const accessTtl = this.parseDurationToSeconds(this.config.get<string>('ACCESS_TOKEN_EXPIRES', '2h'))
    await this.prisma.userSession.create({
      data: {
        userId: BigInt(userId.toString()),
        jti,
        refreshTokenHash: refreshHash,
        expiresAt: new Date(Date.now() + accessTtl * 1000),
        refreshExpiresAt: new Date(Date.now() + refreshTtl * 1000),
        platform,
      },
    })

    return { token: access, refreshToken: refresh }
  }

  // 调用微信 code2session
  private async code2session(code: string): Promise<{ openid: string; session_key: string; unionid?: string }> {
    const appId = this.config.get<string>('WX_APP_ID')
    const secret = this.config.get<string>('WX_APP_SECRET')
    if (!appId || !secret) throw new BusinessException(ErrorCode.WECHAT_SERVICE_ERROR)

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    const res = await fetch(url)
    const data = (await res.json()) as { openid?: string; session_key?: string; unionid?: string; errmsg?: string }
    if (!data.openid) {
      this.logger.error(`code2session failed: ${data.errmsg}`)
      throw new BusinessException(ErrorCode.WECHAT_AUTH_FAILED)
    }
    return data as { openid: string; session_key: string; unionid?: string }
  }

  // 调用微信 getPhoneNumber
  private async getPhoneByCode(code: string): Promise<string> {
    const token = await this.getWxAccessToken()
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = (await res.json()) as { phone_info?: { phoneNumber?: string }; errmsg?: string }
    if (!data.phone_info?.phoneNumber) {
      this.logger.error(`getPhoneNumber failed: ${data.errmsg}`)
      throw new BusinessException(ErrorCode.GET_PHONE_FAILED)
    }
    return data.phone_info.phoneNumber
  }

  private async getWxAccessToken(): Promise<string> {
    const cached = await this.redis.get('wx:access_token')
    if (cached) return cached
    const appId = this.config.get<string>('WX_APP_ID')!
    const secret = this.config.get<string>('WX_APP_SECRET')!
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`
    const res = await fetch(url)
    const data = (await res.json()) as { access_token?: string; expires_in?: number; errmsg?: string }
    if (!data.access_token) throw new BusinessException(ErrorCode.WECHAT_SERVICE_ERROR)
    await this.redis.set('wx:access_token', data.access_token, (data.expires_in ?? 7200) - 300)
    return data.access_token
  }

  private async updateLastLogin(userId: bigint): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
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

  private hmac(input: string): string {
    // 简化：生产用独立 HMAC 密钥
    const secret = this.config.get<string>('JWT_ACCESS_SECRET')!
    return createHmac('sha256', secret).update(input).digest('hex')
  }

  private aesEncrypt(phone: string): string {
    // 简化占位：生产用 AES-256-GCM + KMS 主密钥
    return phone
  }

  private maskPhone(phone: string): string {
    if (phone.length < 7) return phone
    return phone.slice(0, 3) + '****' + phone.slice(-4)
  }

  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/)
    if (!match) return 7200
    const num = Number(match[1])
    const unit = match[2]
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
    return num * map[unit]
  }
}
