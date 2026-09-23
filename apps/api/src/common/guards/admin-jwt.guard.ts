import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ErrorCode } from '@blisstribe/shared'
import { BusinessException } from '../interceptors/response.interceptor'

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    try {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        throw new BusinessException(ErrorCode.NOT_LOGIN)
      }

      const token = authHeader.substring(7)
      const payload = await this.jwtService.verifyAsync(token)

      // 检查是否是管理员
      if (!payload.isAdmin) {
        throw new BusinessException(ErrorCode.NOT_LOGIN)
      }

      request.user = payload
      return true
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error
      }
      throw new BusinessException(ErrorCode.NOT_LOGIN)
    }
  }
}
