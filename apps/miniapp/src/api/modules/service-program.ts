import { request } from '@/api/request'

export interface ServiceOfferingItem {
  kind: 'service' | 'goods'
  skuId: number | null
  deliveryMethod: 'pickup' | 'shipping'
  returnNotice: string
  goodsSnapshot: { productName?: string; specifications?: Record<string, string> }
  id: number
  name: string
  description: string
  quantity: number
  allocatedAmountFen: number
  institutionSettlementFen: number
}

export interface ServiceOffering {
  earliestStartAt?: string | null
  availableStartDates?: string[]
  id: number
  productId: number
  institutionId: number
  name: string
  subtitle: string
  priceFen: number
  validityDays: number
  requiresQualification: boolean
  appointmentNotice: string
  refundNotice: string
  status: number
  institution: { id: number; name: string; address: string; receptionHours?: { weekdays: number[]; startMinute: number; endMinute: number } }
  items: ServiceOfferingItem[]
}

export interface ServiceOrderItem {
  kind: 'service' | 'goods'
  id: number
  itemName: string
  itemDescription: string
  quantity: number
  allocatedAmountFen: number
}

export interface ServiceEntitlement {
  id: number
  totalQuantity: number
  reservedQuantity: number
  bookingBlocked: boolean
  bookingBlockReason: string
  usedQuantity: number
  refundFrozen: number
  refundedQuantity: number
  expiredQuantity: number
  availableQuantity: number
  refundableQuantity: number
  orderItem: ServiceOrderItem
}

export interface ServicePlan {
  hasAftercare: boolean
  extensions?: Array<{ id: number; reason: string; addedDays: number; startAt: string; endAt: string; expiresAt: string }>
  id: number
  orderId: number
  status: string
  startsAt: string
  expiresAt: string
  institution?: { id: number; name: string; address: string }
  order?: {
    id: number
    orderNo: string
    status: string
    paymentStatus: string
    offering: { id: number; name: string }
  }
  entitlements: ServiceEntitlement[]
}

export interface ServiceOrder {
  id: number
  orderNo: string
  status: string
  paymentStatus: string
  totalAmountFen: number
  paymentAmountFen: number
  refundedAmountFen: number
  expiresAt: string
  paidAt: string | null
  createdAt: string
  offering: { id: number; name: string }
  institution: { id: number; name: string; address: string; receptionHours?: { weekdays: number[]; startMinute: number; endMinute: number } }
  items: ServiceOrderItem[]
  plan: ServicePlan | null
}

export interface ServiceAppointment {
  correctionStatus: string
  correctionReason: string
  performedByName: string
  confirmationDeadline: string | null
  proposedStartAt: string | null
  proposalExpiresAt: string | null
  proposalReason: string
  id: number
  planId: number
  entitlementId: number
  status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'refund_pending' | 'cancelled' | 'no_show'
  requestedStartAt: string
  confirmedStartAt: string | null
  durationMinutes: number
  assignedStaffName: string
  patientNote: string
  cancelReason: string
  confirmedAt: string | null
  arrivedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  createdAt: string
  plan?: ServicePlan
  entitlement: ServiceEntitlement
  institution: { id: number; name: string; address: string; receptionHours?: { weekdays: number[]; startMinute: number; endMinute: number } }
}

export interface ServiceRefundItem {
  compensation: boolean
  id: number
  entitlementId: number
  orderItemId: number
  quantity: number
  amountFen: number
  entitlement: ServiceEntitlement
}

export interface ServiceRefundEvent {
  id: number
  eventType: string
  actorType: string
  fromStatus: string | null
  toStatus: string
  providerStatus: string | null
  detail: string
  createdAt: string
}

export interface ServiceRefund {
  id: number
  orderId: number
  refundNo: string
  requestedAmountFen: number
  approvedAmountFen: number | null
  reason: string
  status: 'pending' | 'processing' | 'success' | 'rejected' | 'withdrawn'
  wechatRefundId: string | null
  adminNote: string
  completedAt: string | null
  lastProviderStatus: string | null
  createdAt: string
  updatedAt: string
  items: ServiceRefundItem[]
  events: ServiceRefundEvent[]
  order: ServiceOrder
}

export interface ServiceQualification {
  id: number
  offeringId: number
  status: string
  expiresAt: string | null
  offering: ServiceOffering
}

export interface ServicePaymentResult {
  mock: boolean
  status?: string
  prepayId: string
  outTradeNo: string
  paymentParams?: {
    appId: string
    timeStamp: string
    nonceStr: string
    package: string
    signType: 'RSA'
    paySign: string
  }
}

