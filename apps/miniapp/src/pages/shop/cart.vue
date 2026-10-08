<template>
  <view class="cart">
    <!-- Empty Cart -->
    <view v-if="cartStore.itemCount === 0" class="cart__empty">
      <view class="cart__empty-icon-wrap">
        <image src="/static/tabbar/cart.png" class="cart__empty-icon" mode="aspectFit" />
      </view>
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
        <view class="cart__checkbox-group" @tap="cartStore.toggleSelectAll">
          <view
            class="cart__checkbox"
            :class="{ checked: cartStore.allSelected, indeterminate: cartStore.someSelected && !cartStore.allSelected }"
          >
            <text v-if="cartStore.allSelected">✓</text>
            <text v-else-if="cartStore.someSelected">−</text>
          </view>
          <text class="cart__checkbox-label">全选</text>
        </view>
        <text
          class="cart__toolbar-delete"
          :class="{ disabled: cartStore.selectedQuantity === 0 }"
          @tap="deleteSelected"
        >删除所选</text>
      </view>

      <!-- Items List -->
      <view class="cart__items">
        <view v-for="item in cartStore.items" :key="item.id" class="cart__item">
          <view class="cart__item-select" @tap="cartStore.toggleItem(item.id)">
            <view class="cart__checkbox" :class="{ checked: cartStore.selectedItemIds.has(item.id) }">
              <text v-if="cartStore.selectedItemIds.has(item.id)">✓</text>
            </view>
          </view>

          <image
            v-if="item.sku.product.images[0]"
            :src="item.sku.product.images[0]"
            class="cart__item-image"
            mode="aspectFill"
          />
          <view v-else class="cart__item-image cart__item-image--empty">
            <text>暂无图片</text>
          </view>

          <view class="cart__item-info">
            <view class="cart__item-heading">
              <text class="cart__item-title">{{ item.sku.product.name }}</text>
              <text class="cart__item-delete" @tap="deleteItem(item.id)">删除</text>
            </view>
            <text v-if="Object.keys(item.sku.specifications).length" class="cart__item-spec">
              {{ Object.entries(item.sku.specifications).map(([key, value]) => `${key}：${value}`).join(' / ') }}
            </text>

            <view class="cart__item-bottom">
              <text class="cart__item-price">¥{{ fenToYuan(item.sku.priceFen) }}</text>
              <view class="cart__quantity">
                <view
                  class="cart__quantity-btn"
                  :class="{ disabled: item.quantity <= 1 }"
                  @tap="decreaseQuantity(item)"
                >−</view>
                <text class="cart__quantity-value">{{ item.quantity }}</text>
                <view
                  class="cart__quantity-btn"
                  :class="{ disabled: isMaxQuantity(item) }"
                  @tap="increaseQuantity(item)"
                >+</view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Footer Summary -->
      <view class="cart__footer">
        <view class="cart__summary">
          <text class="cart__summary-label">合计</text>
          <text class="cart__summary-amount">¥{{ fenToYuan(cartStore.selectedAmount) }}</text>
        </view>
        <view
          class="cart__checkout"
          :class="{ disabled: cartStore.selectedQuantity === 0 }"
          @tap="checkout"
        >
          结算<text v-if="cartStore.selectedQuantity">（{{ cartStore.selectedQuantity }}）</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useCartStore } from '@/stores/modules/cart'
import { cartApi, fenToYuan, type CartItem } from '@/api/modules/cart'

const authStore = useAuthStore()
const cartStore = useCartStore()
const loading = ref(false)

const isMaxQuantity = (item: CartItem): boolean => {
  return item.quantity >= item.sku.available
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

async function deleteItem(itemId: string) {
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
    url: `/pages/shop/checkout?items=${encodeURIComponent(JSON.stringify(selectedItems.map(item => ({
      id: item.id,
      skuId: item.skuId,
      quantity: item.quantity,
    }))))}`,
  })
}

function goProducts() {
  uni.switchTab({ url: '/pages/shop/index' })
}

onShow(() => {
  loadCart()
})
</script>

