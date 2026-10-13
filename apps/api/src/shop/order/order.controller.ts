import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { OrderService } from './order.service'
import { CreateOrderDto } from '../dto/order.dto'

@Controller('shop')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(@CurrentUser() user: { userId: string }, @Body() dto: CreateOrderDto) {
    const userId = BigInt(user.userId)
    return this.orderService.createOrder(userId, dto)
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(
    @CurrentUser() user: { userId: string },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('limit') legacyLimit?: string
  ) {
    const userId = BigInt(user.userId)
    return this.orderService.getUserOrders(userId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize
        ? parseInt(pageSize, 10)
        : legacyLimit
          ? parseInt(legacyLimit, 10)
          : 20,
    })
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrderDetail(@CurrentUser() user: { userId: string }, @Param('id') orderId: string) {
    const userId = BigInt(user.userId)
    return this.orderService.getOrderDetail(BigInt(orderId), userId)
  }

  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@CurrentUser() user: { userId: string }, @Param('id') orderId: string) {
    const userId = BigInt(user.userId)
    return this.orderService.cancelOrder(BigInt(orderId), userId)
  }
}

@Controller('admin/shop')
export class AdminOrderController {
  constructor(private orderService: OrderService) {}

  @Get('orders')
  @UseGuards(AdminJwtGuard)
  async listOrders(
    @Query('tab') tab?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('fulfillmentStatus') fulfillmentStatus?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const page_ = Number(page || '1')
    const limit_ = Number(pageSize || limit || '20')
    if (!Number.isSafeInteger(page_) || page_ < 1 ||
        !Number.isSafeInteger(limit_) || limit_ < 1 || limit_ > 100 ||
        !Number.isSafeInteger((page_ - 1) * limit_)) {
      throw new BadRequestException('分页参数无效')
    }
    const offset = (page_ - 1) * limit_

    return this.orderService.listAdminOrders({
      tab,
      status,
      paymentStatus,
      fulfillmentStatus,
      keyword,
      startDate,
      endDate,
      offset,
      limit: limit_,
    })
  }

  @Get('orders/:id')
  @UseGuards(AdminJwtGuard)
  async getOrderDetail(@Param('id') orderId: string) {
    return this.orderService.getAdminOrderDetail(BigInt(orderId))
  }

  @Post('orders/:id/ship')
  @UseGuards(AdminJwtGuard)
  async shipOrder(
    @Param('id') orderId: string,
    @Body() dto: { trackingNo: string; logisticsCompany?: string }
  ) {
    return this.orderService.shipOrder(BigInt(orderId), dto)
  }
}