function withQuery(url: string, params?: Record<string, string | number | undefined>) {
  if (!params) return url
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

export interface ServiceNotice { id: number; title: string; detail: string; path: string; readAt: string | null; createdAt: string }

export const serviceProgramApi = {
  appointmentDispute(id: number): Promise<ServiceDispute | null> { return request({ url: `/service-appointments/${id}/dispute`, method: 'GET' }) },
  disputes(params: { planId?: number; page?: number } = {}): Promise<{ list: ServiceDispute[]; total: number; page: number; pageSize: number }> { return request({ url: withQuery('/service-disputes', params), method: 'GET' }) },
  dispute(id: number): Promise<ServiceDispute> { return request({ url: `/service-disputes/${id}`, method: 'GET' }) },
  createDispute(appointmentId: number, data: { reasonType: string; description: string; clientRequestId: string }): Promise<ServiceDispute> { return request({ url: `/service-appointments/${appointmentId}/disputes`, method: 'POST', data }) },
  disputeAction(id: number, data: { action: 'accept' | 'review' | 'disagree'; expectedUpdatedAt: string; note?: string }): Promise<ServiceDispute> { return request({ url: `/service-disputes/${id}/action`, method: 'POST', data }) },

  goodsReturns(planId: number): Promise<ServiceGoodsReturn[]> { return request({ url: `/service-plans/${planId}/goods-returns`, method: 'GET' }) },
  requestGoodsReturn(id: number, data: { quantity: number; reason: string; reasonType: 'personal' | 'quality'; clientRequestId: string; images?: string[] }): Promise<unknown> { return request({ url: `/service-goods/${id}/return`, method: 'POST', data }) },
  goodsReturnAction(id: number, data: { action: 'withdraw' | 'shipped'; expressCompany?: string; trackingNo?: string }): Promise<unknown> { return request({ url: `/service-goods-returns/${id}/action`, method: 'POST', data }) },

  goods(planId: number): Promise<ServiceGoods[]> { return request({ url: `/service-plans/${planId}/goods`, method: 'GET' }) },
  goodsAction(id: number, data: { action: 'address' | 'receive'; addressId?: number }): Promise<unknown> { return request({ url: `/service-goods/${id}/action`, method: 'POST', data }) },

  followUps(planId: number): Promise<ServiceFollowUp[]> { return request({ url: `/service-plans/${planId}/follow-ups`, method: 'GET' }) },
  followUpFeedback(id: number, feedback: string): Promise<unknown> { return request({ url: `/service-follow-ups/${id}/feedback`, method: 'POST', data: { feedback } }) },
  notices(): Promise<ServiceNotice[]> { return request({ url: '/service-notices', method: 'GET' }) },
  readNotice(id: number): Promise<unknown> { return request({ url: `/service-notices/${id}/read`, method: 'POST' }) },
  eligibility(id: number): Promise<{ canBuy: boolean; reason: string; earliestStartAt: string | null }> {
    return request({ url: `/service-offerings/${id}/eligibility`, method: 'GET' })
  },
  offerings(productId: number): Promise<ServiceOffering[]> {
    return request({ url: `/service-products/${productId}/offerings`, method: 'GET' })
  },
  offering(id: number): Promise<ServiceOffering> {
    return request({ url: `/service-offerings/${id}`, method: 'GET' })
  },
  qualifications(leadId: number): Promise<ServiceQualification[]> {
    return request({ url: `/products/my-leads/${leadId}/service-qualifications`, method: 'GET' })
  },
  createOrder(data: { offeringId: number; clientRequestId: string; leadId?: number }): Promise<ServiceOrder> {
    return request({ url: '/service-orders', method: 'POST', data })
  },
  orders(params?: { status?: string; page?: number; pageSize?: number }): Promise<{ list: ServiceOrder[]; total: number; page: number; pageSize: number }> {
    return request({ url: withQuery('/service-orders', params), method: 'GET' })
  },
  order(id: number): Promise<ServiceOrder> {
    return request({ url: `/service-orders/${id}`, method: 'GET' })
  },
  cancelOrder(id: number): Promise<ServiceOrder> {
    return request({ url: `/service-orders/${id}/cancel`, method: 'POST' })
  },
  createPayment(id: number, code: string): Promise<ServicePaymentResult> {
    return request({ url: `/service-orders/${id}/payment`, method: 'POST', data: { code } })
  },
  queryPayment(id: number): Promise<{ paymentStatus: string; status: string }> {
    return request({ url: `/service-orders/${id}/payment/query`, method: 'POST' })
  },
  async payOrder(id: number): Promise<{ paymentStatus: string; status: string }> {
    const { code } = await uni.login({ provider: 'weixin' })
    const result = await serviceProgramApi.createPayment(id, code)
    if (!result.mock) {
      if (!result.paymentParams) throw new Error('支付参数缺失')
      const { appId: _appId, ...paymentParams } = result.paymentParams
      let paymentError: unknown
      try {
        await uni.requestPayment({ provider: 'wxpay', ...paymentParams })
      } catch (error) {
        paymentError = error
      }
      const confirmed = await serviceProgramApi.queryPayment(id)
      if (confirmed.paymentStatus !== 'paid' && paymentError) throw paymentError
      return confirmed
    }
    return { paymentStatus: result.status === 'paid' ? 'paid' : 'unpaid', status: result.status || 'pending_payment' }
  },
  plans(): Promise<ServicePlan[]> {
    return request({ url: '/service-plans', method: 'GET' })
  },
  plan(id: number): Promise<ServicePlan> {
    return request({ url: `/service-plans/${id}`, method: 'GET' })
  },
  slots(institutionId: number): Promise<Array<{ id: number; startAt: string; endAt: string; available: number }>> {
    return request({ url: `/service-institutions/${institutionId}/slots`, method: 'GET' })
  },
  appointments(planId?: number): Promise<ServiceAppointment[]> {
    return request({ url: withQuery('/service-appointments', { planId }), method: 'GET' })
  },
  appointment(id: number): Promise<ServiceAppointment> {
    return request({ url: `/service-appointments/${id}`, method: 'GET' })
  },
  createAppointment(planId: number, data: { slotId: number; entitlementId: number; requestedStartAt: string; clientRequestId: string; patientNote?: string }): Promise<ServiceAppointment> {
    return request({ url: `/service-plans/${planId}/appointments`, method: 'POST', data })
  },
  acceptReschedule(id: number): Promise<ServiceAppointment> { return request({ url: `/service-appointments/${id}/accept-reschedule`, method: 'POST' }) },
  cancelAppointment(id: number, reason?: string): Promise<ServiceAppointment> {
    return request({ url: `/service-appointments/${id}/cancel`, method: 'POST', data: { reason } })
  },
  createRefund(orderId: number, data: { items: Array<{ entitlementId: number; quantity: number; appointmentIds?: number[] }>; reason: string }): Promise<ServiceRefund> {
    return request({ url: `/service-orders/${orderId}/refunds`, method: 'POST', data })
  },
  refunds(): Promise<ServiceRefund[]> {
    return request({ url: '/service-refunds', method: 'GET' })
  },
  refund(id: number): Promise<ServiceRefund> {
    return request({ url: `/service-refunds/${id}`, method: 'GET' })
  },
  withdrawRefund(id: number): Promise<ServiceRefund> {
    return request({ url: `/service-refunds/${id}/withdraw`, method: 'POST' })
  },
}

export interface ServiceFollowUp { id: number; scheduledAt: string; contactName: string; purpose: string; status: 'scheduled' | 'completed' | 'cancelled'; outcome: string; patientFeedback: string; feedbackAt: string | null }

export interface ServiceGoods { id: number; name: string; quantity: number; refundedQuantity: number; frozenQuantity: number; deliveredQuantity: number; status: string; method: 'pickup' | 'shipping'; snapshot: { productName?: string; specifications?: Record<string, string> }; returnNotice: string; allocatedAmountFen: number; address: { receiverName: string; receiverPhone: string; fullAddress: string } | null; expressCompany: string; trackingNo: string; deliveredAt: string | null }

export interface ServiceGoodsReturn { id: number; entitlementId: number; name: string; quantity: number; reason: string; images: string[]; status: string; note: string; returnAddress: string; deadline: string | null; expressCompany: string; trackingNo: string; refundId: number | null; refundStatus: string | null; createdAt: string }

export interface ServiceDispute {
  id: number; orderId: number; planId: number; appointmentId: number; replacementAppointmentId: number | null; entitlementId: number; correctedEntitlementId: number | null; correctedItemName: string | null; reasonType: string; description: string; status: string; ownerName: string; evidence: string; outcome: string; proposal: string; refundAmountFen: number; restoredExpiresAt: string | null; refundId: number | null; refundStatus: string | null; deadline: string | null; acceptedAt: string | null; resolvedAt: string | null; settlementHeld: boolean; createdAt: string; updatedAt: string; orderNo: string; institutionName: string; itemName: string; performedByName: string; completedAt: string | null;
  events: Array<{ id: number; actorType: string; eventType: string; detail: string; createdAt: string }>;
  costBearer?: string; clawbackNote?: string; refundLimitFen?: number; user?: { nickname: string; phoneMasked: string };
}
