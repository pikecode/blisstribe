import { request } from '@/api/request'

export interface ShopCategory {
  id: string
  code: string
  name: string
  imageUrl?: string
  description?: string
  sortOrder: number
  status: number
}

export interface ShopProduct {
  id: string
  categoryId: string
  name: string
  description?: string | null
  images: string[]
  priceFen: number
  totalStock: number
  reservedStock: number
  soldStock: number
  available: number
  stockStatus: 'available' | 'limited' | 'sold_out'
  sortOrder: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface ShopProductListResult {
  list: ShopProduct[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ShopOrder {
  id: string
  orderNo: string
  userId: string
  totalAmountFen: number
  paymentAmountFen: number
  refundedAmountFen: number
  paymentStatus: string
  fulfillmentStatus: string
  status: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  receiverName?: string
  receiverPhone?: string
  shippingAddress?: string
  trackingNo?: string
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productImage?: string | null
  quantity: number
  unitPriceFen: number
  subtotalFen: number
  productName: string
}

export interface RefundRequest {
  amountInFen: number
  reason?: string
}

export interface RefundResponse {
  id: string
  orderId: string
  requestedAmountFen: number
  approvedAmountFen?: number | null
  reason: string
  status: string
  wechatRefundId?: string | null
  completedAt?: string | null
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

function withQuery(
  url: string,
  params: Record<string, string | number | boolean | undefined>
) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

export const shopApi = {
  categories(): Promise<ShopCategory[]> {
    return request<ShopCategory[]>({ url: '/shop/categories', method: 'GET' })
  },

  products(params?: { page?: number; pageSize?: number; categoryId?: string; keyword?: string }) {
    return request<ShopProductListResult>({
      url: withQuery('/shop/products', params || {}),
      method: 'GET',
    })
  },

  productDetail(id: string): Promise<ShopProduct> {
    return request<ShopProduct>({ url: `/shop/products/${id}`, method: 'GET' })
  },

  getOrderDetail(orderId: string): Promise<ShopOrder> {
    return request<ShopOrder>({ url: `/shop/orders/${orderId}`, method: 'GET' })
  },

  getUserOrders(options?: { status?: string; page?: number; pageSize?: number }) {
    return request<{
      list: ShopOrder[]
      total: number
      page: number
      pageSize: number
      hasMore: boolean
    }>({
      url: withQuery('/shop/orders', options || {}),
      method: 'GET',
    })
  },

  requestRefund(orderId: string, data: RefundRequest) {
    return request<RefundResponse>({
      url: `/shop/orders/${orderId}/refund`,
      method: 'POST',
      data,
    })
  },

  getRefundDetail(refundId: string) {
    return request<RefundResponse>({
      url: `/shop/refunds/${refundId}`,
      method: 'GET',
    })
  },

  getUserRefunds(options?: { status?: string; page?: number; pageSize?: number }) {
    const params = options
      ? { status: options.status, page: options.page, limit: options.pageSize }
      : {}
    return request<{ refunds: RefundResponse[]; total: number; page: number; pageSize: number }>({
      url: withQuery('/shop/refunds', params),
      method: 'GET',
    })
  },

  getRefundReasons() {
    return ['质量问题', '与描述不符', '不需要了', '价格太贵', '拍错了', '其他']
  },

  getRefundStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待审核',
      processing: '退款处理中',
      rejected: '已拒绝',
      success: '退款已到账',
      failed: '退款失败',
    }
    return labels[status] || status
  },

  createPayment(orderId: string) {
    return request<{ prepayId: string; outTradeNo: string }>({
      url: `/shop/orders/${orderId}/payment`,
      method: 'POST',
    })
  },
}
