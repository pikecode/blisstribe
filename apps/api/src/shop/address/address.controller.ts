import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CreateShopAddressDto, UpdateShopAddressDto } from '../dto/address.dto'
import { AddressService } from './address.service'

@Controller('shop/addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.addressService.list(BigInt(user.userId))
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateShopAddressDto) {
    return this.addressService.create(BigInt(user.userId), dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateShopAddressDto
  ) {
    return this.addressService.update(BigInt(user.userId), BigInt(id), dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.addressService.remove(BigInt(user.userId), BigInt(id))
  }
}
