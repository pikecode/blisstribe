import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import type { Prisma } from '@prisma/client'

export interface CleanupResult {
  archivedCount: number
  deletedCount: number
  totalProcessed: number
}

@Injectable()
export class ProductLeadCleanupService {
  private readonly logger = new Logger(ProductLeadCleanupService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 执行 Lead 清理流程
   * 规则1：已完成 lead 超过 90 天 → 存档
   * 规则2：新 lead 超过 180 天未跟进 → 删除
   */
  async runCleanup(): Promise<CleanupResult> {
    const now = new Date()
    let archivedCount = 0
    let deletedCount = 0

    try {
      // 规则1：存档已完成的 lead（90 天）
      const archiveDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const archived = await this.archiveCompletedLeads(archiveDate)
      archivedCount = archived.count

      // 规则2：删除长期未跟进的新 lead（180 天）
      const deleteDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      const deleted = await this.deleteAbandonedLeads(deleteDate)
      deletedCount = deleted.count

      // 记录清理操作
      await this.recordCleanupOperation('lead_cleanup', archivedCount + deletedCount, `Archived: ${archivedCount}, Deleted: ${deletedCount}`)

      const result = {
        archivedCount,
        deletedCount,
        totalProcessed: archivedCount + deletedCount,
      }

      this.logger.log(`Lead cleanup completed: ${JSON.stringify(result)}`)
      return result
    } catch (error) {
      this.logger.error('Lead cleanup failed:', error)
      throw error
    }
  }

  /**
   * 存档已完成的 lead（超过 N 天）
   */
  private async archiveCompletedLeads(beforeDate: Date): Promise<Prisma.BatchPayload> {
    const result = await this.prisma.productLead.updateMany({
      where: {
        status: 'converted', // 已完成状态
        updatedAt: { lt: beforeDate },
        archived: false, // 未存档的
      },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    })

    this.logger.log(`Archived ${result.count} completed leads`)
    return result
  }

  /**
   * 删除长期未跟进的新 lead（超过 N 天）
   */
  private async deleteAbandonedLeads(beforeDate: Date): Promise<Prisma.BatchPayload> {
    // 先获取要删除的 lead ID，用于记录日志
    const leads = await this.prisma.productLead.findMany({
      where: {
        status: 'new', // 新 lead 未跟进
        createdAt: { lt: beforeDate },
      },
      select: { id: true },
      take: 1000,
    })

    const result = await this.prisma.productLead.deleteMany({
      where: {
        status: 'new',
        createdAt: { lt: beforeDate },
      },
    })

    this.logger.log(`Deleted ${result.count} abandoned leads`)
    return result
  }

  /**
   * 获取清理前的统计数据
   */
  async getCleanupStats(): Promise<{
    readyToArchive: number
    readyToDelete: number
  }> {
    const now = new Date()
    const archiveDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const deleteDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

    const [readyToArchive, readyToDelete] = await Promise.all([
      this.prisma.productLead.count({
        where: {
          status: 'converted',
          updatedAt: { lt: archiveDate },
          archived: false,
        },
      }),
      this.prisma.productLead.count({
        where: {
          status: 'new',
          createdAt: { lt: deleteDate },
        },
      }),
    ])

    return { readyToArchive, readyToDelete }
  }

  /**
   * 记录清理操作到数据库
   */
  private async recordCleanupOperation(cleanupType: string, leadCount: number, reason: string): Promise<void> {
    try {
      await this.prisma.productLeadCleanup.create({
        data: {
          cleanupType,
          leadCount,
          reason,
          executedAt: new Date(),
        },
      })
    } catch (error) {
      this.logger.error('Failed to record cleanup operation:', error)
      // 不中断主流程
    }
  }

  /**
   * 获取清理历史
   */
  async getCleanupHistory(limit: number = 30): Promise<any[]> {
    return this.prisma.productLeadCleanup.findMany({
      orderBy: { executedAt: 'desc' },
      take: limit,
    })
  }

  /**
   * 手动清理特定日期前的 lead
   */
  async manualCleanup(beforeDate: Date, options?: { archiveOnly?: boolean; deleteOnly?: boolean }): Promise<CleanupResult> {
    let archivedCount = 0
    let deletedCount = 0

    if (!options?.deleteOnly) {
      const archived = await this.archiveCompletedLeads(beforeDate)
      archivedCount = archived.count
    }

    if (!options?.archiveOnly) {
      const deleted = await this.deleteAbandonedLeads(beforeDate)
      deletedCount = deleted.count
    }

    await this.recordCleanupOperation('manual_cleanup', archivedCount + deletedCount, `BeforeDate: ${beforeDate.toISOString()}`)

    return {
      archivedCount,
      deletedCount,
      totalProcessed: archivedCount + deletedCount,
    }
  }
}
