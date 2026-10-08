import { describe, expect, it, jest, beforeEach } from '@jest/globals'

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  BadRequestException: class BadRequestException extends Error {},
  NotFoundException: class NotFoundException extends Error {},
}))
jest.mock('../../apps/api/src/shop/product/product.repository', () => ({
  ProductRepository: class ProductRepository {},
}))
jest.mock('../../apps/api/src/shop/category/category.repository', () => ({
  CategoryRepository: class CategoryRepository {},
}))

import { ProductService } from '../../apps/api/src/shop/product/product.service'

describe('ProductService SKU validation', () => {
  const productRepository: any = {
    create: jest.fn(),
  }
  const categoryRepository: any = {
    findById: jest.fn(),
  }
  const service = new ProductService(productRepository as any, categoryRepository as any)

  beforeEach(() => {
    jest.clearAllMocks()
    categoryRepository.findById.mockResolvedValue({ id: 1n })
    productRepository.create.mockResolvedValue({
      id: 1n,
      categoryId: 1n,
      name: '测试商品',
      images: [],
      skus: [],
    })
  })

  it('规范化属性并创建 SKU', async () => {
    await service.createProduct({
      categoryId: 1,
      name: '测试商品',
      images: [],
      skus: [{
        skuCode: ' SKU-1 ',
        specifications: { 尺寸: ' M ', 颜色: '红色' },
        priceFen: 100,
        totalStock: 5,
      }],
    })

    expect(productRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      skus: [{
        skuCode: 'SKU-1',
        specifications: { '尺寸': 'M', '颜色': '红色' },
        specificationKey: JSON.stringify({ '尺寸': 'M', '颜色': '红色' }),
        priceFen: 100,
        totalStock: 5,
        enabled: true,
      }],
    }))
  })

  it('拒绝重复规格组合', async () => {
    await expect(service.createProduct({
      categoryId: 1,
      name: '测试商品',
      images: [],
      skus: [
        { specifications: { 颜色: '红色' }, priceFen: 100, totalStock: 1 },
        { specifications: { ' 颜色 ': ' 红色 ' }, priceFen: 200, totalStock: 1 },
      ],
    })).rejects.toThrow('SKU 规格组合不能重复')

    expect(productRepository.create).not.toHaveBeenCalled()
  })

  it('拒绝重复 SKU 编码（去除首尾空格后）', async () => {
    await expect(service.createProduct({
      categoryId: 1,
      name: '测试商品',
      images: [],
      skus: [
        { skuCode: 'SKU-1', specifications: {}, priceFen: 100, totalStock: 1 },
        { skuCode: ' SKU-1 ', specifications: { 颜色: '红色' }, priceFen: 200, totalStock: 1 },
      ],
    })).rejects.toThrow('SKU 编码不能重复')
  })

  it('拒绝没有 SKU 的商品', async () => {
    await expect(service.createProduct({
      categoryId: 1,
      name: '测试商品',
      images: [],
      skus: [],
    })).rejects.toThrow('商品至少需要一个 SKU')
  })
})
