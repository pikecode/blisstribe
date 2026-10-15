import request from '@/utils/request'

export interface ReceptionHours { weekdays: number[]; startMinute: number; endMinute: number }

export interface ServiceInstitution {
  receptionHours: ReceptionHours
  id: number
  partnerId: number
  name: string
  address: string
  contactName: string
  contactPhone: string
  status: number
  partner: { id: number; partnerNo: string; displayName: string }
  createdAt: string
  updatedAt: string
}

export interface ServiceOfferingItem {
  kind: 'service' | 'goods'
  skuId: number | null
  deliveryMethod: 'pickup' | 'shipping'
  returnNotice: string
  goodsSnapshot: { productName?: string; specifications?: Record<string, string> }
  id: number
  offeringId: number
  name: string
  description: string
  quantity: number
  allocatedAmountFen: number
  institutionSettlementFen: number
  sortOrder: number
}

export interface ServiceOfferingReadiness {
  checkedAt: string
  canPublish: boolean
  availableNow: boolean
  requiresQualification: boolean
  summary: string
  checks: Array<{ key: string; label: string; passed: boolean; blocking: boolean; message: string; target: 'product' | 'institution' | 'offering' | 'slots' | 'goods' }>
}
export interface ServiceWorkbench {
  checkedAt: string
  date: string
  items: Array<{ key: string; label: string; count: number; path: string; query: Record<string, string> }>
}

export interface ServiceOffering {
  readiness?: ServiceOfferingReadiness
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
  defaultPromoterRateBps: number
  version: number
  status: number
  sortOrder: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  product: { id: number; title: string; coverUrl: string; status: number }
  institution: { id: number; name: string; address: string; status: number }
  items: ServiceOfferingItem[]
}

export interface ServiceOfferingPayload {
  productId: number
  institutionId: number
  name: string
  subtitle?: string
  priceFen: number
  validityDays: number
  requiresQualification?: boolean
  appointmentNotice?: string
  refundNotice?: string
  defaultPromoterRateBps?: number
  sortOrder?: number
  items: Array<{
    kind?: 'service' | 'goods'
    skuId?: number
    deliveryMethod?: 'pickup' | 'shipping'
    returnNotice?: string
    name: string
    description?: string
    quantity: number
    allocatedAmountFen: number
    institutionSettlementFen: number
  }>
}

export interface ServiceQualification {
  professionalName: string
  id: number
  leadId: number
  offeringId: number
  status: 'active' | 'revoked'
  note: string
  confirmedByAdminId: number
  confirmedAt: string
  expiresAt: string | null
  revokedAt: string | null
  offering: ServiceOffering
}

export interface ServiceAppointment {
  entitlementId: number
  id: number
  status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'refund_pending' | 'cancelled' | 'no_show'
  requestedStartAt: string
  confirmedStartAt: string | null
  durationMinutes: number
  assignedStaffName: string
  patientNote: string
  cancelReason: string
  user: { id: number; nickname: string; phoneMasked: string }
  institution: { id: number; name: string; address: string }
  entitlement: { id: number; bookingBlocked: boolean; orderItem: { itemName: string; itemDescription: string } }
  plan: { id: number; order: { orderNo: string; offering: { id: number; name: string } } }
  createdAt: string
}

export interface ServiceRefund {
  id: number
  orderId: number
  refundNo: string
  outRefundNo: string
  requestedAmountFen: number
  approvedAmountFen: number | null
  reason: string
  status: 'pending' | 'processing' | 'success' | 'rejected' | 'withdrawn'
  wechatRefundId: string | null
  adminNote: string
  lastProviderStatus: string | null
  lastErrorCode: string | null
  completedAt: string | null
  createdAt: string
  user: { id: number; nickname: string; phoneMasked: string }
  order: { id: number; orderNo: string; offering: { id: number; name: string }; institution: { id: number; name: string } }
  items: Array<{ id: number; compensation: boolean; quantity: number; amountFen: number; entitlement: { orderItem: { itemName: string; kind: 'service' | 'goods' } } }>
  events: Array<{ id: number; eventType: string; actorType: string; fromStatus: string | null; toStatus: string; providerStatus: string | null; detail: string; createdAt: string }>
}

export interface ServiceOrder {
  id: number
  orderNo: string
  status: string
  paymentStatus: string
  totalAmountFen: number
  paymentAmountFen: number
  refundedAmountFen: number
  paidAt: string | null
  expiresAt: string
  createdAt: string
  offering: { id: number; name: string }
  institution: { id: number; name: string; address: string }
  user: { id: number; nickname: string; phoneMasked: string }
  items: Array<{ id: number; itemName: string; quantity: number; allocatedAmountFen: number }>
  plan: null | { id: number; status: string; startsAt: string; expiresAt: string; entitlements: Array<{ id: number; totalQuantity: number; reservedQuantity: number; usedQuantity: number; refundFrozen: number; refundedQuantity: number; availableQuantity: number; orderItem: { itemName: string; kind: 'service' | 'goods' } }>; appointments: ServiceAppointment[] }
  refunds: ServiceRefund[]
}

