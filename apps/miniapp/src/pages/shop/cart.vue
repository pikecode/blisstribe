<template>
  <view class="cart">
    <view class="cart__header">
      <text class="cart__title">购物车</text>
    </view>

    <!-- Empty Cart -->
    <view v-if="cartStore.itemCount === 0" class="cart__empty">
      <image src="/static/images/empty-cart.png" class="cart__empty-icon" />
      <text class="cart__empty-title">购物车是空的</text>
      <text class="cart__empty-desc">快去添加你喜欢的商品吧</text>
      <view class="cart__empty-action">
        <button class="cart__empty-btn" @tap="goProducts">继续购物</button>
      </view>
    </view>

    <!-- Cart Items -->
    <view v-else class="cart__content">
      <!-- Toolbar -->
      <view class="cart__toolbar">
        <view class="cart__checkbox-group">
          <checkbox
            :checked="cartStore.allSelected"
            :indeterminate="cartStore.someSelected && !cartStore.allSelected"
            class="cart__checkbox"
            @tap="cartStore.toggleSelectAll"
          />
          <text class="cart__checkbox-label">全选</text>
        </view>
      </view>

      <!-- Items List -->
      <view class="cart__items">
        <view v-for="item in cartStore.items" :key="Number(item.id)" class="cart__item">
          <view class="cart__item-select">
            <checkbox
              :checked="cartStore.selectedItemIds.has(item.id)"
              class="cart__checkbox"
              @tap="cartStore.toggleItem(item.id)"
            />
          </view>

          <view class="cart__item-product">
            <image
              v-if="item.product.images[0]"
              :src="item.product.images[0]"
              class="cart__item-image"
              mode="aspectFill"
            />
            <view v-else class="cart__item-image cart__item-image--empty" />

            <view class="cart__item-info">
              <text class="cart__item-title">{{ item.product.name }}</text>
              <text class="cart__item-price">¥{{ fenToYuan(item.product.priceFen) }}</text>

              <view class="cart__item-controls">
                <view class="cart__quantity">
                  <view
                    class="cart__quantity-btn"
                    :class="{ disabled: item.quantity <= 1 }"
                    @tap="decreaseQuantity(item)"
                  >
                    <text>−</text>
                  </view>
                  <text class="cart__quantity-value">{{ item.quantity }}</text>
                  <view
                    class="cart__quantity-btn"
                    :class="{ disabled: isMaxQuantity(item) }"
                    @tap="increaseQuantity(item)"
                  >
                    <text>+</text>
                  </view>
                </view>

                <view class="cart__item-delete" @tap="deleteItem(item.id)">
                  <text>删除</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Footer Summary -->
      <view class="cart__footer">
        <view class="cart__summary">
          <view class="cart__summary-row">
            <text class="cart__summary-label">已选商品：</text>
            <text class="cart__summary-value">{{ cartStore.selectedQuantity }} 件</text>
          </view>
          <view class="cart__summary-row">
            <text class="cart__summary-label">合计：</text>
            <text class="cart__summary-amount">¥{{ fenToYuan(cartStore.selectedAmount) }}</text>
          </view>
        </view>

        <view class="cart__actions">
          <view
            class="cart__action-btn cart__action-btn--secondary"
            :class="{ disabled: cartStore.selectedQuantity === 0 }"
            @tap="deleteSelected"
          >
            删除
          </view>
          <view
            class="cart__action-btn cart__action-btn--primary"
            :class="{ disabled: cartStore.selectedQuantity === 0 }"
            @tap="checkout"
          >
            结算
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onLoad, computed } from 'vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useCartStore } from '@/stores/modules/cart'
import { cartApi, fenToYuan, type CartItem } from '@/api/modules/cart'

const authStore = useAuthStore()
const cartStore = useCartStore()
const loading = ref(false)

const isMaxQuantity = (item: CartItem): boolean => {
  return item.quantity >= item.product.available
}

async function loadCart() {
  if (!authStore.isLogin) {
    uni.redirectTo({ url: '/pages/auth/auth' })
    return
  }

  loading.value = true
  try {
    const data = await cartApi.getCart()
    cartStore.setCart(data)
  } catch (err) {
    console.error('Failed to load cart:', err)
  } finally {
    loading.value = false
  }
}

async function increaseQuantity(item: CartItem) {
  if (isMaxQuantity(item)) return

  loading.value = true
  try {
    const newQuantity = item.quantity + 1
    const data = await cartApi.updateItem(item.id, newQuantity)
    cartStore.setCart(data)
  } catch (err) {
    console.error('Failed to increase quantity:', err)
  } finally {
    loading.value = false
  }
}

async function decreaseQuantity(item: CartItem) {
  if (item.quantity <= 1) return

  loading.value = true
  try {
    const newQuantity = item.quantity - 1
    const data = await cartApi.updateItem(item.id, newQuantity)
    cartStore.setCart(data)
  } catch (err) {
    console.error('Failed to decrease quantity:', err)
  } finally {
    loading.value = false
  }
}

async function deleteItem(itemId: bigint) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此商品吗？',
    confirmText: '删除',
    cancelText: '取消',
    success: async (res) => {
      if (!res.confirm) return

      loading.value = true
      try {
        const data = await cartApi.removeItem(itemId)
        cartStore.setCart(data)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        console.error('Failed to delete item:', err)
      } finally {
        loading.value = false
      }
    },
  })
}

