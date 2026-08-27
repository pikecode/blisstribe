import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { RecommendationMetricsService } from './recommendation-metrics.service'
import type { RecommendationMetrics } from '@prisma/client'

@Controller('admin/recommendation-metrics')
@UseGuards(AdminJwtGuard)
export class RecommendationMetricsController {
  constructor(private readonly metricsService: RecommendationMetricsService) {}

  /**
   * GET /api/v1/recommendation-metrics
   * 查询指标（分页）
   */
  @Get()
  async queryMetrics(
    @Query('moduleCode') moduleCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: string = '30',
    @Query('offset') offset: string = '0',
  ): Promise<{ data: RecommendationMetrics[]; total: number }> {
    return this.metricsService.queryMetrics(
      moduleCode,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      Math.min(parseInt(limit, 10) || 30, 100),
      parseInt(offset, 10) || 0,
    )
  }

  /**
   * GET /api/v1/recommendation-metrics/performance/:moduleCode
   * 获取模块性能概览
   */
  @Get('performance/:moduleCode')
  async getModulePerformance(
    @Param('moduleCode') moduleCode: string,
    @Query('days') days: string = '7',
  ): Promise<any> {
    return this.metricsService.getModulePerformance(moduleCode, parseInt(days, 10) || 7)
  }

  /**
   * POST /api/v1/recommendation-metrics/aggregate/:moduleCode
   * 立即聚合指定模块的指标
   */
  @Post('aggregate/:moduleCode')
  async aggregateMetrics(
    @Param('moduleCode') moduleCode: string,
    @Query('date') date?: string,
  ): Promise<RecommendationMetrics> {
    return this.metricsService.aggregateMetricsForDate(moduleCode, date ? new Date(date) : new Date())
  }

  /**
   * POST /api/v1/recommendation-metrics/aggregate-all
   * 聚合所有模块的指标
   */
  @Post('aggregate-all')
  async aggregateAllMetrics(@Query('date') date?: string): Promise<RecommendationMetrics[]> {
    return this.metricsService.aggregateMetricsForAllModules(date ? new Date(date) : undefined)
  }
}
