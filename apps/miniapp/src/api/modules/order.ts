import { request } from '@/api/request'

export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'completed'

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  productTitle: string
  quantity: number
  price: number
  subtotal: number
}

export interface Order {
  id: number
  orderNo: string
  status: OrderStatus
  totalAmount: number
  paymentAmount: number
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  trackingNo?: string
  trackingUrl?: string
  shippedAt?: string
  completedAt?: string
}

export interface OrderListResult {
  list: Order[]
  total: number
  page: number
  pageSize: number
}

export interface OrderListParams {
  status?: OrderStatus | ''
  page?: number
  pageSize?: number
}

export interface CreateOrderParams {
  items: Array<{
    productId: number
    quantity: number
    priceInFen: number
  }>
  totalInFen: number
  remark?: string
  shippingAddress?: string
  recipientPhone?: string
  recipientName?: string
}

export const orderApi = {
  list(params?: OrderListParams): Promise<OrderListResult> {
    return request<OrderListResult>({
      url: '/shop/orders',
      method: 'GET',
      data: params,
    })
  },

  detail(id: number): Promise<Order> {
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

  cancel(id: number): Promise<void> {
    return request<void>({
      url: `/shop/orders/${id}/cancel`,
      method: 'POST',
    })
  },
}
