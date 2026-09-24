import request from '@/utils/request'

export interface Refund {
  id: number
  refundNo: string
  orderId: number
  orderNo: string
  userId: number
  userName: string
  userPhone: string
  requestAmountFen: number
  approvedAmountFen?: number
  reason: string
  reasonSummary?: string
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'success' | 'completed' | 'failed'
  rejectionReason?: string
  remark?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    nickname: string
    phoneMasked: string
  }
}

export interface RefundListResult {
  list: Refund[]
  total: number
  page: number
  pageSize: number
}

export interface ApproveRefundDto {
  approved: true
  adminNote?: string
}

export interface RejectRefundDto {
  rejectReason: string
}

export const refundApi = {
  // List refunds
  listRefunds(params: {
    page?: number
    pageSize?: number
    status?: string
    keyword?: string
    startDate?: string
    endDate?: string
  }) {
    return request.get<RefundListResult>('/admin/shop/refunds', { params })
  },

  // Get refund detail
  getRefund(id: number) {
    return request.get<Refund>(`/admin/shop/refunds/${id}`)
  },

  // Approve refund
  approveRefund(id: number, data: ApproveRefundDto) {
    return request.post(`/admin/shop/refunds/${id}/approve`, data)
  },

  // Reject refund
  rejectRefund(id: number, data: RejectRefundDto) {
    return request.post(`/admin/shop/refunds/${id}/reject`, data)
  },

}
