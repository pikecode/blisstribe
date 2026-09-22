import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { OrderService } from './order.service'
import { CreateOrderDto } from '../dto/order.dto'

@Controller('shop')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    const userId = BigInt(req.user.id)
    return this.orderService.createOrder(userId, dto)
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = BigInt(req.user.id)
    return this.orderService.getUserOrders(userId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    })
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrderDetail(@Request() req: any, @Param('id') orderId: string) {
    const userId = BigInt(req.user.id)
    return this.orderService.getOrderDetail(BigInt(orderId), userId)
  }

  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Request() req: any, @Param('id') orderId: string) {
    const userId = BigInt(req.user.id)
    return this.orderService.cancelOrder(BigInt(orderId), userId)
  }
}

@Controller('admin/shop')
export class AdminOrderController {
  constructor(private orderService: OrderService) {}

  @Get('orders')
  @UseGuards(AdminJwtGuard)
  async listOrders(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('fulfillmentStatus') fulfillmentStatus?: string,
    @Query('keyword') keyword?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const offset = page ? (parseInt(page, 10) - 1) * parseInt(limit || '20', 10) : 0
    const limit_ = limit ? parseInt(limit, 10) : 20

    return this.orderService.listAdminOrders({
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
    return this.orderService.getOrderDetailByOrderNo(orderId)
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
