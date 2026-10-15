import { serviceId } from '../service-id'
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { SyncServiceQualificationsDto } from '../dto/qualification.dto'
import { ServiceQualificationService } from './qualification.service'

@Controller('admin/product-leads/:leadId/service-qualifications')
@UseGuards(AdminJwtGuard)
export class ServiceQualificationAdminController {
  constructor(private readonly service: ServiceQualificationService) {}

  @Get()
  list(@Param('leadId') leadId: string) {
    return this.service.listAdmin(serviceId(leadId))
  }

  @Put()
  sync(
    @CurrentAdmin() admin: { adminId: string },
    @Param('leadId') leadId: string,
    @Body() dto: SyncServiceQualificationsDto
  ) {
    return this.service.syncAdmin(serviceId(leadId), serviceId(admin.adminId), dto)
  }
}

@Controller('products/my-leads/:leadId/service-qualifications')
@UseGuards(JwtAuthGuard)
export class ServiceQualificationUserController {
  constructor(private readonly service: ServiceQualificationService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }, @Param('leadId') leadId: string) {
    return this.service.listMine(serviceId(leadId), serviceId(user.userId))
  }
}
