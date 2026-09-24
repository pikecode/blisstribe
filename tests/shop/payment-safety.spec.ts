import { beforeAll, describe, expect, it, jest } from '@jest/globals'

let PaymentService: typeof import('../../apps/api/src/shop/payment/payment.service').PaymentService

beforeAll(async () => {
  jest.unstable_mockModule('@nestjs/common', () => ({
    Injectable: () => (target: unknown) => target,
    BadRequestException: class BadRequestException extends Error {},
    NotFoundException: class NotFoundException extends Error {},
  }))
  jest.unstable_mockModule('../../apps/api/src/common/prisma.service', () => ({
    PrismaService: class PrismaService {},
  }))
  jest.unstable_mockModule('../../apps/api/src/shop/order/order.repository', () => ({
    OrderRepository: class OrderRepository {},
  }))
  jest.unstable_mockModule('../../apps/api/src/shop/payment/payment.repository', () => ({
    PaymentRepository: class PaymentRepository {},
  }))
  jest.unstable_mockModule('../../apps/api/src/shop/payment/wechat-pay.service', () => ({
    WechatPayService: class WechatPayService {},
  }))
  ;({ PaymentService } = await import('../../apps/api/src/shop/payment/payment.service'))
})

describe('PaymentService closure recovery', () => {
  const order = {
    id: 10n,
    orderNo: 'ORDER-10',
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    paymentAmountFen: 1200,
    items: [{ productId: 20n, quantity: 2 }],
  }

  function setup(overrides: {
    trade?: { tradeState: string; transactionId?: string; amountFen?: number }
    close?: { tradeState: string }
    queryError?: Error
    initialOrder?: typeof order
  } = {}) {
    const tx: any = {
      shopOrder: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        findUnique: jest.fn(async () => overrides.initialOrder || order),
      },
      shopProduct: {
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      shopPayment: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      shopPaymentException: {
        upsert: jest.fn(async () => ({})),
      },
    }
    const prisma: any = {
      shopOrder: {
        findUnique: jest.fn(async () => overrides.initialOrder || order),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      shopPaymentException: {
        upsert: jest.fn(async () => ({})),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    }
    const wechatPayService: any = {
      queryTrade: jest.fn().mockImplementation(async () => {
        if (overrides.queryError) throw overrides.queryError
        return overrides.trade || { tradeState: 'NOTPAY' }
      }),
      closeTrade: jest.fn(async () => overrides.close || { tradeState: 'CLOSED' }),
      createPrepay: jest.fn(),
      refund: jest.fn(),
    }
    const service = new PaymentService(
      prisma as never,
      {} as never,
      {} as never,
      wechatPayService as never
    )
    return { service, prisma, tx, wechatPayService }
  }

  it('releases reserved stock only after the provider confirms closure', async () => {
    const { service, tx, wechatPayService } = setup()

    await expect(service.closeUnpaidOrder(10n, 'expired')).resolves.toBe('closed')

    expect(wechatPayService.queryTrade).toHaveBeenCalledWith('ORDER-10')
    expect(wechatPayService.closeTrade).toHaveBeenCalledWith('ORDER-10')
    expect(tx.shopOrder.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: 10n, status: 'closing', paymentStatus: 'unpaid' },
      data: expect.objectContaining({ status: 'cancelled', cancelReason: 'expired' }),
    }))
    expect(tx.shopProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 20n, reservedStock: { gte: 2 } },
      data: { reservedStock: { decrement: 2 } },
    })
  })

  it('keeps the order closing and does not release stock when provider lookup is unknown', async () => {
    const { service, prisma, tx, wechatPayService } = setup({
      queryError: new Error('provider timeout'),
    })

    await expect(service.closeUnpaidOrder(10n, 'expired')).rejects.toThrow('provider timeout')

    expect(prisma.shopOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 10n, status: 'pending_payment', paymentStatus: 'unpaid' },
      data: { status: 'closing' },
    })
    expect(wechatPayService.closeTrade).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(tx.shopProduct.updateMany).not.toHaveBeenCalled()
  })

  it('settles a trade found successful while closure is in progress', async () => {
    const { service, tx, wechatPayService } = setup({
      trade: { tradeState: 'SUCCESS', transactionId: 'WX-1', amountFen: 1200 },
    })

    await expect(service.closeUnpaidOrder(10n, 'expired')).resolves.toBe('paid')

    expect(wechatPayService.closeTrade).not.toHaveBeenCalled()
    expect(tx.shopOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 10n,
        status: { in: ['pending_payment', 'closing'] },
        paymentStatus: 'unpaid',
      },
      data: expect.objectContaining({ status: 'paid', paymentStatus: 'paid' }),
    }))
    expect(tx.shopProduct.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { reservedStock: { decrement: 2 }, soldStock: { increment: 2 } },
    }))
  })

  it('persists a late successful payment idempotently without touching stock', async () => {
    const cancelledOrder = {
      ...order,
      status: 'cancelled',
    }
    const { service, prisma, tx } = setup({ initialOrder: cancelledOrder })

    const payload = {
      out_trade_no: 'ORDER-10',
      transaction_id: 'WX-LATE-1',
      amount: { total: 1200 },
    }
    await expect(service.handleWechatNotify(payload)).resolves.toEqual({
      message: 'payment_exception_recorded',
    })

    expect(tx.shopPaymentException.upsert).toHaveBeenCalledWith({
      where: { eventKey: 'wechat:WX-LATE-1' },
      create: {
        eventKey: 'wechat:WX-LATE-1',
        orderId: 10n,
        outTradeNo: 'ORDER-10',
        wechatTransactionId: 'WX-LATE-1',
        amountFen: 1200,
      },
      update: {},
    })
    expect(tx.shopProduct.updateMany).not.toHaveBeenCalled()
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
