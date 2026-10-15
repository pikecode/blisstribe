import { Controller, Get, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { PrismaService } from '../common/prisma.service'

@Controller('admin/service-operations')
@UseGuards(AdminJwtGuard)
export class ServiceOperationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('workbench')
  async workbench() {
    const now = new Date()
    const date = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10)
    const start = new Date(`${date}T00:00:00+08:00`)
    const end = new Date(start.getTime() + 86400000)
    const [appointments, reception, refunds, processing, disputes, overdue] = await Promise.all([
      this.prisma.serviceAppointment.count({ where: { status: 'pending' } }),
      this.prisma.serviceAppointment.count({ where: { status: 'confirmed', requestedStartAt: { gte: start, lt: end } } }),
      this.prisma.serviceRefund.count({ where: { status: 'pending' } }),
      this.prisma.serviceRefund.count({ where: { status: 'processing' } }),
      this.prisma.serviceDispute.count({ where: { status: 'submitted' } }),
      this.prisma.serviceDispute.count({ where: { resolvedAt: null, deadline: { lt: now } } }),
    ])
    return { checkedAt: now, date, items: [
      { key: 'appointments', label: '待确认预约', count: appointments, path: '/service-appointments', query: { status: 'pending' } },
      { key: 'reception', label: '今日待接待', count: reception, path: '/service-appointments', query: { status: 'confirmed', date } },
      { key: 'refunds', label: '待审核退款', count: refunds, path: '/service-refunds', query: { status: 'pending' } },
      { key: 'processing', label: '退款处理中', count: processing, path: '/service-refunds', query: { status: 'processing' } },
      { key: 'disputes', label: '待受理异议', count: disputes, path: '/service-disputes', query: { status: 'submitted' } },
      { key: 'overdue', label: '逾期异议', count: overdue, path: '/service-disputes', query: { overdue: 'true' } },
    ] }
  }
}
