<template>
  <view class="product-detail">
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
        <swiper v-if="product.images.length" class="product-gallery__swiper" :current="currentImageIndex" @change="onImageChange">
          <swiper-item v-for="(image, index) in product.images" :key="index" class="product-gallery__item">
            <image :src="image" class="product-gallery__image" mode="aspectFill" />
          </swiper-item>
        </swiper>
        <view v-else class="product-gallery__empty">暂无商品图片</view>
        <view v-if="product.images.length > 1" class="product-gallery__indicator">
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
          <view :class="['product-info__stock', `product-info__stock--${selectedStockStatus}`]">
            {{ stockStatusText(selectedStockStatus) }}<text v-if="selectedSkuAvailable > 0"> · {{ selectedSkuAvailable }} 件</text>
          </view>
        </view>

        <!-- Product title -->
        <text class="product-info__name">{{ product.name }}</text>

      </view>

      <!-- SKU and quantity -->
      <view class="product-skus">
        <view class="product-skus__section">
          <text class="product-skus__title">选择规格</text>
          <view class="product-skus__options">
            <view
              v-for="sku in product.skus"
              :key="sku.id"
              class="product-skus__option"
              :class="{
                'product-skus__option--selected': sku.id === selectedSkuId,
                'product-skus__option--disabled': sku.available <= 0,
              }"
              @tap="selectSku(sku.id)"
            >
              <text>{{ skuLabel(sku) }}</text>
              <text v-if="sku.available <= 0">缺货</text>
            </view>
          </view>
        </view>
        <view class="product-quantity">
          <text class="product-quantity__label">购买数量</text>
          <view class="product-quantity__control">
            <view class="product-quantity__btn" :class="{ disabled: quantity <= 1 }" @tap="decreaseQuantity">−</view>
            <text class="product-quantity__value">{{ quantity }}</text>
            <view class="product-quantity__btn" :class="{ disabled: quantity >= selectedSkuAvailable }" @tap="increaseQuantity">+</view>
          </view>
        </view>
      </view>

      <!-- Product description -->
      <view v-if="product.description" class="product-description">
        <text class="product-description__title">商品详情</text>
        <text class="product-description__text">{{ product.description }}</text>
      </view>

      <!-- Action buttons -->
      <view class="product-actions">
        <view
          v-if="selectedSkuAvailable > 0"
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
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { shopApi, type ShopProduct, type ShopProductSku } from '@/api/modules/shop'
import { cartApi } from '@/api/modules/cart'
import { useCartStore } from '@/stores/modules/cart'

const cartStore = useCartStore()

const product = ref<ShopProduct | null>(null)
const loading = ref(false)
const loadError = ref(false)
const addingToCart = ref(false)
const currentImageIndex = ref(0)
const quantity = ref(1)
const productId = ref('')
const selectedSkuId = ref('')

const selectedSku = computed(() =>
  product.value?.skus.find((sku) => sku.id === selectedSkuId.value) || product.value?.skus[0]
)
const selectedSkuAvailable = computed(() => selectedSku.value?.available || 0)
const selectedStockStatus = computed(() => {
  const available = selectedSkuAvailable.value
  return available <= 0 ? 'sold_out' : available <= 5 ? 'limited' : 'available'
})

const priceYuan = computed(() => {
  if (!selectedSku.value) return '0.00'
  return (selectedSku.value.priceFen / 100).toFixed(2)
})

function skuLabel(sku: ShopProductSku): string {
  const values = Object.entries(sku.specifications)
    .map(([key, value]) => `${key} ${value}`)
  return values.length ? values.join(' / ') : '默认规格'
}

