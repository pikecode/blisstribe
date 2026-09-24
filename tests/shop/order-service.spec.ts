import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, jest } from '@jest/globals'
import { OrderService } from '../../apps/api/src/shop/order/order.service'

describe('OrderService.createOrder', () => {
  const userId = 42n
  const productId = 7n

  function setup(product: Record<string, unknown>) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{
        id: productId,
        priceFen: 1250,
        totalStock: 10,
        reservedStock: 0,
        soldStock: 0,
        status: 1,
        deletedAt: null,
        name: '服务端商品名',
        images: ['product.jpg'],
        ...product,
      }]),
      shopProduct: {
        findUnique: jest.fn().mockImplementation(async () => ({
          id: productId,
          priceFen: 1250,
          totalStock: 10,
          reservedStock: 0,
          soldStock: 0,
          status: 1,
          deletedAt: null,
          name: '服务端商品名',
          images: ['product.jpg'],
          ...product,
        })),
        update: jest.fn().mockResolvedValue({}),
      },
      shopOrder: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 99n,
          ...data,
          items: data.items.create,
        })),
      },
      shopCart: {
        findUnique: jest.fn().mockResolvedValue({ id: 12n }),
      },
      shopCartItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    }
    const cartService = { clearCart: jest.fn().mockResolvedValue(undefined) }
    const orderService = new OrderService(
      prisma as never,
      {} as never,
      cartService as never
    )

    return { orderService, tx, prisma, cartService }
  }

  const validOrder = {
    receiverName: '收件人',
    receiverPhone: '13800000000',
    shippingAddress: '收货地址',
    items: [{ productId, quantity: 2, unitPriceFen: 1 }],
  }

  it('uses locked server product data and persists complete amount and item snapshots', async () => {
    const { orderService, tx } = setup({})

    const order = await orderService.createOrder(userId, validOrder as never)

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1)
    expect(tx.shopProduct.update).toHaveBeenCalledWith({
      where: { id: productId },
      data: { reservedStock: { increment: 2 } },
    })
    expect(tx.shopOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalAmountFen: 2500,
        paymentAmountFen: 2500,
        discountAmountFen: 0,
        items: {
          create: [{
            productId,
            productName: '服务端商品名',
            productImage: 'product.jpg',
            unitPriceFen: 1250,
            quantity: 2,
            subtotalFen: 2500,
          }],
        },
      }),
    }))
    expect(order.paymentAmountFen).toBe(2500)
  })

  it('rejects insufficient stock without creating an order or clearing the cart', async () => {
    const { orderService, tx, cartService } = setup({
      totalStock: 2,
      reservedStock: 1,
      soldStock: 0,
    })

    await expect(orderService.createOrder(userId, validOrder as never))
      .rejects.toBeInstanceOf(BadRequestException)

    expect(tx.shopOrder.create).not.toHaveBeenCalled()
    expect(cartService.clearCart).not.toHaveBeenCalled()
  })

  it('aggregates duplicate product lines before reserving inventory', async () => {
    const { orderService, tx } = setup({})

    await orderService.createOrder(userId, {
      ...validOrder,
      items: [
        { productId, quantity: 1 },
        { productId: String(productId), quantity: 2 },
      ],
    } as never)

    expect(tx.shopProduct.update).toHaveBeenCalledTimes(1)
    expect(tx.shopProduct.update).toHaveBeenCalledWith({
      where: { id: productId },
      data: { reservedStock: { increment: 3 } },
    })
    expect(tx.shopOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        totalAmountFen: 3750,
        items: {
          create: [expect.objectContaining({ quantity: 3, subtotalFen: 3750 })],
        },
      }),
    }))
  })
})
