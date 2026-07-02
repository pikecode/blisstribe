import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AgreementService } from './agreement.service'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'

@Controller('agreements')
export class AgreementController {
  constructor(private readonly agreementService: AgreementService) {}

  // 小程序端：获取当前版本
  @Get('current/:type')
  async getCurrent(@Param('type') type: string) {
    return this.agreementService.getCurrent(type)
  }

  // 后台：分页列表
  @UseGuards(AdminJwtGuard)
  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('type') type?: string
  ) {
    return this.agreementService.list(Number(page), Number(pageSize), type)
  }

  // 后台：发布新版本
  @UseGuards(AdminJwtGuard)
  @Post()
  async create(@Body() body: { type: string; version: string; title: string; content: string }) {
    return this.agreementService.create(body)
  }

  // 后台：切换当前版本
  @UseGuards(AdminJwtGuard)
  @Put(':id/current')
  async setCurrent(@Param('id') id: string) {
    return this.agreementService.setCurrent(id)
  }
}