<style lang="scss" scoped>
.cart {
  min-height: 100vh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;

  &__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60rpx 28rpx;
  }

  &__empty-icon-wrap {
    width: 144rpx;
    height: 144rpx;
    margin-bottom: 28rpx;
    border-radius: 50%;
    background: var(--color-bg-white);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
  }

  &__empty-icon {
    width: 72rpx;
    height: 72rpx;
    opacity: 0.75;
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
    margin: 20rpx 20rpx 0;
    padding: 20rpx 24rpx;
    background: var(--color-bg-white);
    border-radius: 18rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-sm);
  }

  &__checkbox-group {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__checkbox {
    width: 36rpx;
    height: 36rpx;
    flex-shrink: 0;
    border: 2rpx solid var(--color-border-strong);
    border-radius: 50%;
    background: #fff;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    line-height: 1;

    &.checked,
    &.indeterminate {
      border-color: var(--color-primary);
      background: var(--color-primary);
    }
  }

  &__checkbox-label {
    color: var(--color-text);
    font-size: 24rpx;
  }

  &__toolbar-delete {
    padding: 6rpx 0 6rpx 20rpx;
    color: var(--color-danger);
    font-size: 24rpx;

    &.disabled {
      color: var(--color-text-placeholder);
    }
  }

  &__items {
    flex: 1;
    overflow-y: auto;
    padding: 14rpx 20rpx 150rpx;
  }

  &__item {
    display: flex;
    gap: 16rpx;
    padding: 20rpx;
    background: var(--color-bg-white);
    border-radius: 18rpx;
    margin-bottom: 14rpx;
    box-shadow: var(--shadow-sm);
    align-items: center;
  }

  &__item-select {
    width: 40rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__item-image {
    width: 132rpx;
    height: 132rpx;
    border-radius: 14rpx;
    background: var(--color-bg-subtle);
    flex-shrink: 0;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
      font-size: 20rpx;
    }
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-self: stretch;
    min-width: 0;
  }

  &__item-heading {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
  }

  &__item-title {
    display: block;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    font-size: 26rpx;
    font-weight: 700;
    line-height: 36rpx;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__item-spec {
    align-self: flex-start;
    max-width: 100%;
    margin-top: 6rpx;
    padding: 4rpx 10rpx;
    border-radius: 8rpx;
    background: var(--color-bg-gray);
    color: var(--color-text-secondary);
    font-size: 21rpx;
    line-height: 30rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__item-price {
    flex-shrink: 0;
    color: #d04a36;
    font-size: 28rpx;
    font-weight: 800;
  }

  &__item-bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 8rpx;
  }

  &__quantity {
    display: flex;
    align-items: center;
    border: 1rpx solid var(--color-border);
    border-radius: 10rpx;
    overflow: hidden;
  }

  &__quantity-btn {
    width: 44rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text);
    font-size: 22rpx;
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
    min-width: 42rpx;
    text-align: center;
    color: var(--color-text);
    font-size: 22rpx;
    font-weight: 600;
  }

  &__item-delete {
    flex-shrink: 0;
    padding: 4rpx 0 4rpx 12rpx;
    color: var(--color-text-tertiary);
    font-size: 21rpx;
    font-weight: 500;
    transition: all 200ms ease;

    &:active {
      opacity: 0.7;
    }
  }

  &__footer {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    padding: 16rpx 24rpx;
    background: var(--color-bg-white);
    border-top: 1rpx solid var(--color-border);
    display: flex;
    align-items: center;
  }

  &__summary {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8rpx;
    min-width: 0;
  }

  &__summary-label {
    color: var(--color-text-secondary);
    font-size: 24rpx;
  }

  &__summary-amount {
    color: #d04a36;
    font-size: 32rpx;
    font-weight: 800;
  }

  &__checkout {
    width: 220rpx;
    height: 76rpx;
    margin-left: 20rpx;
    border-radius: 38rpx;
    background: var(--color-primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
    box-shadow: var(--shadow-action);
    transition: all 200ms ease;

    &:active:not(.disabled) {
      transform: scale(0.96);
    }

    &.disabled {
      background: #b7e8cb;
      box-shadow: none;
    }
  }
}
</style>
