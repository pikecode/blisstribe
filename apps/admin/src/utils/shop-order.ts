import type { ShopOrder } from '@/api/shop-order'

export function latestOrderRefund(order: ShopOrder) {
  return [...(order.refunds || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export function orderRefundText(order: ShopOrder): string {
  if (order.fulfillmentStatus === 'refunded') return '已退款'
  const status = latestOrderRefund(order)?.status
  return ({ pending: '退款待审核', approved: '退款处理中', processing: '退款处理中', success: '已退款', rejected: '退款已拒绝', failed: '退款异常', closed: '退款已关闭' } as Record<string, string>)[status || ''] || '无退款'
}

export function canShipOrder(order: ShopOrder): boolean {
  return order.paymentStatus === 'paid' && order.fulfillmentStatus === 'pending' &&
    !(order.refunds || []).some((refund) => ['pending', 'approved', 'processing'].includes(refund.status))
}
