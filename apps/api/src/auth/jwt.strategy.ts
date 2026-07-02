import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../common/prisma.service'
import { RedisService } from '../common/redis.service'
import { ErrorCode } from '@blisstribe/shared'
import { BusinessException } from '../common/interceptors/response.interceptor'

interface JwtPayload {
  userId: string
  jti: string
  platform?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    })
  }

  async validate(payload: JwtPayload): Promise<{ userId: string; jti: string }> {
    // 黑名单校验
    const blacklisted = await this.redis.get(`auth:blacklist:${payload.jti}`)
    if (blacklisted) {
      throw new BusinessException(ErrorCode.TOKEN_INVALID)
    }

    // 会话有效性校验
    const session = await this.prisma.userSession.findUnique({
      where: { jti: payload.jti },
    })
    if (!session || session.status !== 1 || session.expiresAt < new Date()) {
      throw new UnauthorizedException()
    }

    return { userId: payload.userId, jti: payload.jti }
  }
}
