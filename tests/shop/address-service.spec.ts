jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  NotFoundException: class NotFoundException extends Error {},
}))

jest.mock('../../apps/api/src/common/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { AddressService } from '../../apps/api/src/shop/address/address.service'

describe('AddressService', () => {
  it('首个地址自动设为默认，且不能直接取消默认地址', async () => {
    const shopAddress = {
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(({ data }) => data),
      findFirst: jest.fn().mockResolvedValue({ id: 1n, userId: 7n, isDefault: true }),
      update: jest.fn(({ data }) => data),
    }
    const prisma = {
      $transaction: (handler: (tx: { shopAddress: typeof shopAddress }) => unknown) => handler({ shopAddress }),
    }
    const service = new AddressService(prisma as never)

    await service.create(7n, {
      receiverName: ' 张三 ',
      receiverPhone: ' 13800138000 ',
      fullAddress: ' 杭州市余杭区测试路 1 号 ',
    })
    expect(shopAddress.create).toHaveBeenCalledWith({
      data: {
        userId: 7n,
        receiverName: '张三',
        receiverPhone: '13800138000',
        fullAddress: '杭州市余杭区测试路 1 号',
        isDefault: true,
      },
    })

    await service.update(7n, 1n, { isDefault: false })
    expect(shopAddress.update).toHaveBeenLastCalledWith({ where: { id: 1n }, data: {} })
  })
})
