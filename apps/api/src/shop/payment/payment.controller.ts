import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  RawBodyRequest,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { PaymentService } from './payment.service'
import { WechatPayService } from './wechat-pay.service'

@Controller('shop')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private wechatPayService: WechatPayService
  ) {}

  @Post('orders/:id/payment')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Param('id') id: string,
    @Req() req: Request
  ): Promise<{ prepayId: string; outTradeNo: string }> {
    const orderId = BigInt(id)
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1'
    return this.paymentService.createPayment(orderId, clientIp)
  }
}

@Controller('shop/webhooks')
export class PaymentWebhookController {
  constructor(
    private paymentService: PaymentService,
    private wechatPayService: WechatPayService
  ) {}

  @Post('wechat-pay')
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
      }

      // Get raw body for signature verification
      const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(body)

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

      // Call paymentService.handleWechatNotify(decryptedData)
      await this.paymentService.handleWechatNotify(decryptedData)

      // Return success
      return { code: 'SUCCESS' }
    } catch (error) {
      return {
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
