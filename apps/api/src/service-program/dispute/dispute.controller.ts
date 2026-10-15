import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CreateServiceDisputeDto, DisputeAdminActionDto, DisputeUserActionDto } from '../dto/dispute.dto'
import { serviceId } from '../service-id'
import { ServiceDisputeService } from './dispute.service'
@Controller() @UseGuards(JwtAuthGuard)
export class ServiceDisputeUserController {
  constructor(private readonly service: ServiceDisputeService) {}
  @Post('service-appointments/:id/disputes') create(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: CreateServiceDisputeDto) { return this.service.create(serviceId(id), serviceId(user.userId), dto) }
  @Get('service-appointments/:id/dispute') forAppointment(@Param('id') id: string, @CurrentUser() user: { userId: string }) { return this.service.forAppointment(serviceId(id), serviceId(user.userId)) }
  @Get('service-disputes') list(@CurrentUser() user: { userId: string }, @Query('planId') planId?: string, @Query('page') page = '1') { return this.service.list({ userId: serviceId(user.userId), planId: planId ? serviceId(planId) : undefined, page: Number(page) }) }
  @Get('service-disputes/:id') detail(@Param('id') id: string, @CurrentUser() user: { userId: string }) { return this.service.detail(serviceId(id), serviceId(user.userId)) }
  @Post('service-disputes/:id/action') act(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: DisputeUserActionDto) { return this.service.userAct(serviceId(id), serviceId(user.userId), dto) }
}
@Controller('admin/service-disputes') @UseGuards(AdminJwtGuard)
export class ServiceDisputeAdminController {
  constructor(private readonly service: ServiceDisputeService) {}
  @Get() list(@Query('status') status?: string, @Query('overdue') overdue?: string, @Query('keyword') keyword?: string, @Query('page') page = '1') { return this.service.list({ status, overdue: overdue === 'true', keyword, page: Number(page) }) }
  @Get(':id') detail(@Param('id') id: string) { return this.service.detail(serviceId(id)) }
  @Post(':id/action') act(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: DisputeAdminActionDto) { return this.service.adminAct(serviceId(id), serviceId(admin.adminId), dto) }
}
