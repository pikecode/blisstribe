jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  Controller: () => (target: unknown) => target,
  UseGuards: () => (target: unknown) => target,
  Get: () => () => undefined,
  BadRequestException: class extends Error {},
  ConflictException: class extends Error {},
  NotFoundException: class extends Error {},
}))
jest.mock('../../apps/api/src/common/prisma.service', () => ({ PrismaService: class {} }))
jest.mock('../../apps/api/src/common/guards/admin-jwt.guard', () => ({ AdminJwtGuard: class {} }))

import { ServiceOfferingService } from '../../apps/api/src/service-program/offering/offering.service'
import { ServiceOperationsController } from '../../apps/api/src/service-program/service-operations.controller'

function setup() {
  const row: any = {
    id: 1n, productId: 2n, institutionId: 3n, status: 1, priceFen: 100, defaultPromoterRateBps: 0,
    requiresQualification: true, appointmentNotice: '提前预约', refundNotice: '未使用可退',
    product: { status: 1, productType: 'service', deletedAt: null, module: { status: 1, deletedAt: null } },
    institution: { status: 1, deletedAt: null },
    items: [{ id: 1n, kind: 'service', name: '服务', quantity: 2, allocatedAmountFen: 100, institutionSettlementFen: 0 }],
  }
  const db: any = {
    serviceOffering: { findFirst: jest.fn(async () => row), findMany: jest.fn(async () => [row, { ...row, id: 4n }]), count: jest.fn(async () => 2) },
    serviceAppointmentSlot: { findMany: jest.fn(async () => [{ institutionId: 3n, capacity: 1, _count: { appointments: 0 } }]) },
    shopProductSku: { findMany: jest.fn(async () => []) },
  }
  return { row, db, service: new ServiceOfferingService(db) }
}

describe('套餐可售检查', () => {
  it('完整配置与容量就绪；用户购买资格不计为全局阻塞', async () => {
    const { service } = setup()
    expect(await service.readiness(1n)).toMatchObject({ canPublish: true, availableNow: true, requiresQualification: true })
  })
  it('没有时段时可以准备上架，但不能显示当前可售', async () => {
    const { service, db } = setup()
    db.serviceAppointmentSlot.findMany.mockResolvedValue([])
    const result = await service.readiness(1n)
    expect(result.canPublish).toBe(true)
    expect(result.availableNow).toBe(false)
    expect(result.checks.find(check => check.key === 'slots')?.passed).toBe(false)
  })
  it('已满时段不计入可售容量', async () => {
    const { service, db } = setup()
    db.serviceAppointmentSlot.findMany.mockResolvedValue([{ institutionId: 3n, capacity: 1, _count: { appointments: 1 } }])
    expect((await service.readiness(1n)).availableNow).toBe(false)
  })
  it('同一规格在多个项目中的数量合并校验', async () => {
    const { service, row, db } = setup()
    row.items.push(...[2n, 3n].map(id => ({ id, kind: 'goods', skuId: 9n, returnNotice: '七天内申请', name: '用品', quantity: 2, allocatedAmountFen: 0, institutionSettlementFen: 0 })))
    db.shopProductSku.findMany.mockResolvedValue([{ id: 9n, enabled: true, product: { status: 1, deletedAt: null }, totalStock: 5, reservedStock: 1, soldStock: 1 }])
    const result = await service.readiness(1n)
    expect(result.canPublish).toBe(true)
    expect(result.checks.find(check => check.key === 'stock')?.passed).toBe(false)
  })
  it('分摊不一致或缺规则时阻止上架，且发布接口同样拒绝', async () => {
    const { service, row } = setup()
    row.priceFen = 99
    row.refundNotice = ''
    expect((await service.readiness(1n)).canPublish).toBe(false)
    await expect(service.publish(1n)).rejects.toThrow('分摊')
  })
  it('所属模块停用时展示未就绪；草稿配置完成也不直接显示可售', async () => {
    const { service, row } = setup()
    row.product.module.status = 0
    expect((await service.readiness(1n)).availableNow).toBe(false)
    row.product.module.status = 1
    row.status = 0
    expect(await service.readiness(1n)).toMatchObject({ summary: '待上架', canPublish: true, availableNow: false })
  })
  it('列表一次批量读取时段与规格，避免逐条重复查询', async () => {
    const { service, db } = setup()
    const result = await service.listAdmin({ page: 1, pageSize: 20 })
    expect(result.list).toHaveLength(2)
    expect(db.serviceAppointmentSlot.findMany).toHaveBeenCalledTimes(1)
    expect(db.shopProductSku.findMany).toHaveBeenCalledTimes(1)
  })
})

describe('服务工作台', () => {
  afterEach(() => jest.useRealTimers())
  it('按北京时间确定今日范围，生成对应筛选链接', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T16:30:00Z'))
    const db: any = { serviceAppointment: { count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(2) }, serviceRefund: { count: jest.fn().mockResolvedValue(4) }, serviceDispute: { count: jest.fn().mockResolvedValue(1) } }
    const result = await new ServiceOperationsController(db).workbench()
    expect(result.date).toBe('2026-10-16')
    expect(result.items.find(item => item.key === 'reception')).toMatchObject({ count: 2, query: { status: 'confirmed', date: '2026-10-16' } })
    expect(db.serviceAppointment.count).toHaveBeenNthCalledWith(2, { where: { status: 'confirmed', requestedStartAt: { gte: new Date('2026-10-15T16:00:00Z'), lt: new Date('2026-10-16T16:00:00Z') } } })
    expect(result.items.find(item => item.key === 'overdue')?.query).toEqual({ overdue: 'true' })
  })
})
