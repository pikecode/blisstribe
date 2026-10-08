import { describe, expect, it, jest } from '@jest/globals'

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class BadRequestException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}))
jest.mock('../../apps/api/src/common/prisma.service', () => ({
  PrismaService: class PrismaService {},
}))

import { PaymentExceptionService } from '../../apps/api/src/shop/payment/payment-exception.service'

describe('PaymentExceptionService', () => {
  function setup() {
    const prisma: any = {
      shopPaymentException: {
        findUnique: jest.fn(async () => ({ id: 7n })),
      },
      shopPaymentExceptionReview: {
        create: jest.fn(async (args: any) => args),
      },
    }
    return { service: new PaymentExceptionService(prisma as never), prisma }
  }

  it('records reviewer and channel evidence without resolving the exception', async () => {
    const { service, prisma } = setup()
    await service.review(7n, 3n, {
      channelCheckResult: 'unknown',
      resolutionNote: '商户平台查单超时，等待再次核对',
    })
    expect(prisma.shopPaymentExceptionReview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        paymentExceptionId: 7n,
        channelCheckResult: 'unknown',
        resolutionNote: '商户平台查单超时，等待再次核对',
        reviewedByAdminId: 3n,
      }),
    }))
    expect(prisma.shopPaymentExceptionReview.create.mock.calls[0][0].data).not.toHaveProperty('status')
  })

  it('rejects unsupported channel results and missing evidence', async () => {
    const { service, prisma } = setup()
    await expect(service.review(7n, 3n, {
      channelCheckResult: 'force_success',
      resolutionNote: '手工处理',
    })).rejects.toThrow('渠道核查结果无效')
    await expect(service.review(7n, 3n, {
      channelCheckResult: 'paid',
      resolutionNote: ' ',
    })).rejects.toThrow('核查说明必填')
    expect(prisma.shopPaymentExceptionReview.create).not.toHaveBeenCalled()
  })
})
