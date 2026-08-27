import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { ProductLeadCleanupService, CleanupResult } from './product-lead-cleanup.service'

@Controller('admin/product-lead-cleanup')
@UseGuards(AdminJwtGuard)
export class ProductLeadCleanupController {
  constructor(private readonly cleanupService: ProductLeadCleanupService) {}

  /**
   * GET /api/v1/admin/product-lead-cleanup/stats
   * 获取清理前的统计数据
   */
  @Get('stats')
  async getCleanupStats(): Promise<{
    readyToArchive: number
    readyToDelete: number
  }> {
    return this.cleanupService.getCleanupStats()
  }

  /**
   * POST /api/v1/admin/product-lead-cleanup/run
   * 执行 Lead 清理流程
   */
  @Post('run')
  async runCleanup(): Promise<CleanupResult> {
    return this.cleanupService.runCleanup()
  }

  /**
   * POST /api/v1/admin/product-lead-cleanup/manual
   * 手动清理指定日期前的 lead
   */
  @Post('manual')
  async manualCleanup(
    @Body() body: { beforeDate: string; archiveOnly?: boolean; deleteOnly?: boolean },
  ): Promise<CleanupResult> {
    const beforeDate = new Date(body.beforeDate)
    return this.cleanupService.manualCleanup(beforeDate, {
      archiveOnly: body.archiveOnly,
      deleteOnly: body.deleteOnly,
    })
  }

  /**
   * GET /api/v1/admin/product-lead-cleanup/history
   * 获取清理历史
   */
  @Get('history')
  async getCleanupHistory(@Query('limit') limit?: string): Promise<any[]> {
    return this.cleanupService.getCleanupHistory(limit ? parseInt(limit, 10) : 30)
  }
}
