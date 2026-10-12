import 'reflect-metadata'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { AddCartItemDto } from '../../apps/api/src/shop/dto/cart.dto'
import { CreateProductDto, UpdateProductDto } from '../../apps/api/src/shop/dto/product.dto'

describe('商品分类 ID 请求兼容', () => {
  it.each([CreateProductDto, UpdateProductDto])('兼容字符串分类 ID 并拒绝非法值', async (Dto) => {
    for (const categoryId of ['12', 12]) {
      const dto = plainToInstance<CreateProductDto | UpdateProductDto, { categoryId: string | number }>(Dto, { categoryId })
      expect(dto.categoryId).toBe(12)
      const errors = await validate(dto)
      expect(errors.filter(error => error.property === 'categoryId')).toHaveLength(0)
    }
    for (const categoryId of ['abc', '', '1.5', '-1', 0]) {
      const errors = await validate(plainToInstance<CreateProductDto | UpdateProductDto, { categoryId: string | number }>(Dto, { categoryId }))
      expect(errors.some(error => error.property === 'categoryId')).toBe(true)
    }
  })
})

describe('AddCartItemDto', () => {
  it('accepts a decimal-string SKU ID without coercing it to a number', async () => {
    const dto = Object.assign(new AddCartItemDto(), {
      skuId: '9007199254740993',
      quantity: 2,
    })

    await expect(validate(dto)).resolves.toHaveLength(0)
    expect(dto.skuId).toBe('9007199254740993')
  })

  it('accepts the legacy decimal-string product ID', async () => {
    const dto = Object.assign(new AddCartItemDto(), {
      productId: '123',
      quantity: 1,
    })

    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it.each(['abc', '-1', '1.5'])('rejects invalid ID %s', async (skuId) => {
    const dto = Object.assign(new AddCartItemDto(), { skuId, quantity: 1 })

    await expect(validate(dto)).resolves.not.toHaveLength(0)
  })
})
