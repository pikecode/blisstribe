import request from '@/utils/request'

export interface ShopOrder {
  id: number
  orderNo: string
  userId: number
  status: string
  paymentStatus: string
  fulfillmentStatus: string
  totalAmountFen: number
  discountAmountFen: number
  paymentAmountFen: number
  refundedAmountFen: number
  receiverName?: string
  receiverPhone?: string
  shippingAddress?: string
  trackingNo?: string
  remark?: string
  expiresAt: string
  paidAt?: string
  shippedAt?: string
  completedAt?: string
  cancelledAt?: string
  cancelReason?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    nickname: string
    phoneMasked: string
  }
  items?: ShopOrderItem[]
}

export interface ShopOrderItem {
  id: number
  orderId: number
  productId: number
  productName: string
  productImage?: string
  unitPriceFen: number
  quantity: number
  subtotalFen: number
  createdAt: string
}

export interface OrderListResult {
  orders: ShopOrder[]
  total: number
  page: number
  pageSize: number
}

export const shopOrderApi = {
  // List orders
  listOrders(params: {
    page?: number
    pageSize?: number
    status?: string
    paymentStatus?: string
    fulfillmentStatus?: string
    keyword?: string
    startDate?: string
    endDate?: string
  }) {
    return request.get<OrderListResult>('/admin/shop/orders', { params })
  },

  // Get order detail
  getOrder(id: number) {
    return request.get<ShopOrder>(`/admin/shop/orders/${id}`)
  },

  // Ship order
  shipOrder(id: number, data: { trackingNo: string; logisticsCompany?: string }) {
    return request.post(`/admin/shop/orders/${id}/ship`, data)
  },

  // Cancel order
  cancelOrder(id: number, reason: string) {
    return request.post(`/admin/shop/orders/${id}/cancel`, { reason })
  },

  // Export orders
  exportOrders(params: {
    status?: string
    paymentStatus?: string
    fulfillmentStatus?: string
    keyword?: string
    startDate?: string
    endDate?: string
  }) {
    return request.get('/admin/shop/orders/export', { params, responseType: 'blob' })
  },
}
