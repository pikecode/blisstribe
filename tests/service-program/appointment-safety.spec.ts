jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class extends Error {},
  NotFoundException: class extends Error {},
}))
jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined, CronExpression: { EVERY_MINUTE: '* * * * *' } }))
jest.mock('../../apps/api/src/common/prisma.service', () => ({ PrismaService: class {} }))

import { ServiceAppointmentService } from '../../apps/api/src/service-program/appointment/appointment.service'

describe('服务预约状态保护', () => {
  test('过期的改约建议不能接受', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      serviceAppointment: { findFirst: jest.fn().mockResolvedValue({ status: 'confirmed', proposedSlotId: 5n, proposalExpiresAt: new Date(0) }), update: jest.fn() },
    }
    const prisma = { $transaction: jest.fn(async (callback) => callback(tx)) }
    await expect(new ServiceAppointmentService(prisma as any).acceptReschedule(1n, 2n)).rejects.toThrow('改约建议不存在或已过期')
    expect(tx.serviceAppointment.update).not.toHaveBeenCalled()
  })

  test('候选时段已满时保留原预约', async () => {
    const startAt = new Date(Date.now() + 86400000)
    const tx = {
      $queryRaw: jest.fn(),
      serviceAppointment: {
        findFirst: jest.fn().mockResolvedValue({ status: 'confirmed', proposedSlotId: 5n, proposalExpiresAt: startAt, institutionId: 3n, plan: { expiresAt: new Date(Date.now() + 172800000) }, entitlement: { bookingBlocked: false } }),
        count: jest.fn().mockResolvedValue(1), update: jest.fn(),
      },
      serviceAppointmentSlot: { findUnique: jest.fn().mockResolvedValue({ id: 5n, institutionId: 3n, enabled: true, startAt, capacity: 1 }) },
    }
    const prisma = { $transaction: jest.fn(async (callback) => callback(tx)) }
    await expect(new ServiceAppointmentService(prisma as any).acceptReschedule(1n, 2n)).rejects.toThrow('候选时段已满')
    expect(tx.serviceAppointment.update).not.toHaveBeenCalled()
  })
  test('退款并发修改状态后，登记到场不能覆盖退款状态', async () => {
    const prisma = {
      serviceAppointment: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, status: 'confirmed' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    }
    Object.assign(prisma, { $transaction: async (callback: any) => callback(prisma) })
    const service = new ServiceAppointmentService(prisma as any)
    await expect(service.arrive(1n)).rejects.toThrow('预约状态已变化')
    expect(prisma.serviceAppointment.updateMany).toHaveBeenCalledWith({
      where: { id: 1n, status: 'confirmed' }, data: { status: 'arrived', arrivedAt: expect.any(Date) },
    })
  })

  test('自动超时只取消待确认预约，不取消并发确认后的预约', async () => {
    const tx = { serviceAppointment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }, serviceEntitlement: { updateMany: jest.fn() } }
    const prisma = {
      serviceAppointment: {
        findMany: jest.fn().mockResolvedValue([{ id: 1n, entitlementId: 2n, entitlement: {} }]),
        findUnique: jest.fn().mockResolvedValue({ id: 1n, status: 'confirmed' }),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    }
    await new ServiceAppointmentService(prisma as any).cancelUnconfirmedBeforeStart()
    expect(tx.serviceAppointment.updateMany.mock.calls[0][0].where).toEqual({ id: 1n, status: { in: ['pending'] } })
    expect(tx.serviceEntitlement.updateMany).not.toHaveBeenCalled()
  })

  test('患者未确认前，机构不能替换预约时间', async () => {
    const requestedStartAt = new Date(Date.now() + 86400000)
    const prisma = { serviceAppointment: { findUnique: jest.fn().mockResolvedValue({ id: 1n, status: 'pending', requestedStartAt }) } }
    await expect(new ServiceAppointmentService(prisma as any).confirm(1n, 2n, {
      confirmedStartAt: new Date(requestedStartAt.getTime() + 3600000).toISOString(),
    })).rejects.toThrow('更换预约时间需要患者确认')
  })
})
