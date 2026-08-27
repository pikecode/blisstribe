import { Controller, Get, Post, Put, Query, Body, Param, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { RecommendationConfigService, RecommendationConfigData } from './recommendation-config.service'
import type { RecommendationConfig } from '@prisma/client'

@Controller('admin/recommendation-config')
@UseGuards(AdminJwtGuard)
export class RecommendationConfigController {
  constructor(private readonly configService: RecommendationConfigService) {}

  /**
   * GET /api/v1/recommendation-config/:moduleCode
   * 获取推荐配置
   */
  @Get(':moduleCode')
  async getConfig(@Param('moduleCode') moduleCode: string): Promise<RecommendationConfig> {
    return this.configService.getConfig(moduleCode)
  }

  /**
   * GET /api/v1/recommendation-config
   * 获取所有配置
   */
  @Get()
  async listConfigs(@Query('status') status?: string): Promise<RecommendationConfig[]> {
    return this.configService.listConfigs(status ? parseInt(status, 10) : undefined)
  }

  /**
   * POST /api/v1/recommendation-config
   * 创建推荐配置
   */
  @Post()
  async createConfig(@Body() data: RecommendationConfigData): Promise<RecommendationConfig> {
    return this.configService.upsertConfig(data)
  }

  /**
   * PUT /api/v1/recommendation-config/:moduleCode
   * 更新推荐配置
   */
  @Put(':moduleCode')
  async updateConfig(
    @Param('moduleCode') moduleCode: string,
    @Body() data: Partial<RecommendationConfigData>,
  ): Promise<RecommendationConfig> {
    return this.configService.upsertConfig({ ...data, moduleCode })
  }

  /**
   * POST /api/v1/recommendation-config/cache-clear/:moduleCode
   * 清除特定模块的缓存
   */
  @Post('cache-clear/:moduleCode')
  async clearCache(@Param('moduleCode') moduleCode: string): Promise<{ success: boolean }> {
    this.configService.clearCache(moduleCode)
    return { success: true }
  }

  /**
   * POST /api/v1/recommendation-config/cache-clear-all
   * 清除所有缓存
   */
  @Post('cache-clear-all')
  async clearAllCache(): Promise<{ success: boolean }> {
    this.configService.clearCache()
    return { success: true }
  }
}
