import request from '@/utils/request'

export type ChannelCheckResult = 'paid' | 'refunded' | 'closed' | 'not_found' | 'unknown'

export interface PaymentException {
  id: number
  outTradeNo: string
  wechatTransactionId: string
  amountFen: number
  status: string
  createdAt: string
  order: { orderNo: string; status: string; paymentStatus: string }
  reviews: Array<{
    channelCheckResult: ChannelCheckResult
    resolutionNote: string
    reviewedByAdminId: number
    createdAt: string
  }>
}

export const paymentExceptionApi = {
  list(params: { page: number; pageSize: number; status?: string }) {
    return request.get<{ list: PaymentException[]; total: number }>(
      '/admin/shop/payment-exceptions',
      { params },
    )
  },
  review(id: number, data: { channelCheckResult: ChannelCheckResult; resolutionNote: string }) {
    return request.post(`/admin/shop/payment-exceptions/${id}/review`, data)
  },
}
