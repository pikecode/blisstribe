<template>
  <view class="refund-detail">
    <view class="refund-detail__container">
      <!-- Header -->
      <view class="refund-detail__header">
        <text class="refund-detail__title">退款详情</text>
      </view>

      <!-- Refund Info -->
      <view v-if="refund" class="refund-detail__content">
        <!-- Status Card -->
        <view class="refund-detail__section">
          <refund-status :status="refund.status" :rejection-reason="refund.rejectionReason" />
        </view>

        <!-- Amount & Order Info -->
        <view class="refund-detail__section">
          <text class="refund-detail__section-title">退款金额</text>
          <view class="refund-detail__amount-box">
            <text class="refund-detail__amount">¥{{ formatAmount(refund.amountInFen) }}</text>
          </view>

          <text class="refund-detail__section-title" style="margin-top: 24rpx">订单信息</text>
          <view class="refund-detail__info-item">
            <text class="refund-detail__label">申请时间</text>
            <text class="refund-detail__value">{{ formatDateTime(refund.createdAt) }}</text>
          </view>
          <view class="refund-detail__info-item">
            <text class="refund-detail__label">申请原因</text>
            <text class="refund-detail__value">{{ refund.reason || '无' }}</text>
          </view>
          <view v-if="refund.wechatRefundNo" class="refund-detail__info-item">
            <text class="refund-detail__label">退款单号</text>
            <text class="refund-detail__value">{{ refund.wechatRefundNo }}</text>
          </view>
          <view v-if="refund.refundedAt" class="refund-detail__info-item">
            <text class="refund-detail__label">到账时间</text>
            <text class="refund-detail__value">{{ formatDateTime(refund.refundedAt) }}</text>
          </view>
        </view>

        <!-- Timeline -->
        <view class="refund-detail__section">
          <text class="refund-detail__section-title">处理进度</text>
          <view class="refund-detail__timeline">
            <view class="refund-detail__timeline-item" :class="{ completed: refund.status !== 'pending' }">
              <view class="refund-detail__timeline-dot"></view>
              <text class="refund-detail__timeline-label">已提交申请</text>
              <text class="refund-detail__timeline-time">{{ formatDateTime(refund.createdAt) }}</text>
            </view>
            <view
              class="refund-detail__timeline-item"
              :class="{ completed: isStatusAfter(['approved', 'success', 'completed']) }"
            >
              <view class="refund-detail__timeline-dot"></view>
              <text class="refund-detail__timeline-label">审核中</text>
              <text v-if="refund.status === 'approved'" class="refund-detail__timeline-time">处理中...</text>
            </view>
            <view class="refund-detail__timeline-item" :class="{ completed: refund.status === 'success' || refund.status === 'completed' }">
              <view class="refund-detail__timeline-dot"></view>
              <text class="refund-detail__timeline-label">退款完成</text>
              <text v-if="refund.refundedAt" class="refund-detail__timeline-time">{{ formatDateTime(refund.refundedAt) }}</text>
            </view>
          </view>
        </view>

        <!-- Tips -->
        <view class="refund-detail__tips">
          <text class="refund-detail__tips-title">提示</text>
          <text v-if="refund.status === 'pending'" class="refund-detail__tips-item">
            • 您的退款申请正在审核中，通常在24小时内完成。请耐心等待
          </text>
          <text v-else-if="refund.status === 'approved'" class="refund-detail__tips-item">
            • 申请已批准，退款将在3-5个工作日内到达您的账户
          </text>
          <text v-else-if="refund.status === 'rejected'" class="refund-detail__tips-item">
            • 您的退款申请已被拒绝。如有疑问，请联系客服
          </text>
          <text v-else-if="refund.status === 'success' || refund.status === 'completed'" class="refund-detail__tips-item">
            • 退款已到账，请检查您的账户。如未收到，请联系客服
          </text>
        </view>

        <!-- Actions -->
        <view class="refund-detail__actions">
          <view class="refund-detail__action-btn" @tap="goBack">返回</view>
          <view class="refund-detail__action-btn refund-detail__action-btn--primary" @tap="contactService">联系客服</view>
        </view>
      </view>

      <!-- Loading -->
      <view v-else class="refund-detail__loading">
        <text>加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { shopApi } from '@/api/modules/shop'
