import { request } from '@/api/request'

export interface ShopAddress {
  id: string
  userId: string
  receiverName: string
  receiverPhone: string
  fullAddress: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type ShopAddressInput = Pick<ShopAddress, 'receiverName' | 'receiverPhone' | 'fullAddress'> & {
  isDefault?: boolean
}

export const addressApi = {
  list: () => request<ShopAddress[]>({ url: '/shop/addresses', method: 'GET' }),
  create: (data: ShopAddressInput) => request<ShopAddress>({ url: '/shop/addresses', method: 'POST', data }),
  update: (id: string, data: Partial<ShopAddressInput>) => request<ShopAddress>({ url: `/shop/addresses/${id}`, method: 'PATCH', data }),
  remove: (id: string) => request<{ success: boolean }>({ url: `/shop/addresses/${id}`, method: 'DELETE' }),
}
