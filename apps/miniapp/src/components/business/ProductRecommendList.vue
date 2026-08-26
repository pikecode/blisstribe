<template>
  <view>
    <view v-if="loading" :class="['product-recommend-list__state', { 'product-recommend-list__state--plain': !surface }]">
      <text>{{ loadingText }}</text>
    </view>
    <view v-else-if="error" :class="['product-recommend-list__state', { 'product-recommend-list__state--plain': !surface }]">
      <text>{{ errorText }}</text>
      <view class="product-recommend-list__retry" @tap="$emit('retry')">{{ retryText }}</view>
    </view>
    <view v-else-if="products.length" :class="['product-recommend-list', { 'product-recommend-list--plain': !surface }]">
      <view
        v-for="item in products"
        :key="item.id"
        class="product-recommend-list__item"
        @tap="$emit('productTap', item.id)"
      >
        <image
          v-if="item.coverUrl"
          :src="item.coverUrl"
          class="product-recommend-list__cover"
          mode="aspectFill"
        />
        <view v-else class="product-recommend-list__cover product-recommend-list__cover--empty">
          <text>{{ item.module?.name || '产品' }}</text>
        </view>
        <view class="product-recommend-list__main">
          <view class="product-recommend-list__head">
            <text class="product-recommend-list__module">{{ item.module?.name || '产品' }}</text>
            <text v-if="item.priceText" class="product-recommend-list__price">{{ item.priceText }}</text>
          </view>
          <text class="product-recommend-list__title">{{ item.title }}</text>
          <text class="product-recommend-list__desc">{{ item.summary || item.subtitle }}</text>
          <view v-if="item.matchedTags?.length" class="product-recommend-list__tags">
            <text
              v-for="tag in item.matchedTags.slice(0, 2)"
              :key="tag"
              class="product-recommend-list__tag"
            >
              {{ tag }}
            </text>
          </view>
          <text v-if="item.recommendReason" class="product-recommend-list__reason">
            {{ item.recommendReason }}
          </text>
        </view>
      </view>
    </view>
    <view v-else :class="['product-recommend-list__state', { 'product-recommend-list__state--plain': !surface }]">
      <text>{{ emptyText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Product } from '@/api/modules/product'

withDefaults(defineProps<{
  products: Product[]
  loading?: boolean
  error?: boolean
  loadingText?: string
  errorText?: string
  emptyText?: string
  retryText?: string
  surface?: boolean
}>(), {
  loading: false,
  error: false,
  loadingText: '正在匹配推荐',
  errorText: '推荐加载失败',
  emptyText: '暂无推荐产品',
  retryText: '重试',
  surface: true,
})

defineEmits<{
  productTap: [id: number]
  retry: []
}>()
</script>

<style lang="scss" scoped>
.product-recommend-list {
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);

  &--plain {
    background: transparent;
    border-radius: 0;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    padding: 26rpx;
    border-bottom: 1rpx solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__cover {
    width: 128rpx;
    height: 104rpx;
    border-radius: 14rpx;
    background: var(--color-bg-gray);
    flex-shrink: 0;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      font-size: 22rpx;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14rpx;
    margin-bottom: 8rpx;
  }

  &__module {
    color: var(--color-primary);
    font-size: 22rpx;
    font-weight: 600;
  }

  &__price {
    flex-shrink: 0;
    color: var(--color-warning);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 30rpx;
    font-weight: 700;
    line-height: 1.35;
  }

  &__desc {
    display: -webkit-box;
    margin-top: 8rpx;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-top: 12rpx;
  }

  &__tag {
    padding: 5rpx 12rpx;
    border-radius: 18rpx;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 20rpx;
  }

  &__reason {
    display: block;
    margin-top: 10rpx;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
  }

  &__state {
    min-height: 128rpx;
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    color: var(--color-text-tertiary);
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16rpx;

    &--plain {
      background: transparent;
      border-radius: 0;
    }
  }

  &__retry {
    padding: 8rpx 20rpx;
    border-radius: var(--radius-round);
    background: var(--color-primary);
    color: #fff;
    font-size: 22rpx;
  }
}
</style>
