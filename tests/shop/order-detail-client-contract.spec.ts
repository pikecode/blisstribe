import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('小程序订单详情展示契约', () => {
  it('展示订单快照中的收货信息和商品图片', () => {
    const source = readFileSync(
      join(__dirname, '../../apps/miniapp/src/pages/shop/order-detail.vue'),
      'utf8'
    )

    expect(source).toContain('order.shippingAddress')
    expect(source).toContain('item.productImage')
    expect(source).toContain("order.fulfillmentStatus === 'shipped'")
    expect(source).toContain("order.paidAt ? formatDate(order.paidAt) : '未支付'")
  })
})
