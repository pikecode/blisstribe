import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  RawBodyRequest,
  HttpCode,
  SetMetadata,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { PaymentService } from './payment.service'
import { WechatPayService } from './wechat-pay.service'
import { AuthService } from '../../auth/auth.service'
import { CreateShopPaymentDto } from '../dto/payment.dto'

@Controller('shop')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private wechatPayService: WechatPayService,
    private authService: AuthService
  ) {}

  @Post('orders/:id/payment')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Param('id') id: string,
    @Body() dto: CreateShopPaymentDto,
    @Req() req: Request
  ) {
    const orderId = BigInt(id)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1'
    const userId = BigInt((req as Request & { user: { userId: string } }).user.userId)
    const openId = this.wechatPayService.isMockPaymentEnabled()
      ? 'mock-openid'
      : await this.authService.getWechatOpenIdForPayment(userId, dto.code)
    return this.paymentService.createPayment(orderId, userId, clientIp, openId)
  }
}

@Controller('shop/webhooks')
@SetMetadata('skipResponseEnvelope', true)
export class PaymentWebhookController {
  constructor(
    private paymentService: PaymentService,
    private wechatPayService: WechatPayService
  ) {}

  @Post('wechat-pay')
  @HttpCode(200)
  async handleWechatPayNotify(
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>
  ): Promise<{ code: string; message?: string }> {
    try {
      // Get headers
      const headers = {
        'wechat-pay-timestamp': req.get('wechat-pay-timestamp') || '',
        'wechat-pay-nonce': req.get('wechat-pay-nonce') || '',
        'wechat-pay-signature': req.get('wechat-pay-signature') || '',
        'wechat-pay-serial': req.get('wechatpay-serial') || '',
      }

      const rawBody = req.rawBody?.toString('utf-8')
      if (!rawBody) throw new Error('缺少微信支付回调原始请求体')

      // Verify signature via wechatPay.verifyNotifySignature()
      const isValid = this.wechatPayService.verifyNotifySignature(rawBody, headers)

      if (!isValid) {
        return {
          code: 'INVALID_REQUEST_SIGNATURE',
          message: '签名验证失败',
        }
      }

      // Decrypt data via wechatPay.decryptNotify()
      const decryptedData = await this.wechatPayService.decryptNotify(body.resource)
      this.wechatPayService.validatePaymentNotification(decryptedData)

      // Call paymentService.handleWechatNotify(decryptedData)
      await this.paymentService.handleWechatNotify(decryptedData)

      // Return success
      return { code: 'SUCCESS' }
    } catch (error) {
      return {
          code: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
