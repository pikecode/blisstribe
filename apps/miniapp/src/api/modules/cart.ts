import { request } from '@/api/request'

export interface CartProduct {
  id: bigint
  name: string
  images: string[]
  priceFen: number
  totalStock: number
  available: number
}

export interface CartItem {
  id: bigint
  productId: bigint
  quantity: number
  product: CartProduct
}

export interface Cart {
  id: bigint
  userId: bigint
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
  addItem(productId: bigint | number, quantity: number): Promise<Cart> {
    return request({
      url: '/shop/cart/items',
      method: 'POST',
      data: {
        productId,
        quantity,
      },
    })
  },

  /**
   * Update item quantity
   */
  updateItem(itemId: bigint | number, quantity: number): Promise<Cart> {
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
  removeItem(itemId: bigint | number): Promise<Cart> {
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
