import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import type { Cart, CartItem } from '@/api/modules/cart'

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart | null>(null)
  const selectedItemIds = ref<Set<string>>(new Set())

  const items = computed(() => cart.value?.items || [])
  const itemCount = computed(() => items.value.length)
  const totalQuantity = computed(() => cart.value?.totalQuantity || 0)
  const totalAmount = computed(() => cart.value?.totalAmount || 0)

  /**
   * Selected items
   */
  const selectedItems = computed(() =>
    items.value.filter(item => selectedItemIds.value.has(item.id))
  )

  /**
   * Selected quantity
   */
  const selectedQuantity = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  /**
   * Selected amount in fen
   */
  const selectedAmount = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + item.product.priceFen * item.quantity, 0)
  )

  /**
   * Whether all items are selected
   */
  const allSelected = computed(
    () => itemCount.value > 0 && selectedItemIds.value.size === itemCount.value
  )

  /**
   * Whether some items are selected
   */
  const someSelected = computed(
    () => selectedItemIds.value.size > 0 && selectedItemIds.value.size < itemCount.value
  )

  function setCart(data: Cart): void {
    cart.value = data
    storage.set('cart', data, { expireSeconds: 24 * 3600 })
  }

  function clearCart(): void {
    cart.value = null
    selectedItemIds.value.clear()
    storage.remove('cart')
  }

  function toggleItem(itemId: string): void {
    if (selectedItemIds.value.has(itemId)) {
      selectedItemIds.value.delete(itemId)
    } else {
      selectedItemIds.value.add(itemId)
    }
  }

  function selectAll(): void {
    selectedItemIds.value = new Set(items.value.map(item => item.id))
  }

  function deselectAll(): void {
    selectedItemIds.value.clear()
  }

  function toggleSelectAll(): void {
    if (allSelected.value) {
      deselectAll()
    } else {
      selectAll()
    }
  }

  function removeItem(itemId: string): void {
    if (!cart.value) return
    cart.value.items = cart.value.items.filter(item => item.id !== itemId)
    selectedItemIds.value.delete(itemId)
    setCart(cart.value)
  }

  function updateItemQuantity(itemId: string, quantity: number): void {
    if (!cart.value) return
    const item = cart.value.items.find(i => i.id === itemId)
    if (item) {
      item.quantity = quantity
      setCart(cart.value)
    }
  }

  return {
    cart,
    items,
    itemCount,
    totalQuantity,
    totalAmount,
    selectedItems,
    selectedQuantity,
    selectedAmount,
    selectedItemIds,
    allSelected,
    someSelected,
    setCart,
    clearCart,
    toggleItem,
    selectAll,
    deselectAll,
    toggleSelectAll,
    removeItem,
    updateItemQuantity,
  }
})
