<template>
  <view class="product-detail">
    <!-- Header with back button -->
    <view class="product-detail__header">
      <view class="product-detail__back" @tap="goBack">
        <text class="product-detail__back-icon">‹</text>
      </view>
      <text class="product-detail__title">商品详情</text>
      <view class="product-detail__header-spacer"></view>
    </view>

    <!-- Loading state -->
    <view v-if="loading" class="product-detail__state">
      <text>商品加载中...</text>
    </view>

    <!-- Error state -->
    <view v-else-if="loadError" class="product-detail__state product-detail__state--error">
      <text>商品加载失败</text>
      <view class="product-detail__retry" @tap="loadProduct">重新加载</view>
    </view>

    <!-- Product content -->
    <view v-else-if="product" class="product-detail__content">
      <!-- Image carousel -->
      <view class="product-gallery">
        <swiper class="product-gallery__swiper" :current="currentImageIndex" @change="onImageChange">
          <swiper-item v-for="(image, index) in product.images" :key="index" class="product-gallery__item">
            <image :src="image" class="product-gallery__image" mode="aspectFit" />
          </swiper-item>
        </swiper>
        <view class="product-gallery__indicator">
          <text class="product-gallery__counter">{{ currentImageIndex + 1 }}/{{ product.images.length }}</text>
        </view>
      </view>

      <!-- Product info section -->
      <view class="product-info">
        <!-- Price and stock -->
        <view class="product-info__header">
          <view class="product-info__price">
            <text class="product-info__price-symbol">¥</text>
            <text class="product-info__price-value">{{ priceYuan }}</text>
          </view>
          <view :class="['product-info__stock', `product-info__stock--${product.stockStatus}`]">
            {{ stockStatusText(product.stockStatus) }}
          </view>
        </view>

        <!-- Product title -->
        <text class="product-info__name">{{ product.name }}</text>

        <!-- Product title (if different from name) -->
        <view v-if="product.title && product.title !== product.name" class="product-info__subtitle">
          <text>{{ product.title }}</text>
        </view>

        <!-- Product description -->
        <view v-if="product.description" class="product-info__description">
          <text class="product-info__description-label">商品描述</text>
          <text class="product-info__description-text">{{ product.description }}</text>
        </view>

        <!-- Product summary (if available) -->
        <view v-if="product.summary" class="product-info__summary">
          <text class="product-info__summary-text">{{ product.summary }}</text>
        </view>
      </view>

      <!-- Quantity selector -->
      <view class="product-quantity">
        <text class="product-quantity__label">购买数量</text>
        <view class="product-quantity__control">
          <view class="product-quantity__btn" :class="{ disabled: quantity <= 1 }" @tap="decreaseQuantity">
            <text>−</text>
          </view>
          <view class="product-quantity__input">
            <input type="number" v-model.number="quantity" class="product-quantity__field" min="1" />
          </view>
          <view class="product-quantity__btn" @tap="increaseQuantity">
            <text>+</text>
          </view>
        </view>
      </view>

      <!-- Action buttons -->
      <view class="product-actions">
        <view
          v-if="product.stockStatus !== 'sold_out'"
          class="product-actions__button product-actions__button--primary"
          :class="{ loading: addingToCart }"
          @tap="handleAddToCart"
        >
          <text v-if="!addingToCart" class="product-actions__text">加入购物车</text>
          <text v-else class="product-actions__text">添加中...</text>
        </view>
        <view v-else class="product-actions__button product-actions__button--disabled">
          <text class="product-actions__text">商品已售罄</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, useRouter } from '@dcloudio/uni-app'
import { shopApi, type ShopProduct } from '@/api/modules/shop'
import { cartApi } from '@/api/modules/cart'
import { useCartStore } from '@/stores/modules/cart'

const router = useRouter()
const cartStore = useCartStore()

const product = ref<ShopProduct | null>(null)
const loading = ref(false)
const loadError = ref(false)
const addingToCart = ref(false)
const currentImageIndex = ref(0)
const quantity = ref(1)
const productId = ref<number>(0)

const priceYuan = computed(() => {
  if (!product.value) return '0.00'
  return (product.value.priceFen / 100).toFixed(2)
})

function stockStatusText(status: string): string {
  switch (status) {
    case 'available':
      return '有货'
    case 'limited':
      return '库存紧张'
    case 'sold_out':
      return '已售罄'
    default:
      return status
  }
}

function onImageChange(event: any) {
  currentImageIndex.value = event.detail.current
}

function increaseQuantity() {
  quantity.value++
}

function decreaseQuantity() {
  if (quantity.value > 1) {
    quantity.value--
  }
}

