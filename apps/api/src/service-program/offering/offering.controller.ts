import { serviceId } from '../service-id'
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import {
  CreateServiceInstitutionDto,
  CreateServiceOfferingDto,
  UpdateServiceInstitutionDto,
  UpdateServiceOfferingDto,
} from '../dto/offering.dto'
import { ServiceOfferingService } from './offering.service'

@Controller()
export class ServiceOfferingPublicController {
  constructor(private readonly service: ServiceOfferingService) {}

  @Get('service-products/:productId/offerings')
  list(@Param('productId') productId: string) {
    return this.service.listPublic(serviceId(productId))
  }

  @Get('service-offerings/:id')
  detail(@Param('id') id: string) {
    return this.service.detailPublic(serviceId(id))
  }
}

@Controller('admin/service-institutions')
@UseGuards(AdminJwtGuard)
export class ServiceInstitutionAdminController {
  constructor(private readonly service: ServiceOfferingService) {}

  @Get()
  list() {
    return this.service.listInstitutions()
  }

  @Post()
  create(@Body() dto: CreateServiceInstitutionDto) {
    return this.service.createInstitution(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceInstitutionDto) {
    return this.service.updateInstitution(serviceId(id), dto)
  }
}

@Controller('admin/service-offerings')
@UseGuards(AdminJwtGuard)
export class ServiceOfferingAdminController {
  constructor(private readonly service: ServiceOfferingService) {}

  @Get()
  list(
    @Query('productId') productId?: string,
    @Query('institutionId') institutionId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.service.listAdmin({
      productId: productId ? serviceId(productId) : undefined,
      institutionId: institutionId ? serviceId(institutionId) : undefined,
      status: status === undefined || status === '' ? undefined : Number(status),
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    })
  }

  @Get(':id/readiness')
  readiness(@Param('id') id: string) { return this.service.readiness(serviceId(id)) }

  @Post()
  create(@Body() dto: CreateServiceOfferingDto) {
    return this.service.create(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceOfferingDto) {
    return this.service.update(serviceId(id), dto)
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(serviceId(id))
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(serviceId(id))
  }
}
