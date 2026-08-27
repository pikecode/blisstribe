import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false
  ): TUser | null {
    if (err || !user) return null
    return user as TUser
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }
}
