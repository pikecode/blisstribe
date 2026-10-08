import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { PaymentExceptionService } from './payment-exception.service'

@Controller('admin/shop/payment-exceptions')
@UseGuards(AdminJwtGuard)
export class AdminPaymentExceptionController {
  constructor(private service: PaymentExceptionService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string
  ) {
    return this.service.list(Number(page) || 1, Number(pageSize) || 20, status)
  }

  @Post(':id/review')
  review(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { channelCheckResult: string; resolutionNote: string }
  ) {
    return this.service.review(BigInt(id), BigInt(req.user.adminId), body)
  }
}
