import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (data: keyof { userId: string; jti: string } | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as { userId: string; jti: string }
    return data ? user?.[data] : user
  }
)