export const serviceProgramApi = {
  readiness(id: number) { return request.get<ServiceOfferingReadiness>(`/admin/service-offerings/${id}/readiness`) },
  workbench() { return request.get<ServiceWorkbench>('/admin/service-operations/workbench') },
  disputes(params: { status?: string; overdue?: boolean; keyword?: string; page?: number }) { return request.get<{ list: ServiceDispute[]; total: number; page: number; pageSize: number }>('/admin/service-disputes', { params }) },
  dispute(id: number) { return request.get<ServiceDispute>(`/admin/service-disputes/${id}`) },
  disputeAction(id: number, data: { action: 'contact' | 'evidence' | 'propose' | 'review' | 'extend' | 'retry_refund' | 'finish_rearrange'; replacementAppointmentId?: number; correctedEntitlementId?: number; expectedUpdatedAt: string; note: string; ownerName?: string; outcome?: string; refundAmountFen?: number; costBearer?: string; clawbackNote?: string; restoredExpiresAt?: string; deadline?: string }) { return request.post<ServiceDispute>(`/admin/service-disputes/${id}/action`, data) },

  goodsReturns(planId: number) { return request.get<ServiceGoodsReturn[]>(`/admin/service-plans/${planId}/goods-returns`) },
  goodsReturnAction(id: number, data: { action: 'approve' | 'reject' | 'inspect' | 'dispute'; note: string; returnAddress?: string; reusable?: boolean }) { return request.post(`/admin/service-goods-returns/${id}/action`, data) },

  goods(planId: number) { return request.get<ServiceGoods[]>(`/admin/service-plans/${planId}/goods`) },
  goodsAction(id: number, data: { action: 'ready' | 'ship' | 'receive' | 'recover'; expressCompany?: string; trackingNo?: string; evidence?: string }) { return request.post(`/admin/service-goods/${id}/action`, data) },

  followUps(planId: number) { return request.get<ServiceFollowUp[]>(`/admin/service-plans/${planId}/follow-ups`) },
  createFollowUp(planId: number, data: { clientRequestId: string; scheduledAt: string; contactName: string; purpose: string }) { return request.post<ServiceFollowUp>(`/admin/service-plans/${planId}/follow-ups`, data) },
  resolveFollowUp(id: number, data: { status: 'completed' | 'cancelled'; outcome: string }) { return request.post<ServiceFollowUp>(`/admin/service-follow-ups/${id}/resolve`, data) },
  listSlots(institutionId: number) {
    return request.get<Array<{ id: number; startAt: string; endAt: string; capacity: number; available: number; enabled: boolean }>>('/admin/service-appointments/slots', { params: { institutionId } })
  },
  createSlot(data: { institutionId: number; startAt: string; endAt: string; capacity: number }) {
    return request.post('/admin/service-appointments/slots', data)
  },
  closeSlot(id: number) { return request.post(`/admin/service-appointments/slots/${id}/close`) },
  listInstitutions(): Promise<ServiceInstitution[]> {
    return request.get('/admin/service-institutions')
  },
  createInstitution(data: { partnerId: number; name: string; address?: string; contactName?: string; contactPhone?: string; receptionHours?: ReceptionHours }) {
    return request.post<ServiceInstitution>('/admin/service-institutions', data)
  },
  updateInstitution(id: number, data: Partial<Pick<ServiceInstitution, 'name' | 'address' | 'contactName' | 'contactPhone' | 'status' | 'receptionHours'>>) {
    return request.put<ServiceInstitution>(`/admin/service-institutions/${id}`, data)
  },
  listOfferings(params: { productId?: number | ''; institutionId?: number | ''; status?: number | ''; page?: number; pageSize?: number }) {
    return request.get<{ list: ServiceOffering[]; total: number; page: number; pageSize: number }>('/admin/service-offerings', { params })
  },
  createOffering(data: ServiceOfferingPayload) {
    return request.post<ServiceOffering>('/admin/service-offerings', data)
  },
  updateOffering(id: number, data: Partial<ServiceOfferingPayload>) {
    return request.put<ServiceOffering>(`/admin/service-offerings/${id}`, data)
  },
  publishOffering(id: number) {
    return request.post<ServiceOffering>(`/admin/service-offerings/${id}/publish`)
  },
  unpublishOffering(id: number) {
    return request.post<ServiceOffering>(`/admin/service-offerings/${id}/unpublish`)
  },
  listLeadQualifications(leadId: number) {
    return request.get<ServiceQualification[]>(`/admin/product-leads/${leadId}/service-qualifications`)
  },
  syncLeadQualifications(leadId: number, data: { offeringIds: number[]; professionalName?: string; expiresAt?: string; note?: string }) {
    return request.put<ServiceQualification[]>(`/admin/product-leads/${leadId}/service-qualifications`, data)
  },
  listAppointments(params: { status?: string; institutionId?: number | ''; date?: string }) {
    return request.get<ServiceAppointment[]>('/admin/service-appointments', { params })
  },
  confirmAppointment(id: number, data: { confirmedStartAt?: string; durationMinutes?: number; assignedStaffName?: string }) {
    return request.post<ServiceAppointment>(`/admin/service-appointments/${id}/confirm`, data)
  },
  arriveAppointment(id: number) {
    return request.post<ServiceAppointment>(`/admin/service-appointments/${id}/arrive`)
  },
  completeAppointment(id: number, performedByName: string) {
    return request.post<ServiceAppointment>(`/admin/service-appointments/${id}/complete`, { performedByName })
  },
  proposeReschedule(id: number, slotId: number, reason: string) { return request.post(`/admin/service-appointments/${id}/propose-reschedule`, { slotId, reason }) },
  restoreBooking(id: number, reason: string) { return request.post(`/admin/service-appointments/${id}/restore-booking`, { reason }) },
  cancelAppointment(id: number, reason: string) { return request.post(`/admin/service-appointments/${id}/cancel`, { reason }) },
  noShowAppointment(id: number, reason: string) {
    return request.post<ServiceAppointment>(`/admin/service-appointments/${id}/no-show`, { reason })
  },
  listRefunds(status?: string) {
    return request.get<ServiceRefund[]>('/admin/service-refunds', { params: { status } })
  },
  getRefund(id: number) {
    return request.get<ServiceRefund>(`/admin/service-refunds/${id}`)
  },
  reviewRefund(id: number, data: { approved: boolean; adminNote?: string }) {
    return request.post<ServiceRefund>(`/admin/service-refunds/${id}/review`, data)
  },
  resolveClosedRefund(id: number) { return request.post<ServiceRefund>(`/admin/service-refunds/${id}/resolve-closed`) },
  queryRefundProvider(id: number) {
    return request.post<ServiceRefund>(`/admin/service-refunds/${id}/query-provider`)
  },
  listOrders(params: { keyword?: string; status?: string; institutionId?: number | ''; page?: number; pageSize?: number }) {
    return request.get<{ list: ServiceOrder[]; total: number; page: number; pageSize: number }>('/admin/service-orders', { params })
  },
  extendPlan(id: number, data: { entitlementId: number; startAt: string; endAt: string; reason: string }) { return request.post<ServiceOrder>(`/admin/service-orders/${id}/extend-plan`, data) },
  getOrder(id: number) {
    return request.get<ServiceOrder>(`/admin/service-orders/${id}`)
  },
}

