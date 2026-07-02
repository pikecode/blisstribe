import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ErrorCode } from '@blisstribe/shared'
import { BusinessException } from '../interceptors/response.interceptor'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false
  ): TUser {
    if (err || !user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN)
    }
    return user as TUser
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }
}
