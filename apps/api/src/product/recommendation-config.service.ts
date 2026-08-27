import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import type { Prisma, RecommendationConfig } from '@prisma/client'

export interface RecommendationConfigData {
  moduleCode: string
  primaryTagWeight?: number
  secondaryTagWeight?: number
  fallbackTagWeight?: number
  maxUserTagWeight?: number
  maxAssessmentWeight?: number
  assessmentVsUserRatio?: number
  enableRuleBoost?: boolean
  ruleBoostMultiplier?: number
  duplicationWindow?: number
  limitPerRequest?: number
  status?: number
}

@Injectable()
export class RecommendationConfigService {
  // 内存缓存，5分钟过期
  private configCache = new Map<string, { data: RecommendationConfig; expireAt: number }>()

  constructor(private readonly prisma: PrismaService) {}

  private getCacheKey(moduleCode: string): string {
    return `rec_config_${moduleCode}`
  }

  private isCacheValid(moduleCode: string): boolean {
    const cached = this.configCache.get(this.getCacheKey(moduleCode))
    if (!cached) return false
    return Date.now() < cached.expireAt
  }

  /**
   * 获取推荐配置（带缓存）
   */
  async getConfig(moduleCode: string): Promise<RecommendationConfig> {
    const key = this.getCacheKey(moduleCode)

    // 检查缓存
    if (this.isCacheValid(moduleCode)) {
      return this.configCache.get(key)!.data
    }

    // 从数据库读取
    const config = await this.prisma.recommendationConfig.findUnique({
      where: { moduleCode },
    })

    if (!config) {
      // 返回默认配置
      return this.getDefaultConfig(moduleCode)
    }

    // 更新缓存（5分钟过期）
    this.configCache.set(key, {
      data: config,
      expireAt: Date.now() + 5 * 60 * 1000,
    })

    return config
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(moduleCode: string): RecommendationConfig {
    return {
      id: 0n,
      moduleCode,
      primaryTagWeight: 20,
      secondaryTagWeight: 10,
      fallbackTagWeight: 5,
      maxUserTagWeight: 2.0,
      maxAssessmentWeight: 3.0,
      assessmentVsUserRatio: 0.7,
      enableRuleBoost: true,
      ruleBoostMultiplier: 1.5,
      duplicationWindow: 7,
      limitPerRequest: 100,
      status: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * 创建或更新推荐配置
   */
  async upsertConfig(data: RecommendationConfigData): Promise<RecommendationConfig> {
    const config = await this.prisma.recommendationConfig.upsert({
      where: { moduleCode: data.moduleCode },
      update: {
        primaryTagWeight: data.primaryTagWeight,
        secondaryTagWeight: data.secondaryTagWeight,
        fallbackTagWeight: data.fallbackTagWeight,
        maxUserTagWeight: data.maxUserTagWeight,
        maxAssessmentWeight: data.maxAssessmentWeight,
        assessmentVsUserRatio: data.assessmentVsUserRatio,
        enableRuleBoost: data.enableRuleBoost,
        ruleBoostMultiplier: data.ruleBoostMultiplier,
        duplicationWindow: data.duplicationWindow,
        limitPerRequest: data.limitPerRequest,
        status: data.status,
      },
      create: {
        moduleCode: data.moduleCode,
        primaryTagWeight: data.primaryTagWeight ?? 20,
        secondaryTagWeight: data.secondaryTagWeight ?? 10,
        fallbackTagWeight: data.fallbackTagWeight ?? 5,
        maxUserTagWeight: data.maxUserTagWeight ?? 2.0,
        maxAssessmentWeight: data.maxAssessmentWeight ?? 3.0,
        assessmentVsUserRatio: data.assessmentVsUserRatio ?? 0.7,
        enableRuleBoost: data.enableRuleBoost ?? true,
        ruleBoostMultiplier: data.ruleBoostMultiplier ?? 1.5,
        duplicationWindow: data.duplicationWindow ?? 7,
        limitPerRequest: data.limitPerRequest ?? 100,
        status: data.status ?? 1,
      },
    })

    // 清除缓存
    this.configCache.delete(this.getCacheKey(data.moduleCode))

    return config
  }

  /**
   * 获取所有配置
   */
  async listConfigs(status?: number): Promise<RecommendationConfig[]> {
    return this.prisma.recommendationConfig.findMany({
      where: status !== undefined ? { status } : {},
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 清除缓存
   */
  clearCache(moduleCode?: string): void {
    if (moduleCode) {
      this.configCache.delete(this.getCacheKey(moduleCode))
    } else {
      this.configCache.clear()
    }
  }
}
