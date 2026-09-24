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
      const paidOrdersWithoutPayment = await this.prisma.shopOrder.findMany({
        where: { paymentStatus: 'paid', payments: { none: {} } },
        select: { orderNo: true },
      })
      if (paidOrdersWithoutPayment.length) {
        this.logger.warn(
          `Found ${paidOrdersWithoutPayment.length} paid orders without payment records: ${paidOrdersWithoutPayment
            .map((order) => order.orderNo)
            .join(', ')}`
        )
      }

      const successPaymentsUnpaidOrders = await this.prisma.shopPayment.findMany({
        where: { status: 'success', order: { paymentStatus: { not: 'paid' } } },
        select: { outTradeNo: true },
      })
      if (successPaymentsUnpaidOrders.length) {
        this.logger.warn(
          `Found ${successPaymentsUnpaidOrders.length} successful payments with unpaid orders: ${successPaymentsUnpaidOrders
            .map((payment) => payment.outTradeNo)
            .join(', ')}`
        )
      }

      const successfulRefunds = await this.prisma.shopRefund.findMany({
        where: {
          status: 'success',
          order: { fulfillmentStatus: { not: 'refunded' } },
        },
        select: { refundNo: true, order: { select: { orderNo: true } } },
      })
      if (successfulRefunds.length) {
        this.logger.warn(
          `Successful refunds require order and inventory audit: ${successfulRefunds
            .map((refund) => `${refund.refundNo}/${refund.order.orderNo}`)
            .join(', ')}`
        )
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
