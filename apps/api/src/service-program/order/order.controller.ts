import { serviceId } from '../service-id'
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { ExtendServicePlanDto } from '../dto/extension.dto'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CreateServiceOrderDto } from '../dto/order.dto'
import { ServiceOrderService } from './order.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class ServiceOrderController {
  constructor(private readonly service: ServiceOrderService) {}

  @Get('service-notices')
  notices(@CurrentUser() user: { userId: string }) { return this.service.notices(serviceId(user.userId)) }
  @Post('service-notices/:id/read')
  readNotice(@CurrentUser() user: { userId: string }, @Param('id') id: string) { return this.service.readNotice(serviceId(id), serviceId(user.userId)) }

  @Get('service-offerings/:id/eligibility')
  eligibility(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.service.eligibility(serviceId(id), serviceId(user.userId))
  }

  @Post('service-orders')
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateServiceOrderDto) {
    return this.service.create(serviceId(user.userId), dto)
  }

  @Get('service-orders')
  list(
    @CurrentUser() user: { userId: string },
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.service.listMine(serviceId(user.userId), { status, page: Number(page) || 1, pageSize: Number(pageSize) || 20 })
  }

  @Get('service-orders/:id')
  detail(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.service.detailMine(serviceId(id), serviceId(user.userId))
  }

  @Post('service-orders/:id/cancel')
  cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.service.cancel(serviceId(id), serviceId(user.userId))
  }

  @Get('service-plans')
  plans(@CurrentUser() user: { userId: string }) {
    return this.service.listPlans(serviceId(user.userId))
  }

  @Get('service-plans/:id')
  planDetail(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.service.detailPlan(serviceId(id), serviceId(user.userId))
  }
}

@Controller('admin/service-orders')
@UseGuards(AdminJwtGuard)
export class ServiceOrderAdminController {
  constructor(private readonly service: ServiceOrderService) {}

  @Post(':id/extend-plan')
  extend(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string, @Body() dto: ExtendServicePlanDto) {
    return this.service.extendPlan(serviceId(id), serviceId(admin.adminId), dto)
  }

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('institutionId') institutionId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.service.listAdmin({ keyword, status, institutionId: institutionId ? serviceId(institutionId) : undefined, page: Number(page) || 1, pageSize: Number(pageSize) || 20 })
  }

  @Get(':id')
  detail(@Param('id') id: string) { return this.service.detailAdmin(serviceId(id)) }
}
