import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('小程序购物车调用契约', () => {
  it('商品卡片使用 SKU ID 加入购物车', () => {
    const source = readFileSync(
      join(__dirname, '../../apps/miniapp/src/components/shop/ProductCard.vue'),
      'utf8'
    )

    expect(source).toContain('cartApi.addItem(availableSkus[0].id, 1)')
    expect(source).not.toContain('cartApi.addItem(props.product.id')
  })

  it('确认订单页使用应用地址簿', () => {
    const source = readFileSync(
      join(__dirname, '../../apps/miniapp/src/pages/shop/checkout.vue'),
      'utf8'
    )

    expect(source).toContain("addressApi.list()")
    expect(source).toContain("'/pages/shop/addresses?select=1'")
    expect(source).not.toContain('uni.chooseAddress')
  })
})
