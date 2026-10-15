import { serviceId } from '../service-id'
import { Body, Controller, Get, HttpCode, InternalServerErrorException, Param, Post, Query, RawBodyRequest, Req, SetMetadata, UnauthorizedException, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { WechatPayService } from '../../payment-channel/wechat-pay.service'
import { CreateServiceRefundDto, ReviewServiceRefundDto } from '../dto/refund.dto'
import { ServiceRefundService } from './refund.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class ServiceRefundUserController {
  constructor(private readonly service: ServiceRefundService) {}

  @Post('service-orders/:orderId/refunds')
  create(@CurrentUser() user: { userId: string }, @Param('orderId') orderId: string, @Body() dto: CreateServiceRefundDto) { return this.service.create(serviceId(orderId), serviceId(user.userId), dto) }
  @Get('service-refunds')
  list(@CurrentUser() user: { userId: string }) { return this.service.listMine(serviceId(user.userId)) }
  @Get('service-refunds/:id')
  detail(@CurrentUser() user: { userId: string }, @Param('id') id: string) { return this.service.detailMine(serviceId(id), serviceId(user.userId)) }
  @Post('service-refunds/:id/withdraw')
  withdraw(@CurrentUser() user: { userId: string }, @Param('id') id: string) { return this.service.withdraw(serviceId(id), serviceId(user.userId)) }
}

@Controller('admin/service-refunds')
@UseGuards(AdminJwtGuard)
export class ServiceRefundAdminController {
  constructor(private readonly service: ServiceRefundService) {}
  @Get()
  list(@Query('status') status?: string) { return this.service.listAdmin(status) }
  @Get(':id')
  detail(@Param('id') id: string) { return this.service.detailAdmin(serviceId(id)) }
  @Post(':id/review')
  review(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string, @Body() dto: ReviewServiceRefundDto) { return this.service.review(serviceId(id), serviceId(admin.adminId), dto.approved, dto.adminNote) }
  @Post(':id/resolve-closed')
  resolveClosed(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string) { return this.service.resolveClosed(serviceId(id), serviceId(admin.adminId)) }
  @Post(':id/query-provider')
  query(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string) { return this.service.queryProvider(serviceId(id), serviceId(admin.adminId)) }
}

@Controller('service-program/webhooks')
@SetMetadata('skipResponseEnvelope', true)
export class ServiceRefundWebhookController {
  constructor(private readonly service: ServiceRefundService, private readonly wechatPay: WechatPayService) {}

  @Post('wechat-refund')
  @HttpCode(200)
  async notify(@Body() body: any, @Req() req: RawBodyRequest<Request>): Promise<{ code: string }> {
    try {
      const rawBody = req.rawBody?.toString('utf8')
      if (!rawBody) throw new UnauthorizedException('缺少微信退款通知原文')
      const headers = { 'wechat-pay-timestamp': req.get('wechatpay-timestamp') || '', 'wechat-pay-nonce': req.get('wechatpay-nonce') || '', 'wechat-pay-signature': req.get('wechatpay-signature') || '', 'wechat-pay-serial': req.get('wechatpay-serial') || '' }
      if (!this.wechatPay.verifyNotifySignature(rawBody, headers)) throw new UnauthorizedException('微信退款通知签名无效')
      const data = await this.wechatPay.decryptNotify(body.resource)
      this.wechatPay.validateRefundNotification(data)
      await this.service.handleWechatNotify(data)
      return { code: 'SUCCESS' }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new InternalServerErrorException('微信退款通知处理失败，请重试')
    }
  }
}
