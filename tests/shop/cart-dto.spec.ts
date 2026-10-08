import { validate } from 'class-validator'
import { AddCartItemDto } from '../../apps/api/src/shop/dto/cart.dto'

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
