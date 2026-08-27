import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import type { Prisma, RecommendationEvent } from '@prisma/client'

export interface CreateRecommendationEventData {
  userId: bigint
  productId: bigint
  moduleCode: string
  tagIds: bigint[]
  matchReason: string
  baseScore: number
  primaryScore: number
  secondaryScore: number
  fallbackScore?: number
  ruleBonus?: number
  clicked?: boolean
  viewDuration?: number
  converted?: boolean
  eventType?: string
}

export interface TrackInteractionData {
  eventId: bigint
  clicked?: boolean
  viewDuration?: number
  converted?: boolean
}

@Injectable()
export class RecommendationEventService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建推荐事件记录
   */
  async createEvent(data: CreateRecommendationEventData): Promise<RecommendationEvent> {
    return this.prisma.recommendationEvent.create({
      data: {
        userId: data.userId,
        productId: data.productId,
        moduleCode: data.moduleCode,
        tagIds: data.tagIds,
        matchReason: data.matchReason,
        baseScore: data.baseScore,
        primaryScore: data.primaryScore,
        secondaryScore: data.secondaryScore,
        fallbackScore: data.fallbackScore ?? 0,
        ruleBonus: data.ruleBonus ?? 0,
        clicked: data.clicked ?? false,
        viewDuration: data.viewDuration,
        converted: data.converted ?? false,
        eventType: data.eventType ?? 'recommendation',
      },
    })
  }

  /**
   * 批量创建推荐事件
   */
  async createBatchEvents(events: CreateRecommendationEventData[]): Promise<Prisma.BatchPayload> {
    if (events.length === 0) {
      return { count: 0 }
    }

    return this.prisma.recommendationEvent.createMany({
      data: events.map((e) => ({
        userId: e.userId,
        productId: e.productId,
        moduleCode: e.moduleCode,
        tagIds: e.tagIds,
        matchReason: e.matchReason,
        baseScore: e.baseScore,
        primaryScore: e.primaryScore,
        secondaryScore: e.secondaryScore,
        fallbackScore: e.fallbackScore ?? 0,
        ruleBonus: e.ruleBonus ?? 0,
        clicked: e.clicked ?? false,
        viewDuration: e.viewDuration,
        converted: e.converted ?? false,
        eventType: e.eventType ?? 'recommendation',
      })),
    })
  }

  /**
   * 跟踪用户交互（点击、浏览时长、转化）
   */
  async trackInteraction(eventId: bigint, data: TrackInteractionData): Promise<RecommendationEvent> {
    return this.prisma.recommendationEvent.update({
      where: { id: eventId },
      data: {
        clicked: data.clicked ?? undefined,
        viewDuration: data.viewDuration ?? undefined,
        converted: data.converted ?? undefined,
      },
    })
  }

  /**
   * 查询指定时间范围的事件
   */
  async listEventsByDateRange(
    moduleCode: string,
    startDate: Date,
    endDate: Date,
    where?: Prisma.RecommendationEventWhereInput,
  ): Promise<RecommendationEvent[]> {
    return this.prisma.recommendationEvent.findMany({
      where: {
        moduleCode,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        ...where,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 统计推荐指标
   */
  async getMetrics(
    moduleCode: string,
    startDate: Date,
    endDate: Date,
    groupBy?: 'matchReason' | 'clicked' | 'converted',
  ): Promise<any> {
    const events = await this.listEventsByDateRange(moduleCode, startDate, endDate)

    const metrics = {
      impressions: events.length,
      clicks: events.filter((e) => e.clicked).length,
      ctr: 0,
      conversions: events.filter((e) => e.converted).length,
      conversionRate: 0,
      avgViewDuration: 0,
      totalScore: 0,
      avgScore: 0,
    }

    // 计算比率
    if (metrics.impressions > 0) {
      metrics.ctr = metrics.clicks / metrics.impressions
      metrics.conversionRate = metrics.conversions / (metrics.clicks || 1)
    }

    // 计算平均浏览时长
    const viewEvents = events.filter((e) => e.viewDuration && e.viewDuration > 0)
    if (viewEvents.length > 0) {
      metrics.avgViewDuration = viewEvents.reduce((sum, e) => sum + (e.viewDuration ?? 0), 0) / viewEvents.length
    }

    // 计算评分统计
    metrics.totalScore = events.reduce((sum, e) => sum + (e.baseScore ?? 0) + (e.primaryScore ?? 0) + (e.secondaryScore ?? 0) + (e.fallbackScore ?? 0), 0)
    metrics.avgScore = events.length > 0 ? metrics.totalScore / events.length : 0

    // 按分组维度统计
    if (groupBy === 'matchReason') {
      const grouped: Record<string, any> = {}
      for (const event of events) {
        if (!grouped[event.matchReason]) {
          grouped[event.matchReason] = {
            count: 0,
            clicks: 0,
            conversions: 0,
            totalViewDuration: 0,
            viewCount: 0,
          }
        }
        grouped[event.matchReason].count++
        if (event.clicked) grouped[event.matchReason].clicks++
        if (event.converted) grouped[event.matchReason].conversions++
        if (event.viewDuration) {
          grouped[event.matchReason].totalViewDuration += event.viewDuration
          grouped[event.matchReason].viewCount++
        }
      }

      // 计算比率
      for (const reason in grouped) {
        const g = grouped[reason]
        g.ctr = g.count > 0 ? g.clicks / g.count : 0
        g.conversionRate = g.clicks > 0 ? g.conversions / g.clicks : 0
        g.avgViewDuration = g.viewCount > 0 ? g.totalViewDuration / g.viewCount : 0
        delete g.totalViewDuration
        delete g.viewCount
      }

      return { ...metrics, byMatchReason: grouped }
    }

    return metrics
  }

  /**
   * 删除过期事件（超过 N 天）
   */
  async deleteOldEvents(olderThanDays: number): Promise<Prisma.BatchPayload> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    return this.prisma.recommendationEvent.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })
  }
}