import { useAuthStore } from '@/stores/modules/auth'
import RefundStatus from '@/components/business/RefundStatus.vue'

const authStore = useAuthStore()
const refundId = ref<string | number>('')
const refund = ref<any>(null)

function formatAmount(amountFen: number): string {
  return (amountFen / 100).toFixed(2)
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function isStatusAfter(statuses: string[]): boolean {
  if (!refund.value) return false
  return statuses.includes(refund.value.status)
}

async function loadRefund() {
  if (!refundId.value) return
  try {
    const data = await shopApi.getRefundDetail(refundId.value)
    refund.value = data
  } catch (error) {
    console.error('Failed to load refund:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  }
}

function goBack() {
  uni.navigateBack()
}

function contactService() {
  // In a real app, this would open a customer service contact
  uni.showToast({
    title: '客服功能开发中',
    icon: 'none',
  })
}

onLoad((options) => {
  if (!authStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }

  refundId.value = options?.id || ''
  if (refundId.value) {
    loadRefund()
  }
})
</script>

<style lang="scss" scoped>
.refund-detail {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 100rpx;

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

  &__content {
    padding: 20rpx;
  }

  &__section {
    background: var(--color-bg-white);
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }

  &__section-title {
    display: block;
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 16rpx;
  }

  &__amount-box {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100rpx;
    border-radius: 12rpx;
    background: var(--color-primary-light);
    border: 2rpx solid var(--color-primary);
  }

  &__amount {
    color: var(--color-primary);
    font-size: 48rpx;
    font-weight: 900;
  }

  &__info-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 14rpx 0;
    border-bottom: 1rpx solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    color: var(--color-text-secondary);
    font-size: 24rpx;
  }

  &__value {
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
    text-align: right;
    max-width: 50%;
    word-break: break-word;
  }

  &__timeline {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__timeline-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    padding-left: 40rpx;

    &::before {
      content: '';
      position: absolute;
      left: 8rpx;
      top: 40rpx;
      width: 2rpx;
      height: calc(100% + 10rpx);
      background: var(--color-border);
    }

    &:last-child {
      &::before {
        display: none;
      }
    }

    &.completed {
      .refund-detail__timeline-dot {
        background: var(--color-primary);
        border-color: var(--color-primary);
      }

      .refund-detail__timeline-label {
        color: var(--color-primary);
        font-weight: 700;
      }
    }
  }

  &__timeline-dot {
    position: absolute;
    left: 0;
    top: 0;
    width: 18rpx;
    height: 18rpx;
    border-radius: 50%;
    background: var(--color-bg-subtle);
    border: 3rpx solid var(--color-border);
    box-sizing: border-box;
    transition: all 200ms ease;
  }

  &__timeline-label {
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__timeline-time {
    display: block;
    color: var(--color-text-secondary);
    font-size: 22rpx;
    margin-top: 4rpx;
  }

  &__tips {
    background: var(--color-bg-subtle);
    border-radius: 12rpx;
    padding: 16rpx;
    margin-bottom: 16rpx;
    border-left: 3rpx solid var(--color-primary);
  }

  &__tips-title {
    display: block;
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
    margin-bottom: 10rpx;
  }

  &__tips-item {
    display: block;
    color: var(--color-text-secondary);
    font-size: 22rpx;
    line-height: 1.6;
  }

  &__actions {
    display: flex;
    gap: 12rpx;
    margin-top: 20rpx;
  }

  &__action-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    background: var(--color-bg-gray);
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms ease;

    &:active {
      transform: scale(0.96);
    }

    &--primary {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.2);

      &:active {
        box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.15);
      }
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400rpx;
    color: var(--color-text-secondary);
    font-size: 28rpx;
  }
}
</style>
