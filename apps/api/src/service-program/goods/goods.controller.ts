import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { IsArray, ArrayMaxSize, IsUrl, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { serviceId } from '../service-id'
import { ServiceGoodsReturnService } from './returns.service'
import { ServiceGoodsService } from './goods.service'
class GoodsUserActionDto {
  @IsIn(['address', 'receive']) action!: 'address' | 'receive'
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) addressId?: number
}
class GoodsAdminActionDto {
  @IsIn(['ready', 'ship', 'receive', 'recover']) action!: 'ready' | 'ship' | 'receive' | 'recover'
  @IsOptional() @IsString() @MaxLength(100) expressCompany?: string
  @IsOptional() @IsString() @MaxLength(100) trackingNo?: string
  @IsOptional() @IsString() @MaxLength(500) evidence?: string
}
@Controller('admin') @UseGuards(AdminJwtGuard)
export class ServiceGoodsAdminController {
  constructor(private readonly service: ServiceGoodsService) {}
  @Get('service-plans/:id/goods') list(@Param('id') id: string) { return this.service.list(serviceId(id)) }
  @Post('service-goods/:id/action') act(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: GoodsAdminActionDto) { return this.service.act(serviceId(id), serviceId(admin.adminId), true, dto) }
}
@Controller() @UseGuards(JwtAuthGuard)
export class ServiceGoodsUserController {
  constructor(private readonly service: ServiceGoodsService) {}
  @Get('service-plans/:id/goods') list(@Param('id') id: string, @CurrentUser() user: { userId: string }) { return this.service.list(serviceId(id), serviceId(user.userId)) }
  @Post('service-goods/:id/action') act(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: GoodsUserActionDto) { return this.service.act(serviceId(id), serviceId(user.userId), false, dto) }
}

class GoodsReturnRequestDto {
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true }) images?: string[]
  @IsInt() @Min(1) quantity!: number
  @IsString() @MaxLength(500) reason!: string
  @IsIn(['personal', 'quality']) reasonType!: 'personal' | 'quality'
  @IsString() @MaxLength(100) clientRequestId!: string
}
class GoodsReturnUserDto {
  @IsIn(['withdraw', 'shipped']) action!: 'withdraw' | 'shipped'
  @IsOptional() @IsString() @MaxLength(100) expressCompany?: string
  @IsOptional() @IsString() @MaxLength(100) trackingNo?: string
}
class GoodsReturnAdminDto {
  @IsIn(['approve', 'reject', 'inspect', 'dispute']) action!: 'approve' | 'reject' | 'inspect' | 'dispute'
  @IsString() @MaxLength(1000) note!: string
  @IsOptional() @IsString() @MaxLength(500) returnAddress?: string
  @IsOptional() @IsBoolean() reusable?: boolean
}
@Controller('admin') @UseGuards(AdminJwtGuard)
export class ServiceGoodsReturnAdminController {
  constructor(private readonly service: ServiceGoodsReturnService) {}
  @Get('service-plans/:id/goods-returns') list(@Param('id') id: string) { return this.service.list(serviceId(id)) }
  @Post('service-goods-returns/:id/action') act(@Param('id') id: string, @CurrentAdmin() admin: { adminId: string }, @Body() dto: GoodsReturnAdminDto) { return this.service.act(serviceId(id), serviceId(admin.adminId), true, dto) }
}
@Controller() @UseGuards(JwtAuthGuard)
export class ServiceGoodsReturnUserController {
  constructor(private readonly service: ServiceGoodsReturnService) {}
  @Get('service-plans/:id/goods-returns') list(@Param('id') id: string, @CurrentUser() user: { userId: string }) { return this.service.list(serviceId(id), serviceId(user.userId)) }
  @Post('service-goods/:id/return') request(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: GoodsReturnRequestDto) { return this.service.request(serviceId(id), serviceId(user.userId), dto) }
  @Post('service-goods-returns/:id/action') act(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: GoodsReturnUserDto) { return this.service.act(serviceId(id), serviceId(user.userId), false, dto) }
}