export interface ServiceFollowUp {
  id: number
  planId: number
  scheduledAt: string
  contactName: string
  purpose: string
  status: 'scheduled' | 'completed' | 'cancelled'
  outcome: string
  patientFeedback: string
  feedbackAt: string | null
  completedAt: string | null
}

export interface ServiceGoods { id: number; name: string; quantity: number; refundedQuantity: number; frozenQuantity: number; deliveredQuantity: number; status: string; method: 'pickup' | 'shipping'; snapshot: { productName?: string; specifications?: Record<string, string> }; returnNotice: string; allocatedAmountFen: number; address: { receiverName: string; receiverPhone: string; fullAddress: string } | null; expressCompany: string; trackingNo: string; deliveredAt: string | null }

export interface ServiceGoodsReturn { id: number; entitlementId: number; name: string; quantity: number; reason: string; images: string[]; status: string; note: string; returnAddress: string; deadline: string | null; expressCompany: string; trackingNo: string; refundId: number | null; refundStatus: string | null; createdAt: string }

export interface ServiceDispute {
  id: number; orderId: number; planId: number; appointmentId: number; replacementAppointmentId: number | null; entitlementId: number; correctedEntitlementId: number | null; correctedItemName: string | null; reasonType: string; description: string; status: string; ownerName: string; evidence: string; outcome: string; proposal: string; refundAmountFen: number; restoredExpiresAt: string | null; refundId: number | null; refundStatus: string | null; deadline: string | null; acceptedAt: string | null; resolvedAt: string | null; settlementHeld: boolean; createdAt: string; updatedAt: string; orderNo: string; institutionName: string; itemName: string; performedByName: string; completedAt: string | null;
  events: Array<{ id: number; actorType: string; eventType: string; detail: string; createdAt: string }>;
  costBearer?: string; clawbackNote?: string; refundLimitFen?: number; user?: { nickname: string; phoneMasked: string };
}
