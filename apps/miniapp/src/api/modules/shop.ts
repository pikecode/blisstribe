import { request } from '@/api/request'

export interface ShopCategory {
  id: number
  code: string
  name: string
  icon?: string
  description?: string
  sortOrder: number
  status: number
}

export interface ShopProduct {
  id: number
  code: string
  name: string
  title: string
  description: string
  summary?: string
  images: string[]
  priceFen: number
  priceText?: string
  featured: boolean
  stockStatus: 'available' | 'limited' | 'sold_out'
  categoryId: number
  category?: ShopCategory
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
  id: bigint
  orderNo: string
  userId: bigint
  totalAmountFen: number
  paymentAmountFen: number
  paymentStatus: string
  fulfillmentStatus: string
  status: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export interface OrderItem {
  id: bigint
  orderId: bigint
  productId: bigint
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
  id: bigint
  orderId: bigint
  userId: bigint
  amountInFen: number
  reason?: string
  status: string
  wechatRefundNo?: string
  refundedAt?: string
  createdAt: string
  updatedAt: string
}

const REFUND_REASONS = [
  '质量问题',
  '与描述不符',
  '不需要了',
  '价格太贵',
  '拍错了',
  '其他',
]

function withQuery(url: string, params: Record<string, string | number | boolean | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

export const shopApi = {
  /**
   * 获取商品分类列表
   */
  categories(): Promise<ShopCategory[]> {
    return request<ShopCategory[]>({
      url: '/shop/categories',
      method: 'GET',
    })
  },

  /**
   * 获取商品列表
   */
  products(params?: {
    page?: number
    pageSize?: number
    featured?: boolean
    categoryId?: number
  }): Promise<ShopProductListResult> {
    return request<ShopProductListResult>({
      url: withQuery('/shop/products', {
        page: params?.page,
        pageSize: params?.pageSize,
        featured: params?.featured,
        categoryId: params?.categoryId,
      }),
      method: 'GET',
    })
  },

  /**
   * 获取商品详情
   */
  productDetail(id: number): Promise<ShopProduct> {
    return request<ShopProduct>({
      url: `/shop/products/${id}`,
      method: 'GET',
    })
  },

  /**
   * 获取订单详情
   */
  getOrderDetail(orderId: string | number) {
    return request<ShopOrder>({
      url: `/shop/orders/${orderId}`,
      method: 'GET',
    })
  },

  /**
   * 获取用户订单列表
   */
  getUserOrders(options?: {
    status?: string
    page?: number
    limit?: number
  }) {
    return request<{
      orders: ShopOrder[]
      total: number
      page: number
      limit: number
    }>({
      url: '/shop/orders',
      method: 'GET',
      params: options,
    })
  },

  /**
   * 申请退款
   */
  requestRefund(orderId: string | number, data: RefundRequest) {
    return request<RefundResponse>({
      url: `/shop/orders/${orderId}/refund`,
      method: 'POST',
      data,
    })
  },

  /**
   * 获取退款详情
   */
  getRefundDetail(refundId: string | number) {
    return request<RefundResponse>({
      url: `/shop/refunds/${refundId}`,
      method: 'GET',
    })
  },

  /**
   * 获取用户退款列表
   */
  getUserRefunds(options?: {
    status?: string
    page?: number
    limit?: number
  }) {
    return request<{
      refunds: RefundResponse[]
      total: number
      page: number
      limit: number
    }>({
      url: '/shop/refunds',
      method: 'GET',
      params: options,
    })
  },

  /**
   * 获取退款原因列表
   */
  getRefundReasons() {
    return REFUND_REASONS
  },

  /**
   * 获取退款状态标签
   */
  getRefundStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待审核',
      approved: '已批准，退款处理中',
      rejected: '已拒绝',
      success: '退款已到账',
      completed: '退款已到账',
    }
    return labels[status] || status
  },

  /**
   * 创建支付
   */
  createPayment(orderId: string | number) {
    return request<{ prepayId: string; outTradeNo: string }>({
      url: `/shop/orders/${orderId}/payment`,
      method: 'POST',
    })
  },
}