async function deleteSelected() {
  if (cartStore.selectedQuantity === 0) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认删除',
    content: `确定要删除选中的 ${cartStore.selectedQuantity} 件商品吗？`,
    confirmText: '删除',
    cancelText: '取消',
    success: async (res) => {
      if (!res.confirm) return

      loading.value = true
      try {
        // Delete items one by one
        for (const item of cartStore.selectedItems) {
          await cartApi.removeItem(item.id)
        }
        // Reload cart
        const data = await cartApi.getCart()
        cartStore.setCart(data)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        console.error('Failed to delete selected items:', err)
      } finally {
        loading.value = false
      }
    },
  })
}

function checkout() {
  if (cartStore.selectedQuantity === 0) {
    uni.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }

  // Navigate to checkout page with selected items
  const selectedItems = cartStore.selectedItems
  uni.navigateTo({
    url: `/pages/shop/checkout?items=${JSON.stringify(selectedItems.map(item => ({
      id: Number(item.id),
      productId: Number(item.productId),
      quantity: item.quantity,
    })))}`,
  })
}

function goProducts() {
  uni.redirectTo({ url: '/pages/products/index' })
}

onLoad(() => {
  loadCart()
})
</script>

<style lang="scss" scoped>
.cart {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;

  &__header {
    padding: 28rpx;
    background: var(--color-bg-white);
    border-bottom: 1rpx solid var(--color-border);
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 34rpx;
    font-weight: 700;
  }

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60rpx 28rpx;
  }

  &__empty-icon {
    width: 160rpx;
    height: 160rpx;
    margin-bottom: 24rpx;
    opacity: 0.6;
  }

  &__empty-title {
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 600;
    margin-bottom: 8rpx;
  }

  &__empty-desc {
    color: var(--color-text-secondary);
    font-size: 24rpx;
    margin-bottom: 32rpx;
  }

  &__empty-action {
    width: 100%;
  }

  &__empty-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 44rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__toolbar {
    padding: 16rpx 28rpx;
    background: var(--color-bg-white);
    border-bottom: 1rpx solid var(--color-border);
  }

  &__checkbox-group {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__checkbox {
    width: 32rpx;
    height: 32rpx;
    flex-shrink: 0;
  }

  &__checkbox-label {
    color: var(--color-text);
    font-size: 24rpx;
  }

  &__items {
    flex: 1;
    overflow-y: auto;
    padding: 12rpx 0;
  }

  &__item {
    display: flex;
    gap: 12rpx;
    padding: 16rpx 28rpx;
    background: var(--color-bg-white);
    border-bottom: 1rpx solid var(--color-border);
    align-items: flex-start;
  }

  &__item-select {
    padding-top: 6rpx;
    flex-shrink: 0;
  }

  &__item-product {
    flex: 1;
    display: flex;
    gap: 16rpx;
    min-width: 0;
  }

  &__item-image {
    width: 120rpx;
    height: 120rpx;
    border-radius: 8rpx;
    background: var(--color-bg-subtle);
    flex-shrink: 0;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
    }
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
  }

  &__item-title {
    display: block;
    color: var(--color-text);
    font-size: 26rpx;
    font-weight: 600;
    line-height: 1.4;
    word-break: break-word;
  }

  &__item-price {
    display: block;
    color: #f97316;
    font-size: 24rpx;
    font-weight: 700;
  }

  &__item-controls {
    display: flex;
    gap: 12rpx;
    margin-top: 8rpx;
    justify-content: space-between;
  }

  &__quantity {
    display: flex;
    align-items: center;
    gap: 6rpx;
    border: 1rpx solid var(--color-border);
    border-radius: 6rpx;
    overflow: hidden;
  }

  &__quantity-btn {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
    transition: all 200ms ease;

    &:active:not(.disabled) {
      background: var(--color-bg-subtle);
    }

    &.disabled {
      color: var(--color-text-tertiary);
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__quantity-value {
    min-width: 44rpx;
    text-align: center;
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__item-delete {
    padding: 6rpx 12rpx;
    color: #ef4444;
    font-size: 22rpx;
    font-weight: 500;
    transition: all 200ms ease;

    &:active {
      opacity: 0.7;
    }
  }

  &__footer {
    padding: 16rpx 28rpx 28rpx;
    background: var(--color-bg-white);
    border-top: 1rpx solid var(--color-border);
  }

  &__summary {
    padding: 16rpx 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    margin-bottom: 16rpx;
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__summary-label {
    color: var(--color-text-secondary);
    font-size: 24rpx;
  }

  &__summary-value {
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__summary-amount {
    color: #f97316;
    font-size: 28rpx;
    font-weight: 700;
  }

  &__actions {
    display: flex;
    gap: 12rpx;
  }

  &__action-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 600;
    transition: all 200ms ease;

    &:active:not(.disabled) {
      transform: scale(0.96);
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.2);
    }

    &--secondary {
      background: var(--color-bg-subtle);
      color: var(--color-text);
      border: 1rpx solid var(--color-border);
    }
  }
}
</style>
