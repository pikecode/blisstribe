// src/product/services/recommendation-cache-warmup.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CacheService } from '@/common/cache/cache.service';
import { RecommendationConfigService } from './recommendation-config.service';
import { PrismaService } from '@/common/prisma/prisma.service';

interface CacheWarmupStats {
  timestamp: Date;
  configsWarmed: number;
  duration: number;
  hitRate: number;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

@Injectable()
export class RecommendationCacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(
    RecommendationCacheWarmupService.name
  );
  private warmupStats: CacheWarmupStats | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟
  private readonly CONFIG_CACHE_PREFIX = 'recommendation-config';

  constructor(
    private cache: CacheService,
    private configService: RecommendationConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('🔥 RecommendationCacheWarmupService initializing...');

    try {
      // 应用启动时预热缓存
      await this.warmupCache();
      this.logger.log('✅ Cache warmup completed on module init');
    } catch (error) {
      this.logger.error('❌ Cache warmup failed on module init:', error);
      // 不阻止应用启动，可以通过手动 API 重试
    }
  }

  /**
   * 预热所有推荐配置缓存
   */
  async warmupCache(): Promise<CacheWarmupStats> {
    const startTime = Date.now();
    const errors: string[] = [];
    let configsWarmed = 0;

    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('🔥 Cache Warmup Started');
    this.logger.log('═══════════════════════════════════════════════════════');

    try {
      // 获取所有配置
      this.logger.log('📥 Fetching all recommendation configurations...');
      const allConfigs = await this.configService.getAllConfigs();

      this.logger.log(`✅ Found ${allConfigs.length} configurations`);

      // 预热每个配置
      for (const config of allConfigs) {
        try {
          const cacheKey = `${this.CONFIG_CACHE_PREFIX}:${config.moduleCode}`;

          // 设置缓存
          await this.cache.set(cacheKey, config, this.CACHE_TTL);

          configsWarmed++;

          this.logger.debug(
            `✅ Warmed config: ${config.moduleCode} (TTL: 5min)`
          );
        } catch (error) {
          const errorMsg = `Failed to warm config ${config.moduleCode}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMsg);
          this.logger.error(`❌ ${errorMsg}`);
        }
      }

      // 预热热门配置 (额外加热)
      this.logger.log('🔥 Extra heating popular configurations...');
      const popularConfigs = allConfigs.slice(0, 3); // 前 3 个最常用

      for (const config of popularConfigs) {
        const cacheKey = `${this.CONFIG_CACHE_PREFIX}:${config.moduleCode}:popular`;
        await this.cache.set(cacheKey, config, this.CACHE_TTL);
        this.logger.debug(`🔥 Extra heated: ${config.moduleCode}`);
      }

      const duration = Date.now() - startTime;
      const hitRate = configsWarmed / allConfigs.length;

      this.warmupStats = {
        timestamp: new Date(),
        configsWarmed,
        duration,
        hitRate,
        status: errors.length === 0 ? 'success' : 'partial',
        errors,
      };

      this.logger.log(`✅ Cache warmup completed successfully`);
      this.logger.log(`   📊 Configs warmed: ${configsWarmed}/${allConfigs.length}`);
      this.logger.log(`   📊 Hit rate: ${(hitRate * 100).toFixed(1)}%`);
      this.logger.log(`   📊 Duration: ${duration}ms`);
      this.logger.log('═══════════════════════════════════════════════════════');

      return this.warmupStats;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.warmupStats = {
        timestamp: new Date(),
        configsWarmed,
        duration,
        hitRate: configsWarmed > 0 ? configsWarmed / 10 : 0, // 估计值
        status: 'failed',
        errors: [errorMsg, ...errors],
      };

      this.logger.error(
        `❌ Cache warmup failed: ${errorMsg}`
      );
      this.logger.log('═══════════════════════════════════════════════════════');

      throw error;
    }
  }

  /**
   * 定期刷新缓存 (每 4 小时)
   * 防止缓存过期
   */
  @Cron('0 */4 * * *', { timeZone: 'Asia/Shanghai' })
  async refreshCacheIfNeeded() {
    this.logger.log('🔄 Cache Refresh Check Started (4-hour cycle)');

    try {
      const configs = await this.configService.getAllConfigs();
      let refreshedCount = 0;
      const errors: string[] = [];

      for (const config of configs) {
        try {
          const cacheKey = `${this.CONFIG_CACHE_PREFIX}:${config.moduleCode}`;
          const cached = await this.cache.get(cacheKey);

          if (!cached) {
            // 缓存过期或不存在，重新预热
            await this.cache.set(cacheKey, config, this.CACHE_TTL);
            refreshedCount++;

            this.logger.debug(
              `🔄 Refreshed expired cache: ${config.moduleCode}`
            );
          }
        } catch (error) {
          const errorMsg = `Failed to refresh cache for ${config.moduleCode}`;
          errors.push(errorMsg);
          this.logger.error(`❌ ${errorMsg}`);
        }
      }

      this.logger.log(
        `✅ Cache refresh completed. Refreshed: ${refreshedCount} keys`
      );

      if (errors.length > 0) {
        this.logger.warn(`⚠️  Refresh encountered ${errors.length} errors`);
      }
    } catch (error) {
      this.logger.error('❌ Cache refresh failed:', error);
    }
  }

  /**
   * 监控缓存命中率 (每 5 分钟)
   */
  @Cron('*/5 * * * *', { timeZone: 'Asia/Shanghai' })
  async monitorCacheHitRate() {
    try {
      const stats = await this.cache.getStats();

      if (!stats) {
        this.logger.debug('ℹ️  Cache stats not available');
        return;
      }

      const hitRate =
        stats.hits / (stats.hits + stats.misses) || 0;

      this.logger.debug(
        `📊 Cache stats: Hit rate ${(hitRate * 100).toFixed(1)}% (${stats.hits}/${
          stats.hits + stats.misses
        })`
      );

      // 如果命中率低于目标，发出警告
      if (hitRate < 0.95) {
        this.logger.warn(
          `⚠️  Cache hit rate below 95%: ${(hitRate * 100).toFixed(1)}%`
        );

        // 可选: 触发预热
        if (hitRate < 0.90) {
          this.logger.warn('🔥 Low hit rate detected, triggering warmup...');
          await this.warmupCache();
        }
      }

      // 记录指标到数据库
      await this.recordCacheMetrics({
        hitRate,
        hits: stats.hits,
        misses: stats.misses,
        size: stats.size,
      });
    } catch (error) {
      this.logger.error('❌ Cache monitoring failed:', error);
    }
  }

  /**
   * 手动预热缓存 (通过 API)
   */
  async manualWarmup() {
    return await this.warmupCache();
  }

  /**
   * 获取缓存预热统计
   */
  async getWarmupStats() {
    return this.warmupStats;
  }

  /**
   * 清空特定配置的缓存 (配置更新时调用)
   */
  async invalidateConfig(moduleCode: string) {
    const cacheKey = `${this.CONFIG_CACHE_PREFIX}:${moduleCode}`;

    try {
      await this.cache.delete(cacheKey);
      this.logger.log(`🔄 Invalidated cache for: ${moduleCode}`);

      // 立即重新预热
      const config = await this.configService.getConfig(moduleCode);
      await this.cache.set(cacheKey, config, this.CACHE_TTL);

      this.logger.log(`✅ Cache rewarmed for: ${moduleCode}`);
    } catch (error) {
      this.logger.error(`❌ Failed to invalidate cache for ${moduleCode}:`, error);
    }
  }

  /**
   * 清空所有推荐缓存
   */
  async invalidateAllConfigs() {
    this.logger.log('🧹 Clearing all recommendation caches...');

    try {
      const configs = await this.configService.getAllConfigs();
      let cleared = 0;

      for (const config of configs) {
        const cacheKey = `${this.CONFIG_CACHE_PREFIX}:${config.moduleCode}`;
        try {
          await this.cache.delete(cacheKey);
          cleared++;
        } catch (error) {
          this.logger.error(
            `Failed to clear cache for ${config.moduleCode}`
          );
        }
      }

      this.logger.log(`✅ Cleared ${cleared} cache entries`);

      // 重新预热
      await this.warmupCache();
    } catch (error) {
      this.logger.error('❌ Failed to invalidate all caches:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    return await this.cache.getStats();
  }

  // ==================== 私有方法 ====================

  private async recordCacheMetrics(data: {
    hitRate: number;
    hits: number;
    misses: number;
    size: number;
  }) {
    try {
      await this.prisma.cacheMetrics.create({
        data: {
          hitRate: data.hitRate,
          hits: data.hits,
          misses: data.misses,
          size: data.size,
          recordedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.debug('Failed to record cache metrics:', error);
    }
  }
}
