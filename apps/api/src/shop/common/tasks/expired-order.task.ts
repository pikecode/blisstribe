import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../common/prisma.service'

@Injectable()
export class ExpiredOrderTask {
  private readonly logger = new Logger(ExpiredOrderTask.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOrders() {
    try {
      const now = new Date()

      // Find expired pending orders
      const expiredOrders = await this.prisma.shopOrder.findMany({
        where: {
          status: 'pending_payment',
          expiresAt: { lt: now }
        },
        include: { items: true }
      })

      if (expiredOrders.length === 0) {
        return
      }

      // Process each expired order in transaction
      for (const order of expiredOrders) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Release reserved inventory
            for (const item of order.items) {
              await tx.shopProduct.update({
                where: { id: item.productId },
                data: { reservedStock: { decrement: item.quantity } }
              })
            }

            // Mark order as cancelled
            await tx.shopOrder.update({
              where: { id: order.id },
              data: {
                status: 'cancelled',
                cancelledAt: now,
                cancelReason: 'Order expired (unpaid for 15 minutes)'
              }
            })
          })
        } catch (error) {
          this.logger.error(
            `Failed to cancel expired order ${order.orderNo}`,
            error instanceof Error ? error.message : String(error)
          )
          // Continue processing remaining orders
        }
      }

      this.logger.log(`Cancelled ${expiredOrders.length} expired orders`)
    } catch (error) {
      this.logger.error(
        'Failed to process expired orders',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}
