import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import {
  WechatLoginDto,
  WechatPhoneDto,
  RegisterDto,
  RefreshTokenDto,
} from './dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 微信登录/检测新老用户
  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto)
  }

  // 获取微信手机号（code 模式）
  @Post('wechat-phone')
  async wechatPhone(@Body() dto: WechatPhoneDto) {
    return this.authService.wechatPhone(dto)
  }

  // 完善信息完成注册（不传 phone，后端从 tempToken 读）
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  // 刷新 Token
  @Post('refresh-token')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }

  // 获取 RSA 公钥
  @Get('rsa-public-key')
  async getRsaPublicKey() {
    return this.authService.getRsaPublicKey()
  }

  // 退出登录
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: { userId: string; jti: string }) {
    return this.authService.logout(user.userId, user.jti)
  }
}
