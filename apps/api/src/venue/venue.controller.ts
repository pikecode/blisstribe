import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { CreateVenueDto, UpdateVenueDto } from './dto'
import { VenueService } from './venue.service'

function pageParams(page = '1', pageSize = '20') {
  return {
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  }
}

@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  listPublic(@Query('city') city?: string, @Query('keyword') keyword?: string) {
    return this.venueService.listPublic({ city, keyword })
  }
}

@Controller('admin/venues')
@UseGuards(AdminJwtGuard)
export class VenueAdminController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
    @Query('city') city?: string,
    @Query('status') status?: string
  ) {
    return this.venueService.listAdmin({
      ...pageParams(page, pageSize),
      keyword,
      city,
      status: status === undefined || status === '' ? undefined : Number(status),
    })
  }

  @Post()
  create(@Body() dto: CreateVenueDto) {
    return this.venueService.create(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.venueService.update(BigInt(id), dto)
  }
}
