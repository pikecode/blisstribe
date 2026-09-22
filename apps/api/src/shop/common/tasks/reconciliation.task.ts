import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../../common/prisma.service'

@Injectable()
export class ReconciliationTask {
  private readonly logger = new Logger(ReconciliationTask.name)

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilePayments() {
    try {
      // Find orders with status='paid' but no corresponding payment record
      const paidOrdersWithoutPayment = await this.prisma.shopOrder.findMany({
        where: {
          paymentStatus: 'paid',
          payments: { none: {} }
        }
      })

      if (paidOrdersWithoutPayment.length > 0) {
        this.logger.warn(
          `Found ${paidOrdersWithoutPayment.length} paid orders without payment records: ${paidOrdersWithoutPayment
            .map((o) => o.orderNo)
            .join(', ')}`
        )
      }

      // Find payment records with status='success' but order not marked as paid
      const successPaymentsUnpaidOrders = await this.prisma.shopPayment.findMany({
        where: {
          status: 'success',
          order: {
            paymentStatus: { not: 'paid' }
          }
        },
        include: { order: true }
      })

      if (successPaymentsUnpaidOrders.length > 0) {
        this.logger.warn(
          `Found ${successPaymentsUnpaidOrders.length} successful payments with unpaid orders: ${successPaymentsUnpaidOrders
            .map((p) => p.outTradeNo)
            .join(', ')}`
        )

        // Auto-fix: mark these orders as paid
        for (const payment of successPaymentsUnpaidOrders) {
          try {
            await this.prisma.shopOrder.update({
              where: { id: payment.orderId },
              data: {
                paymentStatus: 'paid',
                status: 'paid',
                paidAt: payment.paidAt || new Date()
              }
            })
          } catch (error) {
            this.logger.error(
              `Failed to auto-fix order ${payment.order.orderNo}`,
              error instanceof Error ? error.message : String(error)
            )
          }
        }

        this.logger.log(`Auto-fixed ${successPaymentsUnpaidOrders.length} orders`)
      }

      // Find refunds with status='refund_success' but inventory not restored
      const refundedOrders = await this.prisma.shopRefund.findMany({
        where: { status: 'refund_success' },
        include: { order: { include: { items: true } } }
      })

      const ordersNeedingRestore = []

      // Check if products have inventory that needs restoring
      for (const refund of refundedOrders) {
        let needsRestore = false
        for (const item of refund.order.items) {
          // Check current product state
          const product = await this.prisma.shopProduct.findUnique({
            where: { id: item.productId }
          })
          // If sold stock is still high, inventory wasn't restored
          if (product && product.soldStock >= item.quantity) {
            needsRestore = true
            break
          }
        }

        if (needsRestore) {
          ordersNeedingRestore.push(refund)
        }
      }

      if (ordersNeedingRestore.length > 0) {
        this.logger.warn(
          `Found ${ordersNeedingRestore.length} refunded orders with inventory not restored: ${ordersNeedingRestore
            .map((r) => r.order.orderNo)
            .join(', ')}`
        )

        // Restore inventory
        for (const refund of ordersNeedingRestore) {
          try {
            await this.prisma.$transaction(async (tx) => {
              for (const item of refund.order.items) {
                await tx.shopProduct.update({
                  where: { id: item.productId },
                  data: { soldStock: { decrement: item.quantity } }
                })
              }
            })
          } catch (error) {
            this.logger.error(
              `Failed to restore inventory for order ${refund.order.orderNo}`,
              error instanceof Error ? error.message : String(error)
            )
          }
        }

        this.logger.log(`Restored inventory for ${ordersNeedingRestore.length} refunded orders`)
      }

      this.logger.log('Payment reconciliation completed')
    } catch (error) {
      this.logger.error(
        'Failed to reconcile payments',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
}
