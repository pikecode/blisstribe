import { describe, expect, it, jest } from '@jest/globals'

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class BadRequestException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}))
jest.mock('../../apps/api/src/common/prisma.service', () => ({
  PrismaService: class PrismaService {},
}))
jest.mock('../../apps/api/src/shop/order/order.repository', () => ({
  OrderRepository: class OrderRepository {},
}))
jest.mock('../../apps/api/src/shop/order/order-no.generator', () => ({
  OrderNoGenerator: { generate: () => 'TEST-ORDER' },
}))
jest.mock('../../apps/api/src/shop/cart/cart.service', () => ({
  CartService: class CartService {},
}))
jest.mock('../../apps/api/src/shop/payment/payment.service', () => ({
  PaymentService: class PaymentService {},
}))

import { OrderService } from '../../apps/api/src/shop/order/order.service'

describe('OrderService SKU checkout', () => {
  const sku = {
    id: 12n,
    productId: 3n,
    skuCode: 'TSHIRT-RED-M',
    specifications: { 颜色: '红色', 尺寸: 'M' },
    priceFen: 2599,
    totalStock: 8,
    reservedStock: 1,
    soldStock: 2,
    enabled: true,
    product: {
      id: 3n,
      name: '测试 T 恤',
      images: ['shirt.jpg'],
      status: 1,
      deletedAt: null,
    },
  }

  function setup(skuOverride: Record<string, any> = {}) {
    const tx: any = {
      $queryRaw: jest.fn(async () => [{ id: sku.id }]),
      shopProductSku: {
        findUnique: jest.fn(async () => ({ ...sku, ...skuOverride })),
        update: jest.fn(async (args: any) => args),
      },
      shopOrder: {
        create: jest.fn(async (args: any) => ({
          id: 40n,
          orderNo: 'TEST-ORDER',
          ...args.data,
        })),
      },
      shopCart: { findUnique: jest.fn(async () => null) },
      shopCartItem: { deleteMany: jest.fn() },
    }
    const prisma: any = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    }
    return { service: new OrderService(prisma, {} as never, {} as never, {} as never), prisma, tx }
  }

  const checkout = {
    items: [{ skuId: '12', quantity: 2 }],
    receiverName: '张三',
    receiverPhone: '13800000000',
    shippingAddress: '测试地址',
  }

  it('uses SKU price, reserves its inventory, and snapshots SKU details', async () => {
    const { service, tx } = setup()

    const order = await service.createOrder(7n, checkout)

    expect(tx.shopProductSku.update).toHaveBeenCalledWith({
      where: { id: 12n },
      data: { reservedStock: { increment: 2 } },
    })
    expect(tx.shopOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalAmountFen: 5198,
        items: { create: [expect.objectContaining({
          productId: 3n,
          skuId: 12n,
          skuCode: 'TSHIRT-RED-M',
          skuSpecifications: { 颜色: '红色', 尺寸: 'M' },
          unitPriceFen: 2599,
          quantity: 2,
          subtotalFen: 5198,
        })] },
      }),
    }))
    expect(order.items.create[0].skuId).toBe(12n)
  })

  it('rejects quantities above the selected SKU available stock', async () => {
    const { service, tx } = setup({ totalStock: 4 })

    await expect(service.createOrder(7n, {
      ...checkout,
      items: [{ skuId: '12', quantity: 2 }],
    })).rejects.toThrow('商品规格库存不足')

    expect(tx.shopProductSku.update).not.toHaveBeenCalled()
    expect(tx.shopOrder.create).not.toHaveBeenCalled()
  })

  it('rejects legacy product requests when more than one SKU is enabled', async () => {
    const { service, tx } = setup()
    tx.shopProduct = {
      findUnique: jest.fn(async () => ({
        id: 3n,
        deletedAt: null,
        skus: [{ id: 12n }, { id: 13n }],
      })),
    }

    await expect(service.createOrder(7n, {
      ...checkout,
      items: [{ productId: '3', quantity: 1 }],
    })).rejects.toThrow('该商品有多个规格，请先选择规格')

    expect(tx.shopProductSku.update).not.toHaveBeenCalled()
    expect(tx.shopOrder.create).not.toHaveBeenCalled()
  })

  it('maps legacy product requests to the only enabled SKU', async () => {
    const { service, tx } = setup()
    tx.shopProduct = {
      findUnique: jest.fn(async () => ({
        id: 3n,
        deletedAt: null,
        skus: [{ id: 12n }],
      })),
    }

    await service.createOrder(7n, {
      ...checkout,
      items: [{ productId: '3', quantity: 1 }],
    })

    expect(tx.shopProductSku.update).toHaveBeenCalledWith({
      where: { id: 12n },
      data: { reservedStock: { increment: 1 } },
    })
  })
})
