import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { RecommendationEventService } from './recommendation-event.service'
import type { RecommendationMetrics } from '@prisma/client'

@Injectable()
export class RecommendationMetricsService {
  private readonly logger = new Logger(RecommendationMetricsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: RecommendationEventService,
  ) {}

  /**
   * 聚合指定日期的推荐指标
   */
  async aggregateMetricsForDate(moduleCode: string, date: Date): Promise<RecommendationMetrics> {
    // 计算当天的时间范围
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    // 获取该天的所有事件
    const metrics = await this.eventService.getMetrics(moduleCode, startDate, endDate, 'matchReason')

    // 准备按匹配类型的分组数据
    const byMatchReason: Record<string, any> = {}
    if (metrics.byMatchReason) {
      for (const reason in metrics.byMatchReason) {
        const data = metrics.byMatchReason[reason]
        byMatchReason[reason] = {
          count: data.count,
          ctr: Number(data.ctr.toFixed(4)),
          conversionRate: Number(data.conversionRate.toFixed(4)),
          avgViewDuration: Number(data.avgViewDuration.toFixed(2)),
        }
      }
    }

    // 存储聚合结果
    const result = await this.prisma.recommendationMetrics.upsert({
      where: {
        moduleCode_date: {
          moduleCode,
          date: startDate,
        },
      },
      update: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        ctr: Number(metrics.ctr.toFixed(4)),
        conversions: metrics.conversions,
        conversionRate: Number(metrics.conversionRate.toFixed(4)),
        avgViewDuration: Number(metrics.avgViewDuration.toFixed(2)),
        byMatchReason,
        updatedAt: new Date(),
      },
      create: {
        moduleCode,
        date: startDate,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        ctr: Number(metrics.ctr.toFixed(4)),
        conversions: metrics.conversions,
        conversionRate: Number(metrics.conversionRate.toFixed(4)),
        avgViewDuration: Number(metrics.avgViewDuration.toFixed(2)),
        byMatchReason,
      },
    })

    this.logger.log(
      `Aggregated metrics for ${moduleCode} on ${startDate.toISOString()}: ` +
      `impressions=${result.impressions}, clicks=${result.clicks}, ctr=${result.ctr}`,
    )

    return result
  }

  /**
   * 批量聚合多个模块的指标
   */
  async aggregateMetricsForAllModules(date?: Date): Promise<RecommendationMetrics[]> {
    const targetDate = date ?? new Date()

    // 获取所有活跃模块
    const modules = await this.prisma.productModule.findMany({
      where: { status: 1, deletedAt: null },
      select: { code: true },
      distinct: ['code'],
    })

    const results: RecommendationMetrics[] = []
    for (const module of modules) {
      try {
        const result = await this.aggregateMetricsForDate(module.code, targetDate)
        results.push(result)
      } catch (error) {
        this.logger.error(`Failed to aggregate metrics for module ${module.code}:`, error)
      }
    }

    return results
  }

  /**
   * 查询指标（分页）
   */
  async queryMetrics(
    moduleCode?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 30,
    offset: number = 0,
  ): Promise<{ data: RecommendationMetrics[]; total: number }> {
    const where: any = {}

    if (moduleCode) {
      where.moduleCode = moduleCode
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = startDate
      }
      if (endDate) {
        where.date.lte = endDate
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.recommendationMetrics.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.recommendationMetrics.count({ where }),
    ])

    return { data, total }
  }

  /**
   * 获取模块的性能概览（最近 N 天）
   */
  async getModulePerformance(moduleCode: string, days: number = 7): Promise<any> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const metrics = await this.prisma.recommendationMetrics.findMany({
      where: {
        moduleCode,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    })

    if (metrics.length === 0) {
      return null
    }

    // 聚合统计
    const summary = {
      moduleCode,
      period: { startDate, endDate, days },
      totalImpressions: 0,
      totalClicks: 0,
      avgCtr: 0,
      totalConversions: 0,
      avgConversionRate: 0,
      avgViewDuration: 0,
      bestDay: metrics[0],
      worstDay: metrics[0],
      trend: [] as any[],
    }

    for (const metric of metrics) {
      summary.totalImpressions += metric.impressions
      summary.totalClicks += metric.clicks
      summary.totalConversions += metric.conversions
      summary.avgViewDuration += metric.avgViewDuration

      // 找最好和最差的一天
      if (metric.ctr > summary.bestDay.ctr) {
        summary.bestDay = metric
      }
      if (metric.ctr < summary.worstDay.ctr) {
        summary.worstDay = metric
      }

      summary.trend.push({
        date: metric.date,
        impressions: metric.impressions,
        ctr: metric.ctr,
        conversionRate: metric.conversionRate,
      })
    }

    summary.avgCtr = summary.totalImpressions > 0 ? summary.totalClicks / summary.totalImpressions : 0
    summary.avgConversionRate = summary.totalClicks > 0 ? summary.totalConversions / summary.totalClicks : 0
    summary.avgViewDuration = metrics.length > 0 ? summary.avgViewDuration / metrics.length : 0

    summary.avgCtr = Number(summary.avgCtr.toFixed(4))
    summary.avgConversionRate = Number(summary.avgConversionRate.toFixed(4))
    summary.avgViewDuration = Number(summary.avgViewDuration.toFixed(2))

    return summary
  }

  /**
   * 清除过期指标（超过 N 天）
   */
  async deleteOldMetrics(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await this.prisma.recommendationMetrics.deleteMany({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    })

    return result.count
  }
}
