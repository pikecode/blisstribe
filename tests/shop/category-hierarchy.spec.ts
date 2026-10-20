jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class BadRequestException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
  ConflictException: class ConflictException extends Error {},
}))
jest.mock('../../apps/api/src/shop/category/category.repository', () => ({ CategoryRepository: class {} }))
jest.mock('../../apps/api/src/shop/cart/cart.repository', () => ({ CartRepository: class {} }))
jest.mock('../../apps/api/src/shop/product/product.repository', () => ({ ProductRepository: class {} }))

import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { CartService } from '../../apps/api/src/shop/cart/cart.service'

const row = (id: bigint, parentId: bigint | null = null, status = 1) => ({
  id, parentId, status, code: `category-${id}`, name: `分类${id}`, description: null,
  imageUrl: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(),
})

function setup(rows = [row(1n), row(2n, 1n)]) {
  const repository = {
    findAllForAdmin: jest.fn().mockResolvedValue(rows),
    findById: jest.fn(async (id: bigint) => rows.find((category) => category.id === id) || null),
    findByCode: jest.fn().mockResolvedValue(null),
    create: jest.fn(async (data) => ({ ...row(9n), ...data })),
    update: jest.fn(async (id: bigint, data) => ({ ...rows.find((category) => category.id === id), ...data })),
  }
  return { repository, service: new CategoryService(repository as never) }
}

describe('商城二级分类', () => {
  it('父分类停用后，购物车已有商品标记为不可购买，也不能再次加入', async () => {
    const sku = { id: 1n, enabled: true, priceFen: 100, totalStock: 10, reservedStock: 0, soldStock: 0,
      product: { id: 1n, status: 1, deletedAt: null, category: { status: 1, parentId: 2n, parent: { status: 0 } } } }
    const cartRepository = { findOrCreateByUserId: jest.fn().mockResolvedValue({ id: 1n, items: [{ id: 1n, quantity: 1, sku }] }) }
    const service = new CartService(cartRepository as never, { findSkuById: jest.fn().mockResolvedValue(sku) } as never)
    const cart = await service.getCart(1n)
    expect(cart.items[0].sku.enabled).toBe(false)
    expect(cart.items[0].sku.available).toBe(0)
    await expect(service.addItem(1n, { skuId: '1', quantity: 1 })).rejects.toThrow('已下架')
  })

  it('停用一级分类后隐藏其已启用子分类，后台仍可维护全部分类', async () => {
    const { service } = setup([row(1n, null, 0), row(2n, 1n), row(3n), row(4n, 3n)])
    expect((await service.getAllCategories()).map((category) => category.id)).toEqual([3, 4])
    expect(await service.getAllCategories(true)).toHaveLength(4)
  })

  it('创建二级分类并返回父分类编号', async () => {
    const { service } = setup()
    expect(await service.createCategory({ name: '子分类', code: 'child', parentId: 1 })).toEqual(expect.objectContaining({ parentId: 1 }))
  })

  it('拒绝三级分类与不存在的父分类', async () => {
    const { service, repository } = setup()
    await expect(service.createCategory({ name: '三级', code: 'third', parentId: 2 })).rejects.toThrow('两级')
    await expect(service.createCategory({ name: '无效父级', code: 'missing', parentId: 999 })).rejects.toThrow('不存在')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('拒绝选择自身或把已有子分类的一级分类移动到其他一级下', async () => {
    const { service, repository } = setup([row(1n), row(2n, 1n), row(3n)])
    await expect(service.updateCategory(1n, { parentId: 1 })).rejects.toThrow('自身')
    await expect(service.updateCategory(1n, { parentId: 3 })).rejects.toThrow('已有二级分类')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('允许二级分类调整父级或提升为一级', async () => {
    const { service, repository } = setup([row(1n), row(2n, 1n), row(3n)])
    await service.updateCategory(2n, { parentId: 3 })
    expect(repository.update).toHaveBeenLastCalledWith(2n, expect.objectContaining({ parentId: 3n }))
    await service.updateCategory(2n, { parentId: null })
    expect(repository.update).toHaveBeenLastCalledWith(2n, expect.objectContaining({ parentId: null }))
  })
})
