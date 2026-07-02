import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { BannerService } from './banner.service'
import { CreateBannerDto, UpdateBannerDto } from './dto'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  // 公开接口：小程序获取上线 banner
  @Get()
  listPublic() {
    return this.bannerService.listPublic()
  }

  // 管理端：分页列表
  @UseGuards(AdminJwtGuard)
  @Get('admin')
  listAdmin(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.bannerService.listAdmin(Number(page), Number(pageSize))
  }

  // 管理端：新增
  @UseGuards(AdminJwtGuard)
  @Post('admin')
  create(@Body() dto: CreateBannerDto) {
    return this.bannerService.create(dto)
  }

  // 管理端：编辑
  @UseGuards(AdminJwtGuard)
  @Put('admin/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannerService.update(id, dto)
  }

  // 管理端：删除
  @UseGuards(AdminJwtGuard)
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.bannerService.remove(id)
  }
}
