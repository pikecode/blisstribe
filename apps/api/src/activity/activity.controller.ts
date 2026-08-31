import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { CurrentAdmin } from '../common/decorators/current-admin.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../common/guards/jwt.guard'
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard'
import { ActivityService } from './activity.service'
import {
  CancelActivityRegistrationDto,
  CreateActivityDto,
  CreateActivityRegistrationDto,
  UpdateActivityDto,
  UpdateActivityRegistrationStatusDto,
} from './dto'

function pageParams(page = '1', pageSize = '20') {
  return {
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  }
}

function parseId(id?: string) {
  return id ? BigInt(id) : undefined
}

@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(
    @Query('moduleCode') moduleCode?: string,
    @Query('activityType') activityType?: string,
    @Query('statusScope') statusScope?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.activityService.listPublic({
      moduleCode,
      activityType,
      statusScope,
      ...pageParams(page, pageSize),
    })
  }

  @Get('recommended')
  recommended(
    @Query('moduleCode') moduleCode?: string,
    @Query('limit') limit = '3'
  ) {
    return this.activityService.recommended({ moduleCode, limit: Number(limit) || 3 })
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-registrations')
  myRegistrations(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.activityService.myRegistrations(BigInt(user.userId), pageParams(page, pageSize))
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/registrations')
  register(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CreateActivityRegistrationDto
  ) {
    return this.activityService.register(BigInt(id), BigInt(user.userId), dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/registrations/cancel')
  cancelRegistration(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CancelActivityRegistrationDto
  ) {
    return this.activityService.cancelRegistration(BigInt(id), BigInt(user.userId), dto)
  }

  @UseGuards(OptionalJwtGuard)
  @Get(':id')
  detail(@CurrentUser() user: { userId: string } | null, @Param('id') id: string) {
    return this.activityService.detailPublic(BigInt(id), user?.userId ? BigInt(user.userId) : null)
  }
}

@Controller('admin/activities')
@UseGuards(AdminJwtGuard)
export class ActivityAdminController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
    @Query('moduleId') moduleId?: string,
    @Query('activityType') activityType?: string,
    @Query('status') status?: string
  ) {
    return this.activityService.listAdmin({
      ...pageParams(page, pageSize),
      keyword,
      moduleId: parseId(moduleId),
      activityType,
      status: status !== undefined && status !== '' ? Number(status) : undefined,
    })
  }

  @Post()
  create(@Body() dto: CreateActivityDto) {
    return this.activityService.createAdmin(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activityService.updateAdmin(BigInt(id), dto)
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.activityService.publishAdmin(BigInt(id))
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.activityService.unpublishAdmin(BigInt(id))
  }
}

@Controller('admin/activity-registrations')
@UseGuards(AdminJwtGuard)
export class ActivityRegistrationAdminController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('activityId') activityId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.activityService.listRegistrationsAdmin({
      ...pageParams(page, pageSize),
      activityId: parseId(activityId),
      status,
      keyword,
    })
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.activityService.detailRegistrationAdmin(BigInt(id))
  }

  @Put(':id/status')
  updateStatus(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string,
    @Body() dto: UpdateActivityRegistrationStatusDto
  ) {
    return this.activityService.updateRegistrationStatusAdmin(BigInt(id), BigInt(admin.adminId), dto)
  }
}
