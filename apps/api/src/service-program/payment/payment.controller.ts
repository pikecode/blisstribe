import { serviceId } from '../service-id'
import {
  Body,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Param,
  Post,
  RawBodyRequest,
  Req,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from '../../auth/auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { WechatPayService } from '../../payment-channel/wechat-pay.service'
import { CreateServicePaymentDto } from '../dto/payment.dto'
import { ServicePaymentService } from './payment.service'

@Controller('service-orders')
export class ServicePaymentController {
  constructor(
    private readonly service: ServicePaymentService,
    private readonly wechatPay: WechatPayService,
    private readonly authService: AuthService
  ) {}

  @Post(':id/payment')
  @UseGuards(JwtAuthGuard)
  async create(@Param('id') id: string, @Body() dto: CreateServicePaymentDto, @Req() req: Request) {
    const userId = serviceId((req as Request & { user: { userId: string } }).user.userId)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1'
    const openId = this.wechatPay.isMockPaymentEnabled()
      ? 'mock-openid'
      : await this.authService.getWechatOpenIdForPayment(userId, dto.code)
    return this.service.createPayment(serviceId(id), userId, clientIp, openId)
  }

  @Post(':id/payment/query')
  @UseGuards(JwtAuthGuard)
  query(@Param('id') id: string, @Req() req: Request) {
    const userId = serviceId((req as Request & { user: { userId: string } }).user.userId)
    return this.service.confirmPayment(serviceId(id), userId)
  }
}

@Controller('service-program/webhooks')
@SetMetadata('skipResponseEnvelope', true)
export class ServicePaymentWebhookController {
  constructor(
    private readonly service: ServicePaymentService,
    private readonly wechatPay: WechatPayService
  ) {}

  @Post('wechat-pay')
  @HttpCode(200)
  async notify(@Body() body: any, @Req() req: RawBodyRequest<Request>): Promise<{ code: string }> {
    try {
      const rawBody = req.rawBody?.toString('utf8')
      if (!rawBody) throw new UnauthorizedException('缺少微信支付通知原文')
      const headers = {
        'wechat-pay-timestamp': req.get('wechatpay-timestamp') || '',
        'wechat-pay-nonce': req.get('wechatpay-nonce') || '',
        'wechat-pay-signature': req.get('wechatpay-signature') || '',
        'wechat-pay-serial': req.get('wechatpay-serial') || '',
      }
      if (!this.wechatPay.verifyNotifySignature(rawBody, headers)) throw new UnauthorizedException('微信支付通知签名无效')
      const data = await this.wechatPay.decryptNotify(body.resource)
      this.wechatPay.validatePaymentNotification(data)
      await this.service.handleWechatNotify(data)
      return { code: 'SUCCESS' }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new InternalServerErrorException('微信支付通知处理失败，请重试')
    }
  }
}
