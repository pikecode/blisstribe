type RefundOrder = {
  paymentStatus: string
  fulfillmentStatus: string
  refunds?: Array<{ id: string; status: string; createdAt: string }>
}

export function currentRefund(order: RefundOrder) {
  return [...(order.refunds || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

export function refundStatusText(order: RefundOrder): string {
  if (order.fulfillmentStatus === 'refunded') return '已退款'
  const status = currentRefund(order)?.status
  return ({ pending: '退款待审核', processing: '退款处理中', approved: '退款处理中', success: '已退款', rejected: '退款已拒绝', failed: '退款异常' } as Record<string, string>)[status || ''] || ''
}

export function canApplyRefund(order: RefundOrder): boolean {
  const refund = currentRefund(order)
  return order.paymentStatus === 'paid' && order.fulfillmentStatus === 'pending' &&
    (!refund || refund.status === 'rejected')
}
