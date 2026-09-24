<template>
  <view class="refund-list">
    <view class="refund-list__container">
      <!-- Header -->
      <view class="refund-list__header">
        <text class="refund-list__title">我的退款</text>
      </view>

      <!-- Filter Tabs -->
      <view class="refund-list__tabs">
        <view
          v-for="tab in filterTabs"
          :key="tab.value"
          class="refund-list__tab"
          :class="{ active: selectedFilter === tab.value }"
          @tap="selectedFilter = tab.value"
        >
          {{ tab.label }}
        </view>
      </view>

      <!-- Refund List -->
      <view v-if="filteredRefunds.length > 0" class="refund-list__content">
        <view v-for="refund in filteredRefunds" :key="refund.id" class="refund-list__item" @tap="goToDetail(refund.id)">
          <view class="refund-list__item-header">
            <text class="refund-list__item-status">{{ shopApi.getRefundStatusLabel(refund.status) }}</text>
            <text class="refund-list__item-amount">¥{{ formatAmount(refund.requestedAmountFen) }}</text>
          </view>
          <text class="refund-list__item-reason">{{ refund.reason || '无' }}</text>
          <text class="refund-list__item-date">{{ formatDate(refund.createdAt) }}</text>
          <refund-status :status="refund.status" :rejection-reason="refund.rejectionReason" />
        </view>
      </view>

      <!-- Empty State -->
      <view v-else class="refund-list__empty">
        <text class="refund-list__empty-icon">📋</text>
        <text class="refund-list__empty-title">暂无退款</text>
        <text class="refund-list__empty-desc">您还没有提交任何退款申请</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { shopApi } from '@/api/modules/shop'
import type { RefundResponse } from '@/api/modules/shop'
import { useAuthStore } from '@/stores/modules/auth'
import RefundStatus from '@/components/business/RefundStatus.vue'

const authStore = useAuthStore()
const selectedFilter = ref<string>('all')
const refunds = ref<RefundResponse[]>([])
const loading = ref(false)

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已完成', value: 'success' },
]

const filteredRefunds = computed(() => {
  if (selectedFilter.value === 'all') {
    return refunds.value
  }
  return refunds.value.filter(r => r.status === selectedFilter.value)
})

function formatAmount(amountFen: number): string {
  return (amountFen / 100).toFixed(2)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadRefunds() {
  if (!authStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }

  loading.value = true
  try {
    const result = await shopApi.getUserRefunds({
      page: 1,
      pageSize: 50,
    })
    refunds.value = result.refunds
  } catch (error) {
    console.error('Failed to load refunds:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function goToDetail(refundId: string | number) {
  uni.navigateTo({
    url: `/pages/shop/refund-detail?id=${refundId}`,
  })
}

onMounted(() => {
  loadRefunds()
})
</script>

<style lang="scss" scoped>
.refund-list {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 20rpx;

  &__container {
    padding: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32rpx 0;
    border-bottom: 1rpx solid var(--color-border);
    background: var(--color-bg-white);
  }

  &__title {
    color: var(--color-text);
    font-size: 36rpx;
    font-weight: 700;
  }

  &__tabs {
    display: flex;
    gap: 0;
    background: var(--color-bg-white);
    padding: 0 20rpx;
    overflow-x: auto;
    border-bottom: 1rpx solid var(--color-border);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__tab {
    flex-shrink: 0;
    padding: 16rpx 20rpx;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    font-weight: 600;
    border-bottom: 3rpx solid transparent;
    transition: all 200ms ease;

    &.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
  }

  &__content {
    padding: 20rpx;
  }

  &__item {
    background: var(--color-bg-white);
    border-radius: 12rpx;
    padding: 20rpx;
    margin-bottom: 12rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    transition: all 200ms ease;

    &:active {
      transform: translateY(2rpx);
      box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
    }
  }

  &__item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10rpx;
  }

  &__item-status {
    color: var(--color-primary);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__item-amount {
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 700;
  }

  &__item-reason {
    display: block;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    margin-bottom: 8rpx;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-date {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    margin-bottom: 12rpx;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400rpx;
    padding: 40rpx;
  }

  &__empty-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
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
  }
}
</style>