async function loadProduct() {
  if (!productId.value) return

  loading.value = true
  loadError.value = false

  try {
    const data = await shopApi.productDetail(productId.value)
    product.value = data
    currentImageIndex.value = 0
    quantity.value = 1
  } catch (error) {
    console.error('Failed to load product:', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function handleAddToCart() {
  if (!product.value || addingToCart.value) return

  addingToCart.value = true

  try {
    const updatedCart = await cartApi.addItem(product.value.id, quantity.value)
    cartStore.setCart(updatedCart)

    uni.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 1500,
    })

    setTimeout(() => {
      quantity.value = 1
    }, 500)
  } catch (error) {
    console.error('Failed to add to cart:', error)
    uni.showToast({
      title: '添加失败，请重试',
      icon: 'error',
      duration: 1500,
    })
  } finally {
    addingToCart.value = false
  }
}

function goBack() {
  uni.navigateBack({
    delta: 1,
  })
}

onLoad((option: any) => {
  if (option && option.id) {
    productId.value = parseInt(option.id, 10)
    loadProduct()
  }
})
</script>

<style lang="scss" scoped>
.product-detail {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: #fff;
    border-bottom: 1px solid #eee;
  }

  &__back {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    font-size: 24px;
  }

  &__back-icon {
    font-weight: bold;
    font-size: 28px;
  }

  &__title {
    flex: 1;
    text-align: center;
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }

  &__header-spacer {
    width: 36px;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  &__state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    background-color: #fff;
    color: #666;
    font-size: 14px;
    gap: 12px;

    &--error {
      color: #f56c6c;
    }
  }

  &__retry {
    margin-top: 8px;
    padding: 8px 16px;
    background-color: #f56c6c;
    color: #fff;
    border-radius: 4px;
    font-size: 14px;
  }
}

.product-gallery {
  position: relative;
  width: 100%;
  background-color: #fff;
  border-radius: 0;

  &__swiper {
    width: 100%;
    height: 400px;
  }

  &__item {
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
  }

  &__image {
    width: 100%;
    height: 100%;
  }

  &__indicator {
    position: absolute;
    right: 12px;
    bottom: 12px;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 4px 8px;
    border-radius: 4px;
  }

  &__counter {
    color: #fff;
    font-size: 12px;
  }
}

.product-info {
  background-color: #fff;
  padding: 16px;
  border-bottom: 1px solid #eee;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__price {
    display: flex;
    align-items: baseline;
    gap: 0;
  }

  &__price-symbol {
    font-size: 14px;
    color: #f56c6c;
    font-weight: 500;
  }

  &__price-value {
    font-size: 28px;
    color: #f56c6c;
    font-weight: bold;
  }

  &__stock {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;

    &--available {
      background-color: #f0f9ff;
      color: #0ea5e9;
    }

    &--limited {
      background-color: #fef3c7;
      color: #d97706;
    }

    &--sold_out {
      background-color: #fee2e2;
      color: #f56c6c;
    }
  }

  &__name {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  &__subtitle {
    display: block;
    font-size: 13px;
    color: #999;
    margin-bottom: 12px;

    text {
      display: block;
      line-height: 1.4;
    }
  }

  &__description {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #eee;
  }

  &__description-label {
    display: block;
    font-size: 12px;
    color: #999;
    margin-bottom: 8px;
    font-weight: 500;
  }

  &__description-text {
    display: block;
    font-size: 13px;
    color: #666;
    line-height: 1.6;
  }

  &__summary {
    margin-top: 12px;
  }

  &__summary-text {
    display: block;
    font-size: 12px;
    color: #666;
    line-height: 1.5;
    background-color: #f9f9f9;
    padding: 8px;
    border-radius: 4px;
  }
}

.product-quantity {
  background-color: #fff;
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__label {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  &__control {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }

  &__btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
    font-size: 16px;
    color: #333;
    font-weight: bold;

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__input {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
  }

  &__field {
    width: 40px;
    height: 32px;
    text-align: center;
    border: none;
    font-size: 14px;
    color: #333;
  }
}

.product-actions {
  background-color: #fff;
  padding: 12px 16px;
  display: flex;
  gap: 12px;

  &__button {
    flex: 1;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: none;
    font-size: 15px;
    font-weight: 500;
    transition: opacity 0.2s;

    &--primary {
      background-color: #f56c6c;
      color: #fff;

      &:active:not(.loading) {
        opacity: 0.9;
      }
    }

    &--disabled {
      background-color: #ddd;
      color: #999;
      cursor: not-allowed;
    }

    &.loading {
      opacity: 0.7;
    }
  }

  &__text {
    font-size: 15px;
    color: inherit;
  }
}
</style>
