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
      <view class="product-price">¥{{ formatPrice(product.priceFen) }}</view>
      <button class="add-cart-btn" @click.stop="handleAddToCart">加入购物车</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import type { ShopProduct } from '@/api/modules/shop'

const props = defineProps<{
  product: ShopProduct
}>()

function formatPrice(priceFen: number): string {
  return (priceFen / 100).toFixed(2)
}

function goToDetail() {
  uni.navigateTo({
    url: `/pages/products/detail?id=${props.product.id}`,
  })
}

function handleAddToCart() {
  uni.showToast({
    title: '已添加到购物车',
    icon: 'success',
  })
}
</script>

<style scoped lang="scss">
.product-card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s ease;

  &:active {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.product-image-container {
  width: 100%;
  height: 140px;
  background: #f5f5f5;
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
  color: #999;
  font-size: 12px;
}

.product-info {
  padding: 10px;
}

.product-name {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
}

.product-price {
  font-size: 15px;
  color: #e74c3c;
  font-weight: bold;
  margin-bottom: 8px;
}

.add-cart-btn {
  width: 100%;
  padding: 8px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1;
}
</style>
