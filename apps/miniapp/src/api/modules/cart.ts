import { request } from '@/api/request'

export interface CartProduct {
  id: string
  name: string
  images: string[]
  status: number
}

export interface CartSku {
  id: string
  skuCode: string
  specifications: Record<string, string>
  priceFen: number
  totalStock: number
  reservedStock: number
  soldStock: number
  available: number
  enabled: boolean
  product: CartProduct
}

export interface CartItem {
  id: string
  skuId: string
  quantity: number
  sku: CartSku
}

export interface Cart {
  id: string
  userId: string
  items: CartItem[]
  totalQuantity: number
  totalAmount: number
}

export const cartApi = {
  /**
   * Get shopping cart
   */
  getCart(): Promise<Cart> {
    return request({
      url: '/shop/cart',
      method: 'GET',
    })
  },

  /**
   * Add item to cart
   */
  addItem(skuId: string, quantity: number): Promise<Cart> {
    return request({
      url: '/shop/cart/items',
      method: 'POST',
      data: {
        skuId,
        quantity,
      },
    })
  },

  /**
   * Update item quantity
   */
  updateItem(itemId: string, quantity: number): Promise<Cart> {
    return request({
      url: `/shop/cart/items/${itemId}`,
      method: 'PATCH',
      data: {
        quantity,
      },
    })
  },

  /**
   * Remove item from cart
   */
  removeItem(itemId: string): Promise<Cart> {
    return request({
      url: `/shop/cart/items/${itemId}`,
      method: 'DELETE',
    })
  },

  /**
   * Clear entire cart
   */
  clearCart(): Promise<Cart> {
    return request({
      url: '/shop/cart',
      method: 'DELETE',
    })
  },
}

/**
 * Convert amount from fen (分) to yuan (元)
 * 1 yuan = 100 fen
 */
export function fenToYuan(fen: number): string {
  return (fen / 100).toFixed(2)
}

/**
 * Convert amount from yuan (元) to fen (分)
 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}
