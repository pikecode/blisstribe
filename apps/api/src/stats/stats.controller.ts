import { Controller, Get, UseGuards } from '@nestjs/common'
import { StatsService } from './stats.service'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'

@Controller('stats')
@UseGuards(AdminJwtGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // 看板总览
  @Get('overview')
  async overview() {
    return this.statsService.overview()
  }

  // 注册趋势（近 N 天）
  @Get('register-trend')
  async registerTrend() {
    return this.statsService.registerTrend(30)
  }
}
