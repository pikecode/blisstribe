import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<{
    totalUsers: number
    activeUsers: number
    todayNewUsers: number
    disabledUsers: number
  }> {
    const [totalUsers, activeUsers, disabledUsers, todayNewUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 1 } }),
      this.prisma.user.count({ where: { status: 0 } }),
      this.prisma.user.count({
        where: { createdAt: { gte: this.startOfToday() } },
      }),
    ])
    return { totalUsers, activeUsers, disabledUsers, todayNewUsers }
  }

  async registerTrend(days: number): Promise<{ date: string; count: number }[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    })

    // 按天聚合
    const map = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      map.set(d.toISOString().slice(0, 10), 0)
    }
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10)
      map.set(key, (map.get(key) ?? 0) + 1)
    }

    return Array.from(map.entries()).map(([date, count]) => ({ date, count }))
  }

  private startOfToday(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }
}
