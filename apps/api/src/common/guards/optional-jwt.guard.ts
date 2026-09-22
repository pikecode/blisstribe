import { AuthGuard } from '@nestjs/passport'

export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false
  ): TUser | null {
    if (err || !user) return null
    return user as TUser
  }
}
