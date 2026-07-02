import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

interface AdminJwtPayload {
  adminId: string
  username: string
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    })
  }

  async validate(payload: AdminJwtPayload): Promise<{ adminId: string; username: string }> {
    if (!payload.adminId) throw new UnauthorizedException()
    return { adminId: payload.adminId, username: payload.username }
  }
}
