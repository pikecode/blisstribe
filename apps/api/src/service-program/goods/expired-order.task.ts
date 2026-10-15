import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../common/prisma.service'
import { ServiceOrderService } from '../order/order.service'
import { ServicePaymentService } from '../payment/payment.service'

@Injectable()
export class ServiceExpiredOrderTask {
  private readonly logger = new Logger(ServiceExpiredOrderTask.name)
  private running = false
  constructor(private readonly prisma: PrismaService, private readonly orders: ServiceOrderService, private readonly payments: ServicePaymentService) {}

  @Cron('0 * * * * *')
  async releaseExpired() {
    if (this.running) return
    this.running = true
    try {
      await this.orders.releaseExpiredOrders()
      const rows = await this.prisma.serviceOrder.findMany({ where: { status: 'pending_payment', paymentStatus: 'unpaid', expiresAt: { lte: new Date() }, payments: { some: { status: 'pending' } } }, select: { id: true, userId: true }, orderBy: { expiresAt: 'asc' }, take: 100 })
      for (const row of rows) {
        try { await this.payments.confirmPayment(row.id, row.userId) }
        catch { this.logger.warn(`服务订单 ${row.id} 超时查单失败，保留库存占用等待重试`) }
      }
    } finally { this.running = false }
  }
}
