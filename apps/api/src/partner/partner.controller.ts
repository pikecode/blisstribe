import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../common/guards/jwt.guard'
import { CurrentAdmin } from '../common/decorators/current-admin.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApplyPartnerDto, RejectPartnerDto, TransferCustomerDto, UpdatePartnerDto } from './dto'
import { PartnerService } from './partner.service'

@Controller('partner')
@UseGuards(JwtAuthGuard)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post('apply')
  async apply(
    @CurrentUser() user: { userId: string },
    @Body() dto: ApplyPartnerDto
  ) {
    return this.partnerService.apply(BigInt(user.userId), dto)
  }

  @Get('me')
  async getMine(@CurrentUser() user: { userId: string }) {
    return this.partnerService.getMine(BigInt(user.userId))
  }

  @Put('me')
  async updateMine(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdatePartnerDto
  ) {
    return this.partnerService.updateMine(BigInt(user.userId), dto)
  }

  @Get('invitation-code')
  async getInvitationCode(@CurrentUser() user: { userId: string }) {
    return this.partnerService.getInvitationCode(BigInt(user.userId))
  }

  @Get('customers')
  async getCustomers(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.partnerService.getCustomers(BigInt(user.userId), {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    })
  }
}

@Controller('admin/partners')
@UseGuards(AdminJwtGuard)
export class PartnerAdminController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.partnerService.listAdmin({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      status: status === undefined ? undefined : Number(status),
      keyword,
    })
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.partnerService.getAdminDetail(BigInt(id))
  }

  @Get(':id/customers')
  async customers(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.partnerService.getAdminCustomers(BigInt(id), {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    })
  }

  @Get(':id/invitations')
  async invitations(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.partnerService.getAdminInvitations(BigInt(id), {
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    })
  }

  @Post(':id/customers/transfer')
  async transferCustomer(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string,
    @Body() dto: TransferCustomerDto
  ) {
    return this.partnerService.transferCustomerToPartner(BigInt(id), BigInt(admin.adminId), {
      customerUserId: BigInt(dto.customerUserId),
      reason: dto.reason,
    })
  }

  @Post(':id/approve')
  async approve(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string
  ) {
    return this.partnerService.approve(BigInt(id), BigInt(admin.adminId))
  }

  @Post(':id/reject')
  async reject(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string,
    @Body() dto: RejectPartnerDto
  ) {
    return this.partnerService.reject(BigInt(id), BigInt(admin.adminId), dto.reason)
  }

  @Post(':id/freeze')
  async freeze(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    return this.partnerService.freeze(BigInt(id), BigInt(admin.adminId), reason)
  }

  @Post(':id/unfreeze')
  async unfreeze(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string
  ) {
    return this.partnerService.unfreeze(BigInt(id), BigInt(admin.adminId))
  }
}
