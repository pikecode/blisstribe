<template>
  <view class="product-card">
    <view class="product-image-container" @click="goToDetail">
      <image
        v-if="product.images && product.images.length > 0"
        :src="product.images[0]"
        class="product-image"
        mode="aspectFill"
      />
      <view v-else class="product-image-placeholder">无图片</view>
    </view>
    <view class="product-info">
      <view class="product-name" @click="goToDetail">{{ product.name }}</view>
      <view class="product-meta">
        <view>
          <view class="product-price">¥{{ formatPrice(product.priceFen) }}</view>
          <text class="product-stock">{{ product.available > 5 ? '现货充足' : `仅剩 ${product.available} 件` }}</text>
        </view>
        <button
          class="add-cart-btn"
          :disabled="adding || product.available < 1"
          aria-label="加入购物车"
          @click.stop="handleAddToCart"
        >
          <text v-if="adding" class="add-cart-btn__loading">···</text>
          <image v-else class="add-cart-btn__icon" src="/static/icons/cart-add.png" mode="aspectFit" />
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ShopProduct } from '@/api/modules/shop'
import { cartApi } from '@/api/modules/cart'
import { useCartStore } from '@/stores/modules/cart'

const props = defineProps<{
  product: ShopProduct
}>()
const adding = ref(false)
const cartStore = useCartStore()

function formatPrice(priceFen: number): string {
  return (priceFen / 100).toFixed(2)
}

function goToDetail() {
  uni.navigateTo({
    url: `/pages/shop/detail?id=${props.product.id}`,
  })
}

async function handleAddToCart() {
  if (adding.value || props.product.available < 1) return

  const availableSkus = props.product.skus.filter(sku => sku.enabled && sku.available > 0)
  if (availableSkus.length !== 1) {
    goToDetail()
    return
  }

  adding.value = true
  try {
    cartStore.setCart(await cartApi.addItem(availableSkus[0].id, 1))
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch {
    uni.showToast({ title: '加入购物车失败', icon: 'none' })
  } finally {
    adding.value = false
  }
}
</script>

<style scoped lang="scss">
.product-card {
  border-radius: 20rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) ease, box-shadow var(--duration-fast) ease;

  &:active {
    transform: translateY(2rpx) scale(0.99);
    box-shadow: none;
  }
}

.product-image-container {
  width: 100%;
  height: 300rpx;
  background: var(--color-bg-gray);
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
}

.product-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: 22rpx;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  min-height: 72rpx;
  color: var(--color-text);
  font-size: 27rpx;
  font-weight: 700;
  line-height: 36rpx;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 12rpx;
}

.product-price {
  color: #d04a36;
  font-size: 31rpx;
  font-weight: 800;
}

.product-stock {
  display: block;
  margin-top: 4rpx;
  color: var(--color-text-tertiary);
  font-size: 20rpx;
}

.add-cart-btn {
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0;
  background: var(--color-primary);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after { border: 0; }
  &:active { opacity: 0.86; }
  &[disabled] { background: var(--color-bg-gray); }

  &__loading {
    color: #fff;
    font-size: 24rpx;
    line-height: 1;
  }

  &__icon {
    width: 38rpx;
    height: 38rpx;
  }
}
</style>
