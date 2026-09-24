import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, jest } from '@jest/globals'

jest.unstable_mockModule('../../apps/api/src/common/prisma.service', () => ({
  PrismaService: class PrismaService {},
}))
jest.unstable_mockModule('../../apps/api/src/shop/refund/refund.repository', () => ({
  RefundRepository: class RefundRepository {},
}))
jest.unstable_mockModule('../../apps/api/src/shop/order/order.repository', () => ({
  OrderRepository: class OrderRepository {},
}))
jest.unstable_mockModule('../../apps/api/src/shop/payment/payment.service', () => ({
  PaymentService: class PaymentService {},
}))

const { RefundService } = await import('../../apps/api/src/shop/refund/refund.service')

describe('RefundService', () => {
  const orderId = 20n
  const refundId = 30n
  const refund = {
    id: refundId,
    orderId,
    outRefundNo: 'OUT-1',
    requestedAmountFen: 1500,
    status: 'pending',
  }
  const order = {
    id: orderId,
    userId: 10n,
    paymentStatus: 'paid',
    fulfillmentStatus: 'pending',
    paymentAmountFen: 1500,
    refundedAmountFen: 0,
    completedAt: null,
  }

  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: orderId }]),
      shopOrder: {
        findUnique: jest.fn().mockResolvedValue(order),
      },
      shopRefund: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(refund),
      },
    }
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      shopRefund: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{
          ...refund,
          adminNotes: 'internal note',
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
        count: jest.fn().mockResolvedValue(1),
      },
    }
    const refundRepository = {
      findById: jest.fn().mockResolvedValue(refund),
    }
    const orderRepository = {
      findById: jest.fn().mockResolvedValue(order),
    }
    const paymentService = {
      processRefund: jest.fn().mockResolvedValue({ refundId: 'wx-refund-1' }),
    }
    const service = new RefundService(
      prisma as never,
      refundRepository as never,
      orderRepository as never,
      paymentService as never
    )
    return { service, tx, prisma, paymentService }
  }

  it('rejects partial refund amounts', async () => {
    const { service, prisma } = setup()

    await expect(
      service.requestRefund(10n, orderId, { amountInFen: 1499 } as never)
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('does not expose internal admin notes in user refund lists', async () => {
    const { service } = setup()

    const result = await service.getUserRefunds(10n, { page: 1, limit: 20 })

    expect(result.refunds[0]).not.toHaveProperty('adminNotes')
    expect(result.refunds[0]).not.toHaveProperty('rejectionReason')
  })

  it('creates a full refund request only when no active request exists', async () => {
    const { service, tx } = setup()

    await service.requestRefund(10n, orderId, { amountInFen: 1500 } as never)

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
    expect(tx.shopRefund.findFirst).toHaveBeenCalledWith({
      where: { orderId, status: { in: ['pending', 'processing', 'approved'] } },
    })
    expect(tx.shopRefund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId, requestedAmountFen: 1500 }),
    })
  })

  it('persists processing before calling the external refund provider', async () => {
    const { service, tx, paymentService } = setup()

    const result = await service.approveRefund(refundId, 99n, '核准')

    expect(tx.shopRefund.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: refundId, status: 'pending' },
      data: expect.objectContaining({
        status: 'processing',
        approvedAmountFen: 1500,
        approvedByAdminId: 99n,
      }),
    }))
    expect(paymentService.processRefund).toHaveBeenCalledWith(orderId, 'OUT-1', 1500)
    expect(result.status).toBe('processing')
  })
})
