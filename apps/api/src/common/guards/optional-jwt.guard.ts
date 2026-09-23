import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    try {
      // 尝试从 Authorization header 提取 token
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        request.user = null
        return true
      }

      const token = authHeader.substring(7)
      const payload = await this.jwtService.verifyAsync(token)
      request.user = payload
    } catch {
      // 认证失败时，设置 user 为 null，但仍然允许请求继续
      request.user = null
    }

    return true
  }
}