function selectSku(id: string) {
  const sku = product.value?.skus.find((item) => item.id === id)
  if (!sku || sku.available <= 0) return
  selectedSkuId.value = id
  quantity.value = 1
}

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
  if (quantity.value < selectedSkuAvailable.value) quantity.value++
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
    selectedSkuId.value = data.skus[0]?.id || ''
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
  if (!product.value || !selectedSku.value || addingToCart.value) return

  addingToCart.value = true

  try {
    const updatedCart = await cartApi.addItem(selectedSku.value.id, quantity.value)
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

onLoad((option: any) => {
  if (option && option.id) {
    productId.value = String(option.id)
  }
})

onShow(() => {
  if (productId.value) {
    loadProduct()
  }
})
</script>

<style lang="scss" scoped>
.product-detail {
  min-height: 100vh;
  background-color: var(--color-bg);

  &__content {
    padding-bottom: calc(130rpx + env(safe-area-inset-bottom));
  }

  &__state {
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    background-color: #fff;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    gap: 20rpx;

    &--error {
      color: var(--color-danger);
    }
  }

  &__retry {
    margin-top: 12rpx;
    padding: 14rpx 28rpx;
    background-color: var(--color-primary);
    color: #fff;
    border-radius: var(--radius-round);
    font-size: 24rpx;
  }
}

.product-gallery {
  position: relative;
  width: 100%;
  background-color: #fff;
  border-radius: 0;

  &__swiper {
    width: 100%;
    height: 620rpx;
  }

  &__item {
    width: 100%;
    height: 620rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg-gray);
  }

  &__image {
    width: 100%;
    height: 100%;
  }

  &__empty {
    height: 620rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-gray);
    color: var(--color-text-tertiary);
    font-size: 24rpx;
  }

  &__indicator {
    position: absolute;
    right: 24rpx;
    bottom: 24rpx;
    background-color: rgba(31, 41, 55, 0.66);
    padding: 8rpx 18rpx;
    border-radius: var(--radius-round);
  }

  &__counter {
    color: #fff;
    font-size: 21rpx;
  }
}

.product-info {
  background-color: #fff;
  margin: 18rpx 20rpx 0;
  padding: 28rpx;
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18rpx;
  }

  &__price {
    display: flex;
    align-items: baseline;
    gap: 0;
  }

  &__price-symbol {
    font-size: 26rpx;
    color: #d04a36;
    font-weight: 500;
  }

  &__price-value {
    font-size: 48rpx;
    color: #d04a36;
    font-weight: 800;
  }

  &__stock {
    padding: 8rpx 16rpx;
    border-radius: var(--radius-round);
    font-size: 22rpx;
    font-weight: 500;

    &--available {
      background-color: var(--color-primary-light);
      color: #078447;
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
    font-size: 34rpx;
    font-weight: 800;
    color: var(--color-text);
    line-height: 46rpx;
  }
}

.product-skus {
  margin: 18rpx 20rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm);

  &__section {
    padding-bottom: 24rpx;
    border-bottom: 1rpx solid var(--color-border);
  }

  &__title {
    display: block;
    margin-bottom: 20rpx;
    color: var(--color-text);
    font-size: 27rpx;
    font-weight: 700;
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 14rpx;
  }

  &__option {
    display: flex;
    min-height: 64rpx;
    align-items: center;
    gap: 10rpx;
    padding: 0 22rpx;
    border: 1rpx solid var(--color-border-strong);
    border-radius: 14rpx;
    color: var(--color-text-secondary);
    font-size: 23rpx;

    &--selected {
      border-color: var(--color-primary);
      color: #078447;
      background: var(--color-primary-light);
    }

    &--disabled {
      opacity: 0.45;
    }
  }
}

.product-quantity {
  padding-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__label {
    font-size: 26rpx;
    color: var(--color-text);
    font-weight: 700;
  }

  &__control {
    display: flex;
    align-items: center;
    border: 1rpx solid var(--color-border);
    border-radius: 12rpx;
    overflow: hidden;
  }

  &__btn {
    width: 58rpx;
    height: 52rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-bg-gray);
    font-size: 28rpx;
    color: var(--color-text);
    font-weight: bold;

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__value {
    width: 64rpx;
    text-align: center;
    font-size: 24rpx;
    color: var(--color-text);
  }
}

.product-description {
  margin: 18rpx 20rpx 0;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: var(--shadow-sm);

  &__title {
    display: block;
    margin-bottom: 16rpx;
    color: var(--color-text);
    font-size: 27rpx;
    font-weight: 700;
  }

  &__text {
    display: block;
    color: var(--color-text-secondary);
    font-size: 25rpx;
    line-height: 42rpx;
    white-space: pre-wrap;
  }
}

.product-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  background-color: #fff;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  display: flex;
  gap: 18rpx;
  border-top: 1rpx solid var(--color-border);

  &__button {
    flex: 1;
    height: 84rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-round);
    border: none;
    font-size: 28rpx;
    font-weight: 700;
    transition: opacity 0.2s;

    &--primary {
      background-color: var(--color-primary);
      box-shadow: var(--shadow-action);
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
    font-size: 28rpx;
    color: inherit;
  }
}
</style>
