export function servicePlanStatus(plan: { status: string; expiresAt: Date; disputes?: Array<{ status: string }>; entitlements: Array<{ totalQuantity: number; usedQuantity: number; reservedQuantity: number; refundFrozen: number; refundedQuantity: number; expiredQuantity: number; goodsReturns?: Array<{ status: string; refund?: { status: string } | null }>; orderItem?: { kind: string } }> }): string {
  const rights = plan.entitlements
  const available = rights.some((item) => item.totalQuantity > item.usedQuantity + item.reservedQuantity + item.refundFrozen + item.refundedQuantity + item.expiredQuantity)
  const usable = rights.some(item => item.totalQuantity > item.usedQuantity + item.reservedQuantity + item.refundFrozen + item.refundedQuantity + item.expiredQuantity && (item.orderItem?.kind === 'goods' || plan.expiresAt > new Date()))
  const reserved = rights.some((item) => item.reservedQuantity > 0)
  const frozen = plan.disputes?.some(entry => entry.status !== 'resolved') || rights.some((item) => item.refundFrozen > 0 || item.goodsReturns?.some(entry => ['requested', 'approved', 'shipped', 'disputed', 'refund_pending'].includes(entry.status) && entry.refund?.status !== 'success'))
  if (frozen && !usable && !reserved) return 'aftercare'
  if (reserved || usable) return 'active'
  if (rights.length && rights.every((item) => item.refundedQuantity === item.totalQuantity)) return 'refunded'
  if (available || rights.some((item) => item.expiredQuantity > 0)) return 'expired'
  return frozen ? 'aftercare' : 'completed'
}
