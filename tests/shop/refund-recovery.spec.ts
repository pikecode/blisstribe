import { describe, expect, it, jest } from '@jest/globals'

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class BadRequestException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}))
jest.mock('../../apps/api/src/common/prisma.service', () => ({
  PrismaService: class PrismaService {},
}))
jest.mock('../../apps/api/src/shop/refund/refund.repository', () => ({
  RefundRepository: class RefundRepository {},
}))
jest.mock('../../apps/api/src/shop/order/order.repository', () => ({
  OrderRepository: class OrderRepository {},
}))
jest.mock('../../apps/api/src/shop/payment/payment.service', () => ({
  PaymentService: class PaymentService {},
}))

import { RefundService } from '../../apps/api/src/shop/refund/refund.service'

describe('RefundService recovery state', () => {
  const refund = {
    id: 30n,
    orderId: 20n,
    outRefundNo: 'OUT-30',
    requestedAmountFen: 1500,
    status: 'pending',
  }
  const order = {
    id: 20n,
    paymentStatus: 'paid',
    fulfillmentStatus: 'pending',
    paymentAmountFen: 1500,
    refundedAmountFen: 0,
  }

  function setup(
    providerError?: Error,
    callbackRefund = refund,
    refundUpdateCount = 1,
    providerQueryResult?: Record<string, unknown>,
    providerQueryError?: Error
  ) {
    const tx: any = {
      $queryRaw: jest.fn(async () => [{ id: 20n }]),
      shopOrder: { findUnique: jest.fn(async () => order) },
      shopRefund: {
        updateMany: jest.fn(async () => ({ count: refundUpdateCount })),
        findUnique: jest.fn(async () => ({
          status: 'success',
          wechatRefundId: 'WX-REFUND-30',
        })),
      },
      shopRefundEvent: { create: jest.fn(async () => ({})) },
      shopProduct: { updateMany: jest.fn(async () => ({ count: 1 })) },
    }
    const prisma: any = {
      $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
      shopRefund: { updateMany: jest.fn(async () => ({ count: 1 })) },
    }
    const refundRepository: any = {
      findById: jest.fn(async () => refund),
      findByOutRefundNo: jest.fn(async () => callbackRefund),
      findAdminById: jest.fn(async () => ({
        ...refund,
        status: 'processing',
        lastErrorCode: providerError ? 'provider_result_unknown' : null,
        order,
      })),
    }
    const paymentService: any = {
      processRefund: providerError
        ? jest.fn(async () => { throw providerError })
        : jest.fn(async () => ({ refundId: 'WX-REFUND-30' })),
      queryRefund: providerQueryError
        ? jest.fn(async () => { throw providerQueryError })
        : jest.fn(async () => providerQueryResult),
    }
    return {
      service: new RefundService(
        prisma as never,
        refundRepository as never,
        {} as never,
        paymentService as never
      ),
      prisma,
      tx,
      refundRepository,
      paymentService,
    }
  }

  it('keeps an uncertain channel submission processing and records a safe recovery event', async () => {
    const { service, tx, paymentService, refundRepository } = setup(new Error('socket timeout'))

    const result = await service.approveRefund(30n, 9n, '核对后批准')

    expect(paymentService.processRefund).toHaveBeenCalledWith(20n, 'OUT-30', 1500)
    expect(tx.shopRefund.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 30n, status: 'processing' },
      data: expect.objectContaining({
        lastErrorCode: 'provider_result_unknown',
        lastProviderStatus: 'UNKNOWN',
      }),
    }))
    expect(tx.shopRefundEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'provider_result_unknown',
        toStatus: 'processing',
        detail: expect.stringContaining('不得重复提交'),
      }),
    }))
    expect(result?.status).toBe('processing')
    expect(refundRepository.findAdminById).toHaveBeenCalledWith(30n)
  })

  it('does not convert non-success provider notifications into a final failure', async () => {
    const processingRefund = { ...refund, status: 'processing' }
    const { service, tx } = setup(undefined, processingRefund)

    await expect(service.handleRefundCallback({
      out_refund_no: 'OUT-30',
      status: 'ABNORMAL',
    })).resolves.toEqual({ message: 'refund status requires provider query' })

    expect(tx.shopRefund.updateMany).toHaveBeenCalledWith({
      where: { id: 30n, status: 'processing' },
      data: { lastProviderStatus: 'ABNORMAL' },
    })
    expect(tx.shopRefund.updateMany.mock.calls[0][0].data).not.toHaveProperty('status')
  })

  it('treats a concurrent duplicate success notification as idempotent', async () => {
    const processingRefund = { ...refund, status: 'processing' }
    const { service, tx } = setup(undefined, processingRefund, 0)

    await expect(service.handleRefundCallback({
      out_refund_no: 'OUT-30',
      refund_id: 'WX-REFUND-30',
      status: 'SUCCESS',
    })).resolves.toEqual({ message: 'success' })

    expect(tx.shopRefund.findUnique).toHaveBeenCalledWith({ where: { id: 30n } })
    expect(tx.shopOrder.findUnique).not.toHaveBeenCalled()
    expect(tx.shopRefundEvent.create).not.toHaveBeenCalled()
  })

  it('requires a reason before an admin rejects a refund', async () => {
    const { service, prisma } = setup()

    await expect(service.rejectRefund(30n, 9n, '  ')).rejects.toThrow('必须填写原因')

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('records unknown provider-query results without changing the refund state', async () => {
    const { service, tx, paymentService } = setup(
      undefined,
      { ...refund, status: 'processing' },
      1,
      undefined,
      new Error('socket timeout')
    )

    const result = await service.queryProviderRefund(30n, 9n)

    expect(paymentService.queryRefund).toHaveBeenCalledWith('OUT-30')
    expect(tx.shopRefund.updateMany).toHaveBeenCalledWith({
      where: { id: 30n, status: 'processing' },
      data: {
        lastProviderStatus: 'UNKNOWN',
        lastErrorCode: 'provider_query_unknown',
      },
    })
    expect(result?.status).toBe('processing')
  })

  it('only applies queried success when channel IDs and amounts match the local refund', async () => {
    const { service, tx, paymentService } = setup(
      undefined,
      { ...refund, status: 'processing' },
      1,
      {
        refundStatus: 'SUCCESS',
        outRefundNo: 'OUT-30',
        refundId: 'WX-REFUND-30',
        amountFen: 1500,
        totalAmountFen: 1500,
      }
    )
    const applySuccess = jest
      .spyOn(service, 'handleRefundCallback')
      .mockResolvedValue({ message: 'success' })

    await service.queryProviderRefund(30n, 9n)

    expect(paymentService.queryRefund).toHaveBeenCalledWith('OUT-30')
    expect(applySuccess).toHaveBeenCalledWith({
      out_refund_no: 'OUT-30',
      refund_id: 'WX-REFUND-30',
      refund_status: 'SUCCESS',
      amount: { refund: 1500, total: 1500 },
    })
    expect(tx.shopRefundEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'provider_query',
        actorId: 9n,
        providerStatus: 'SUCCESS',
      }),
    }))
  })
})
