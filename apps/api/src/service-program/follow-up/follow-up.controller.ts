import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CreateServiceFollowUpDto, ResolveServiceFollowUpDto, ServiceFollowUpFeedbackDto } from '../dto/follow-up.dto'
import { serviceId } from '../service-id'
import { ServiceFollowUpService } from './follow-up.service'

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class ServiceFollowUpAdminController {
  constructor(private readonly service: ServiceFollowUpService) {}
  @Get('service-plans/:id/follow-ups')
  list(@Param('id') id: string) { return this.service.list(serviceId(id)) }
  @Post('service-plans/:id/follow-ups')
  create(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: CreateServiceFollowUpDto) { return this.service.create(serviceId(id), serviceId(admin.adminId), dto) }
  @Post('service-follow-ups/:id/resolve')
  resolve(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: ResolveServiceFollowUpDto) { return this.service.resolve(serviceId(id), serviceId(admin.adminId), dto) }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ServiceFollowUpUserController {
  constructor(private readonly service: ServiceFollowUpService) {}
  @Get('service-plans/:id/follow-ups')
  list(@Param('id') id: string, @CurrentUser() user: { userId: string }) { return this.service.list(serviceId(id), serviceId(user.userId)) }
  @Post('service-follow-ups/:id/feedback')
  feedback(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: ServiceFollowUpFeedbackDto) { return this.service.feedback(serviceId(id), serviceId(user.userId), dto.feedback) }
}
