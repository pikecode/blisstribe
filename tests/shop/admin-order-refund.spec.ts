import { canShipOrder, orderRefundText } from '../../apps/admin/src/utils/shop-order'
import type { ShopOrder } from '../../apps/admin/src/api/shop-order'

describe('后台订单退款展示及发货入口', () => {
  const order = { paymentStatus: 'paid', fulfillmentStatus: 'pending' } as ShopOrder
  it('待审核及处理中退款不能发货', () => {
    for (const status of ['pending', 'approved', 'processing']) {
      const value = { ...order, refunds: [{ id: '1', status, createdAt: '2026-10-12' }] }
      expect(canShipOrder(value)).toBe(false)
      expect(orderRefundText(value)).toBe(status === 'pending' ? '退款待审核' : '退款处理中')
    }
  })
  it('无退款和已拒绝退款可以发货', () => {
    expect(canShipOrder(order)).toBe(true)
    expect(canShipOrder({ ...order, refunds: [{ id: '1', status: 'rejected', createdAt: '2026-10-12' }] })).toBe(true)
  })
  it('退款完成后显示已退款且不能发货', () => {
    const value = { ...order, fulfillmentStatus: 'refunded' }
    expect(orderRefundText(value)).toBe('已退款')
    expect(canShipOrder(value)).toBe(false)
  })
})
