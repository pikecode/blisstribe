// src/product/services/product-lead-cleanup.scheduler.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ProductLeadCleanupService } from './product-lead-cleanup.service';

interface CleanupAlert {
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  details?: Record<string, any>;
}

@Injectable()
export class ProductLeadCleanupScheduler implements OnModuleInit {
  private readonly logger = new Logger(ProductLeadCleanupScheduler.name);
  private lastCleanupStatus: {
    timestamp: Date;
    status: 'success' | 'failed';
    archived: number;
    deleted: number;
  } | null = null;

  constructor(
    private prisma: PrismaService,
    private cleanupService: ProductLeadCleanupService,
  ) {}

  onModuleInit() {
    this.logger.log('✅ ProductLeadCleanupScheduler initialized');
    this.logger.log('📅 Daily cleanup scheduled for 02:00 (Asia/Shanghai)');
    this.logger.log('📅 Weekly deep cleanup scheduled for 03:00 Monday (Asia/Shanghai)');
  }

  // 每天 02:00 运行自动清理
  @Cron('0 2 * * *', { timeZone: 'Asia/Shanghai' })
  async runDailyCleanup() {
    const startTime = Date.now();
    const scheduledTime = new Date();

    this.logger.log(
      '═══════════════════════════════════════════════════════════'
    );
    this.logger.log('🔄 Daily Lead Cleanup Started');
    this.logger.log(
      '═══════════════════════════════════════════════════════════'
    );

    let archivedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    try {
      // 步骤 1: 90天自动归档
      this.logger.log('📦 [Step 1/2] Archiving completed leads (90+ days)...');
      const archiveStats = await this.cleanupService.archiveCompletedLeads(90);
      archivedCount = archiveStats.count || 0;
      this.logger.log(`   ✅ Archived ${archivedCount} leads`);

      // 步骤 2: 180天自动删除
      this.logger.log('🗑️  [Step 2/2] Deleting abandoned leads (180+ days)...');
      const deleteStats = await this.cleanupService.deleteAbandonedLeads(180);
      deletedCount = deleteStats.count || 0;
      this.logger.log(`   ✅ Deleted ${deletedCount} leads`);

      // 记录操作
      const operation = await this.prisma.productLeadCleanupOperation.create({
        data: {
          operationType: 'AUTO_CLEANUP',
          scheduledTime,
          executedTime: new Date(),
          archivedCount,
          deletedCount,
          errorCount: 0,
          status: 'SUCCESS',
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Cleanup completed successfully in ${duration}ms`);
      this.logger.log(`   📊 Operation ID: ${operation.id}`);
      this.logger.log(`   📊 Archived: ${archivedCount}`);
      this.logger.log(`   📊 Deleted: ${deletedCount}`);
      this.logger.log(`   📊 Duration: ${duration}ms`);

      // 更新本地状态
      this.lastCleanupStatus = {
        timestamp: new Date(),
        status: 'success',
        archived: archivedCount,
        deleted: deletedCount,
      };

      // 发送成功通知
      await this.sendAlert({
        level: 'INFO',
        title: '✅ Daily Lead Cleanup Success',
        message: `Archived ${archivedCount} leads, deleted ${deletedCount} leads`,
        details: {
          duration: `${duration}ms`,
          operationId: operation.id,
        },
      });
    } catch (error) {
      errorCount = 1;
      this.logger.error('❌ Daily cleanup failed:', error);

      // 记录失败操作
      await this.prisma.productLeadCleanupOperation.create({
        data: {
          operationType: 'AUTO_CLEANUP',
          scheduledTime,
          executedTime: new Date(),
          archivedCount,
          deletedCount,
          errorCount,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      this.lastCleanupStatus = {
        timestamp: new Date(),
        status: 'failed',
        archived: archivedCount,
        deleted: deletedCount,
      };

      // 发送错误告警
      await this.sendAlert({
        level: 'ERROR',
        title: '❌ Daily Lead Cleanup Failed',
        message: `Error during cleanup: ${error instanceof Error ? error.message : String(error)}`,
        details: {
          archived: archivedCount,
          deleted: deletedCount,
          error: error instanceof Error ? error.stack : String(error),
        },
      });
    }

    this.logger.log(
      '═══════════════════════════════════════════════════════════'
    );
  }

  // 每周一 03:00 运行深度清理
  @Cron('0 3 * * 1', { timeZone: 'Asia/Shanghai' })
  async runWeeklyDeepCleanup() {
    const startTime = Date.now();
    const scheduledTime = new Date();

    this.logger.log(
      '═══════════════════════════════════════════════════════════'
    );
    this.logger.log('🔍 Weekly Deep Cleanup Started (Consistency Check)');
    this.logger.log(
      '═══════════════════════════════════════════════════════════'
    );

    try {
      // 检查数据一致性
      this.logger.log('🔎 [Step 1/2] Checking data consistency...');
      const inconsistencies = await this.detectInconsistencies();
      this.logger.log(`   Found ${inconsistencies.length} inconsistencies`);

      if (inconsistencies.length > 0) {
        this.logger.warn('   🔧 Fixing inconsistencies...');
        await this.fixInconsistencies(inconsistencies);
        this.logger.log(`   ✅ Fixed ${inconsistencies.length} issues`);
      }

      // 检查重复记录
      this.logger.log('🔎 [Step 2/2] Checking for duplicate records...');
      const duplicates = await this.detectDuplicates();
      this.logger.log(`   Found ${duplicates.length} duplicates`);

      if (duplicates.length > 0) {
        this.logger.warn('   🔧 Removing duplicates...');
        await this.removeDuplicates(duplicates);
        this.logger.log(`   ✅ Removed ${duplicates.length} duplicates`);
      }

      // 记录操作
      const operation = await this.prisma.productLeadCleanupOperation.create({
        data: {
          operationType: 'DEEP_CLEANUP',
          scheduledTime,
          executedTime: new Date(),
          archivedCount: inconsistencies.length,
          deletedCount: duplicates.length,
          errorCount: 0,
          status: 'SUCCESS',
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Deep cleanup completed in ${duration}ms`);
      this.logger.log(`   Operation ID: ${operation.id}`);

      await this.sendAlert({
        level: 'INFO',
        title: '✅ Weekly Deep Cleanup Success',
        message: `Fixed ${inconsistencies.length} inconsistencies, removed ${duplicates.length} duplicates`,
        details: {
          duration: `${duration}ms`,
          operationId: operation.id,
        },
      });
    } catch (error) {
      this.logger.error('❌ Weekly deep cleanup failed:', error);

      await this.prisma.productLeadCleanupOperation.create({
        data: {
          operationType: 'DEEP_CLEANUP',
          scheduledTime,
          executedTime: new Date(),
          archivedCount: 0,
          deletedCount: 0,
          errorCount: 1,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      await this.sendAlert({
        level: 'ERROR',
        title: '❌ Weekly Deep Cleanup Failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    this.logger.log(
      '═══════════════════════════════════════════════════════════'
    );
  }

  // 每小时监控定时任务健康状态
  @Cron('0 * * * *', { timeZone: 'Asia/Shanghai' })
  async monitorCleanupHealth() {
    try {
      // 获取最近的清理操作
      const lastCleanup = await this.prisma.productLeadCleanupOperation.findFirst({
        where: {
          operationType: 'AUTO_CLEANUP',
        },
        orderBy: {
          executedTime: 'desc',
        },
      });

      if (!lastCleanup) {
        this.logger.warn('⚠️  No cleanup operation found in database');
        return;
      }

      // 计算距离最后一次清理的小时数
      const hoursAgo =
        (Date.now() - lastCleanup.executedTime.getTime()) / (1000 * 60 * 60);

      if (hoursAgo > 25) {
        // 超过 25 小时未清理 (允许 1 小时浮动)
        this.logger.error(
          `❌ Cleanup health check FAILED: Last cleanup was ${hoursAgo.toFixed(1)} hours ago`
        );

        await this.sendAlert({
          level: 'CRITICAL',
          title: '🚨 Lead Cleanup Task Not Running',
          message: `Last cleanup was ${hoursAgo.toFixed(1)} hours ago. Task may be stuck or disabled.`,
          details: {
            lastCleanupTime: lastCleanup.executedTime,
            lastStatus: lastCleanup.status,
          },
        });
      } else {
        this.logger.debug(
          `✅ Cleanup health check passed. Last run: ${hoursAgo.toFixed(1)} hours ago`
        );
      }
    } catch (error) {
      this.logger.error('Health check query failed:', error);
    }
  }

  // 获取最后一次清理状态
  async getLastCleanupStatus() {
    return (
      this.lastCleanupStatus ||
      (await this.prisma.productLeadCleanupOperation.findFirst({
        orderBy: { executedTime: 'desc' },
      }))
    );
  }

  // 私有方法: 检测数据一致性问题
  private async detectInconsistencies() {
    const issues: Array<{ type: string; id: string }> = [];

    // 检查 1: archived leads 的 status 应该是 ARCHIVED
    const badArchived = await this.prisma.productLead.findMany({
      where: {
        archivedAt: { not: null },
        status: { not: 'ARCHIVED' },
      },
      select: { id: true },
    });

    issues.push(
      ...badArchived.map((lead) => ({
        type: 'inconsistent_archived_status',
        id: lead.id,
      }))
    );

    // 检查 2: 日期逻辑 (archivedAt 不应该在 createdAt 之前)
    const badDates = await this.prisma.productLead.findMany({
      where: {
        archivedAt: {
          lt: this.prisma.productLead.fields.createdAt,
        },
      },
      select: { id: true },
    });

    issues.push(
      ...badDates.map((lead) => ({
        type: 'invalid_date_order',
        id: lead.id,
      }))
    );

    return issues;
  }

  // 私有方法: 检测重复记录
  private async detectDuplicates() {
    // 查找重复的 (userId, productId) 组合
    const duplicates = await this.prisma.$queryRaw`
      SELECT userId, productId, COUNT(*) as count,
             GROUP_CONCAT(id) as ids
      FROM ProductLead
      GROUP BY userId, productId
      HAVING count > 1
    `;

    return (duplicates as any[]) || [];
  }

  // 私有方法: 修复数据一致性问题
  private async fixInconsistencies(issues: Array<{ type: string; id: string }>) {
    for (const issue of issues) {
      if (issue.type === 'inconsistent_archived_status') {
        await this.prisma.productLead.update({
          where: { id: issue.id },
          data: { status: 'ARCHIVED' },
        });
      } else if (issue.type === 'invalid_date_order') {
        // 重置 archivedAt 为 null
        await this.prisma.productLead.update({
          where: { id: issue.id },
          data: { archivedAt: null },
        });
      }
    }
  }

  // 私有方法: 移除重复记录
  private async removeDuplicates(
    duplicates: Array<{ userId: string; productId: string; ids: string }>
  ) {
    for (const dup of duplicates) {
      const ids = (dup.ids as string).split(',');
      // 保留第一个，删除其他
      const toDelete = ids.slice(1);

      await this.prisma.productLead.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });
    }
  }

  // 私有方法: 发送告警
  private async sendAlert(alert: CleanupAlert) {
    const timestamp = new Date().toISOString();
    const prefix = {
      INFO: '📢',
      WARN: '⚠️',
      ERROR: '❌',
      CRITICAL: '🚨',
    }[alert.level];

    const message = `[${timestamp}] ${prefix} [${alert.level}] ${alert.title}
${alert.message}${
      alert.details
        ? '\nDetails: ' + JSON.stringify(alert.details, null, 2)
        : ''
    }`;

    this.logger.log(message);

    // TODO: 集成 Slack/Email 告警
    // 示例:
    // await this.slackService.sendAlert({
    //   channel: '#alerts-lead-cleanup',
    //   text: message,
    //   level: alert.level,
    // });
  }
}
