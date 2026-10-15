import { serviceId } from '../service-id'
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CancelServiceAppointmentDto, ConfirmServiceAppointmentDto, CreateServiceAppointmentDto, CreateServiceSlotDto, ProposeRescheduleDto, CompleteServiceAppointmentDto } from '../dto/appointment.dto'
import { ServiceAppointmentService } from './appointment.service'

@Controller()
@UseGuards(JwtAuthGuard)
export class ServiceAppointmentUserController {
  constructor(private readonly service: ServiceAppointmentService) {}

  @Get('service-institutions/:id/slots')
  slots(@Param('id') id: string) { return this.service.slots(serviceId(id)) }

  @Post('service-plans/:planId/appointments')
  create(@CurrentUser() user: { userId: string }, @Param('planId') planId: string, @Body() dto: CreateServiceAppointmentDto) {
    return this.service.create(serviceId(planId), serviceId(user.userId), dto)
  }

  @Get('service-appointments')
  list(@CurrentUser() user: { userId: string }, @Query('planId') planId?: string) {
    return this.service.listMine(serviceId(user.userId), planId ? serviceId(planId) : undefined)
  }

  @Get('service-appointments/:id')
  detail(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.service.detailMine(serviceId(id), serviceId(user.userId))
  }

  @Post('service-appointments/:id/accept-reschedule')
  acceptReschedule(@CurrentUser() user: { userId: string }, @Param('id') id: string) { return this.service.acceptReschedule(serviceId(id), serviceId(user.userId)) }

  @Post('service-appointments/:id/cancel')
  cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: CancelServiceAppointmentDto) {
    return this.service.cancelMine(serviceId(id), serviceId(user.userId), dto)
  }
}

@Controller('admin/service-appointments')
@UseGuards(AdminJwtGuard)
export class ServiceAppointmentAdminController {
  constructor(private readonly service: ServiceAppointmentService) {}

  @Get('slots')
  slots(@Query('institutionId') id: string) { return this.service.slots(serviceId(id), true) }

  @Post('slots')
  createSlot(@Body() dto: CreateServiceSlotDto) { return this.service.createSlot(dto) }

  @Post('slots/:id/close')
  closeSlot(@Param('id') id: string) { return this.service.closeSlot(serviceId(id)) }

  @Get()
  list(@Query('status') status?: string, @Query('institutionId') institutionId?: string, @Query('date') date?: string) {
    return this.service.listAdmin({ status, institutionId: institutionId ? serviceId(institutionId) : undefined, date })
  }

  @Post(':id/propose-reschedule')
  propose(@Param('id') id: string, @Body() dto: ProposeRescheduleDto) { return this.service.proposeReschedule(serviceId(id), serviceId(String(dto.slotId)), dto.reason) }

  @Post(':id/confirm')
  confirm(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string, @Body() dto: ConfirmServiceAppointmentDto) {
    return this.service.confirm(serviceId(id), serviceId(admin.adminId), dto)
  }

  @Post(':id/arrive')
  arrive(@Param('id') id: string) { return this.service.arrive(serviceId(id)) }

  @Post(':id/complete')
  complete(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string, @Body() dto: CompleteServiceAppointmentDto) { return this.service.complete(serviceId(id), serviceId(admin.adminId), dto.performedByName) }

  @Post(':id/cancel')
  cancelAdmin(@Param('id') id: string, @Body() dto: CancelServiceAppointmentDto) { return this.service.cancelAdmin(serviceId(id), dto.reason || '') }

  @Post(':id/no-show')
  noShow(@Param('id') id: string, @Body() dto: CancelServiceAppointmentDto) {
    return this.service.noShow(serviceId(id), dto.reason || '')
  }

  @Post(':id/restore-booking')
  restoreBooking(@CurrentAdmin() admin: { adminId: string }, @Param('id') id: string, @Body() dto: CancelServiceAppointmentDto) {
    return this.service.restoreBooking(serviceId(id), serviceId(admin.adminId), dto.reason || '')
  }
}
