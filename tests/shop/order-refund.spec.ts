import { canApplyRefund, refundStatusText } from '../../apps/miniapp/src/utils/order-refund'

describe('订单退款展示', () => {
  const order = { paymentStatus: 'paid', fulfillmentStatus: 'pending' }
  it('待审核退款不能重复申请', () => {
    const value = { ...order, refunds: [{ id: '1', status: 'pending', createdAt: '2026-10-12' }] }
    expect(refundStatusText(value)).toBe('退款待审核')
    expect(canApplyRefund(value)).toBe(false)
  })
  it('退款拒绝后允许重新申请，退款异常不允许重复申请', () => {
    expect(canApplyRefund({ ...order, refunds: [{ id: '1', status: 'rejected', createdAt: '2026-10-12' }] })).toBe(true)
    expect(canApplyRefund({ ...order, refunds: [{ id: '1', status: 'failed', createdAt: '2026-10-12' }] })).toBe(false)
  })
  it('以最新退款为准并正确展示已退款', () => {
    expect(refundStatusText({ ...order, refunds: [
      { id: '1', status: 'rejected', createdAt: '2026-10-11' },
      { id: '2', status: 'processing', createdAt: '2026-10-12' },
    ] })).toBe('退款处理中')
    expect(refundStatusText({ ...order, fulfillmentStatus: 'refunded' })).toBe('已退款')
  })
})
