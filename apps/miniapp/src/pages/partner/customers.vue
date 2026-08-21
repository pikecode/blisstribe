<template>
  <view class="partner-customers">
    <view class="partner-customers__summary">
      <text class="partner-customers__total">{{ total }}</text>
      <text class="partner-customers__label">当前客户</text>
    </view>

    <view v-if="customers.length === 0 && !loading" class="partner-customers__empty">暂无客户</view>

    <view v-for="item in customers" :key="item.relationId" class="partner-customers__item">
      <image :src="item.avatar || '/static/logo.png'" class="partner-customers__avatar" mode="aspectFill" />
      <view class="partner-customers__body">
        <text class="partner-customers__name">{{ item.nickname }}</text>
        <text class="partner-customers__meta">{{ item.phoneMasked || '未展示手机号' }}</text>
        <text class="partner-customers__meta">绑定于 {{ item.boundAt.slice(0, 10) }}</text>
      </view>
    </view>

    <view v-if="loading" class="partner-customers__loading">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { partnerApi } from '@/api/modules/partner'
import type { PartnerCustomer } from '@blisstribe/shared'

const loading = ref(false)
const total = ref(0)
const customers = ref<PartnerCustomer[]>([])

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await partnerApi.getCustomers({ page: 1, pageSize: 50 })
    customers.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

onShow(load)
</script>

<style lang="scss" scoped>
.partner-customers {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 32rpx;

  &__summary {
    background: #fff;
    border-radius: 16rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
  }
  &__total { display: block; font-size: 52rpx; font-weight: 800; color: var(--color-text); }
  &__label { display: block; margin-top: 8rpx; color: var(--color-text-tertiary); font-size: 26rpx; }
  &__item {
    display: flex;
    gap: 20rpx;
    padding: 28rpx;
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 16rpx;
  }
  &__avatar {
    width: 84rpx;
    height: 84rpx;
    border-radius: 50%;
    background: #f0f0f0;
    flex-shrink: 0;
  }
  &__body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
  &__name { font-size: 30rpx; color: var(--color-text); font-weight: 600; }
  &__meta { font-size: 24rpx; color: var(--color-text-tertiary); }
  &__empty, &__loading {
    padding: 120rpx 0;
    text-align: center;
    color: var(--color-text-tertiary);
  }
}
</style>
