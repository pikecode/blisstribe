import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../common/prisma.service'
import { PaymentService } from '../../payment/payment.service'

@Injectable()
export class ExpiredOrderTask {
  private readonly logger = new Logger(ExpiredOrderTask.name)

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOrders() {
    try {
      const now = new Date()

      // 只标记候选订单；渠道确认前不取消订单或释放库存。
      const expiredOrders = await this.prisma.shopOrder.findMany({
        where: {
          OR: [
            { status: 'closing' },
            { status: 'pending_payment', expiresAt: { lt: now } },
          ],
        },
      })

      if (expiredOrders.length === 0) {
        return
      }

      for (const order of expiredOrders) {
        try {
          await this.paymentService.closeUnpaidOrder(
            order.id,
            'Order expired (unpaid for 15 minutes)'
          )
        } catch (error) {
          this.logger.error(
            `Failed to cancel expired order ${order.orderNo}`,
            error instanceof Error ? error.message : String(error)
          )
          // Continue processing remaining orders
        }
      }

      this.logger.log(`Checked ${expiredOrders.length} expired orders for channel closure`)
    } catch (error) {
      this.logger.error(
        'Failed to process expired orders',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}
