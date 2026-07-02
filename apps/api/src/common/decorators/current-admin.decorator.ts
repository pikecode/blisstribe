import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentAdmin = createParamDecorator(
  (data: keyof { adminId: string; username: string } | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const admin = request.user as { adminId: string; username: string }
    return data ? admin?.[data] : admin
  }
)
