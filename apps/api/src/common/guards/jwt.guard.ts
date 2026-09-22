import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { ErrorCode } from '@blisstribe/shared'
import { BusinessException } from '../interceptors/response.interceptor'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest()

    try {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        throw new BusinessException(ErrorCode.NOT_LOGIN)
      }

      const token = authHeader.substring(7)
      const payload = await this.jwtService.verifyAsync(token)
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
