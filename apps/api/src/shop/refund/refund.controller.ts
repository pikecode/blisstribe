import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  RawBodyRequest,
} from '@nestjs/common'
import { Request as ExpressRequest } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { RefundService } from './refund.service'
import { WechatPayService } from '../payment/wechat-pay.service'
import { CreateRefundDto, ApproveRefundDto } from '../dto/refund.dto'

@Controller('shop')
export class RefundController {
  constructor(private refundService: RefundService) {}

  @Post('orders/:id/refund')
  @UseGuards(JwtAuthGuard)
  async requestRefund(
    @Request() req: any,
    @Param('id') orderId: string,
    @Body() dto: CreateRefundDto
  ) {
    const userId = BigInt(req.user.id)
    return this.refundService.requestRefund(userId, BigInt(orderId), dto)
  }

  @Get('refunds')
  @UseGuards(JwtAuthGuard)
  async getUserRefunds(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') limit?: string
  ) {
    const userId = BigInt(req.user.id)
    return this.refundService.getUserRefunds(userId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: pageSize
        ? parseInt(pageSize, 10)
        : limit
          ? parseInt(limit, 10)
          : 20,
    })
  }

  @Get('refunds/:id')
  @UseGuards(JwtAuthGuard)
  async getRefundDetail(@Request() req: any, @Param('id') refundId: string) {
    const userId = BigInt(req.user.id)
    return this.refundService.getRefundDetail(BigInt(refundId), userId)
  }
}

@Controller('admin/shop/refunds')
export class AdminRefundController {
  constructor(private refundService: RefundService) {}

  @Get()
  @UseGuards(AdminJwtGuard)
  async listRefunds(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') legacyLimit?: string
  ) {
    return this.refundService.getAllRefunds({
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize
        ? parseInt(pageSize, 10)
        : legacyLimit
          ? parseInt(legacyLimit, 10)
          : 20,
    })
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard)
  async getRefundDetail(@Param('id') refundId: string) {
    return this.refundService.getRefundDetail(BigInt(refundId))
  }

  @Post(':id/approve')
  @UseGuards(AdminJwtGuard)
  async approveRefund(
    @Request() req: any,
    @Param('id') refundId: string,
    @Body() dto: ApproveRefundDto
  ) {
    const adminId = BigInt(req.user.adminId)
    if (!dto.approved) {
      return this.refundService.rejectRefund(
        BigInt(refundId),
        adminId,
        dto.adminNote
      )
    }
    return this.refundService.approveRefund(
      BigInt(refundId),
      adminId,
      dto.adminNote
    )
  }

  @Post(':id/reject')
  @UseGuards(AdminJwtGuard)
  async rejectRefund(
    @Request() req: any,
    @Param('id') refundId: string,
    @Body() dto: { rejectReason?: string }
  ) {
    return this.refundService.rejectRefund(
      BigInt(refundId),
      BigInt(req.user.adminId),
      dto.rejectReason
    )
  }
}

@Controller('shop/webhooks')
export class RefundWebhookController {
  constructor(
    private refundService: RefundService,
    private wechatPayService: WechatPayService
  ) {}

  @Post('wechat-refund')
  async handleWechatRefundNotify(
    @Body() body: any,
    @Request() req: RawBodyRequest<ExpressRequest>
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

      // Call refundService.handleRefundCallback(decryptedData)
      await this.refundService.handleRefundCallback(decryptedData)

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
