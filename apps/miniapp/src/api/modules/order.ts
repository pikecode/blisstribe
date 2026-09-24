import { request } from '@/api/request'

export type OrderStatus = string

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productImage?: string | null
  productName: string
  quantity: number
  unitPriceFen: number
  subtotalFen: number
}

export interface Order {
  id: string
  orderNo: string
  userId: string
  status: OrderStatus
  paymentStatus: string
  fulfillmentStatus: string
  totalAmountFen: number
  paymentAmountFen: number
  refundedAmountFen: number
  receiverName?: string
  receiverPhone?: string
  shippingAddress?: string
  trackingNo?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  completedAt?: string
  items: OrderItem[]
}

export interface OrderListResult {
  list: Order[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface OrderListParams {
  status?: string
  page?: number
  pageSize?: number
}

export interface CreateOrderParams {
  items: Array<{ productId: string; quantity: number }>
  receiverName: string
  receiverPhone: string
  shippingAddress: string
  remark?: string
}

export const orderApi = {
  list(params?: OrderListParams): Promise<OrderListResult> {
    return request<OrderListResult>({
      url: '/shop/orders',
      method: 'GET',
      data: params,
    })
  },

  detail(id: string): Promise<Order> {
    return request<Order>({
      url: `/shop/orders/${id}`,
      method: 'GET',
    })
  },

  create(data: CreateOrderParams): Promise<Order> {
    return request<Order>({
      url: '/shop/orders',
      method: 'POST',
      data,
    })
  },

  cancel(id: string): Promise<Order> {
    return request<Order>({
      url: `/shop/orders/${id}/cancel`,
      method: 'POST',
    })
  },
}
