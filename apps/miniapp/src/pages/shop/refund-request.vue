<template>
  <view class="refund-request">
    <view class="refund-request__container">
      <!-- Header -->
      <view class="refund-request__header">
        <text class="refund-request__title">申请退款</text>
      </view>

      <!-- Order Info Section -->
      <view v-if="order && canRequestRefund" class="refund-request__section">
        <text class="refund-request__section-title">订单信息</text>
        <view class="refund-request__info-item">
          <text class="refund-request__label">订单号</text>
          <text class="refund-request__value">{{ order.orderNo }}</text>
        </view>
        <view class="refund-request__info-item">
          <text class="refund-request__label">应付金额</text>
          <text class="refund-request__value">¥{{ formatAmount(order.paymentAmountFen) }}</text>
        </view>
      </view>
      <view v-else-if="order" class="refund-request__tips">
        <text class="refund-request__tips-item">仅支持已支付且尚未发货的订单申请整单退款。</text>
      </view>

      <!-- Form Section -->
      <view class="refund-request__section">
        <text class="refund-request__section-title">退款详情</text>

        <!-- Refund Reason -->
        <view class="refund-request__form-group">
          <text class="refund-request__form-label">退款原因 <text class="refund-request__required">*</text></text>
          <view class="refund-request__reason-select" @tap="showReasonPicker = true">
            <text :class="{ 'refund-request__placeholder': !selectedReason }">
              {{ selectedReason || '请选择退款原因' }}
            </text>
            <text class="refund-request__arrow">›</text>
          </view>
          <text v-if="errors.reason" class="refund-request__error">{{ errors.reason }}</text>
        </view>

        <!-- Refund Amount -->
        <view class="refund-request__form-group">
          <text class="refund-request__form-label">退款金额</text>
          <view class="refund-request__amount-display">
            <text class="refund-request__amount-value">¥{{ formatAmount(refundAmount) }}</text>
          </view>
          <text class="refund-request__form-hint">此金额为订单应付金额</text>
        </view>

        <!-- Refund Description -->
        <view class="refund-request__form-group">
          <text class="refund-request__form-label">问题描述</text>
          <textarea
            class="refund-request__textarea"
            :value="description"
            placeholder="请详细描述问题，便于审核（最多200字）"
            maxlength="200"
            @input="onDescriptionInput"
          />
          <text class="refund-request__char-count">{{ description.length }}/200</text>
        </view>
      </view>

      <!-- Tips Section -->
      <view class="refund-request__tips">
        <text class="refund-request__tips-title">提示</text>
        <text class="refund-request__tips-item">• 提交后需要等待审核，通常在24小时内处理</text>
        <text class="refund-request__tips-item">• 如有疑问，可联系客服进行咨询</text>
      </view>

      <!-- Submit Button -->
      <view class="refund-request__footer">
        <view class="refund-request__submit" :class="{ loading: submitting, disabled: !canSubmit }" @tap="submitRefund">
          {{ submitting ? '提交中...' : '提交申请' }}
        </view>
      </view>
    </view>

    <!-- Reason Picker -->
    <picker-view v-if="showReasonPicker" class="refund-request__picker-overlay" @tap="handlePickerOverlayTap">
      <view class="refund-request__picker-content" @tap.stop>
        <view class="refund-request__picker-header">
          <text class="refund-request__picker-title">选择退款原因</text>
          <text class="refund-request__picker-close" @tap="showReasonPicker = false">✕</text>
        </view>
        <scroll-view class="refund-request__picker-list" scroll-y>
          <view
            v-for="(reason, index) in refundReasons"
            :key="index"
            class="refund-request__picker-item"
            :class="{ active: selectedReason === reason }"
            @tap="selectReason(reason)"
          >
            {{ reason }}
          </view>
        </scroll-view>
      </view>
    </picker-view>

    <!-- Success Modal -->
    <view v-if="successVisible" class="refund-request__success-mask">
      <view class="refund-request__success">
        <text class="refund-request__success-icon">✓</text>
        <text class="refund-request__success-title">申请已提交</text>
        <text class="refund-request__success-desc">我们已收到您的退款申请，将在24小时内完成审核</text>
        <view class="refund-request__success-actions">
          <view class="refund-request__success-btn" @tap="goBack">返回订单详情</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { shopApi, type ShopOrder } from '@/api/modules/shop'
import { useAuthStore } from '@/stores/modules/auth'

type UniValueEvent = { detail?: { value?: string | number } }

const authStore = useAuthStore()
const orderId = ref('')
const order = ref<ShopOrder | null>(null)
const selectedReason = ref('')
const description = ref('')
const submitting = ref(false)
const successVisible = ref(false)
const showReasonPicker = ref(false)
const errors = ref<Record<string, string>>({})

const refundReasons = shopApi.getRefundReasons()

const refundAmount = computed(() => {
  return order.value?.paymentAmountFen || 0
})
const canRequestRefund = computed(() =>
  order.value?.paymentStatus === 'paid' && order.value.fulfillmentStatus === 'pending'
)

const canSubmit = computed(() => {
  return canRequestRefund.value && selectedReason.value && description.value.trim() && !submitting.value
})

function formatAmount(amountFen: number): string {
  return (amountFen / 100).toFixed(2)
}

function onDescriptionInput(e: unknown) {
  const value = (e as UniValueEvent).detail?.value
  description.value = value ? String(value) : ''
}

function selectReason(reason: string) {
  selectedReason.value = reason
  showReasonPicker.value = false
  errors.value.reason = ''
}

function handlePickerOverlayTap() {
  showReasonPicker.value = false
}

function validateForm(): boolean {
  errors.value = {}

  if (!selectedReason.value) {
    errors.value.reason = '请选择退款原因'
  }

  if (!description.value.trim()) {
    errors.value.description = '请输入问题描述'
  }

  return Object.keys(errors.value).length === 0
}

async function submitRefund() {
  if (!validateForm() || !orderId.value || !canRequestRefund.value) return

  submitting.value = true
  try {
    await shopApi.requestRefund(orderId.value, {
      reason: `${selectedReason.value}：${description.value.trim()}`,
      amountInFen: refundAmount.value,
    })
    // Add custom description as additional note
    // This would be handled by the backend to store in a notes field if needed

    successVisible.value = true
  } catch (error) {
    console.error('Refund request failed:', error)
    // Error is handled by the request layer
  } finally {
    submitting.value = false
  }
}

function goBack() {
  successVisible.value = false
  uni.navigateBack()
}

async function loadOrder() {
  if (!orderId.value) return
  try {
    const orderData = await shopApi.getOrderDetail(orderId.value)
    order.value = orderData
  } catch (error) {
    console.error('Failed to load order:', error)
    uni.showToast({
      title: '加载订单失败',
      icon: 'none',
    })
  }
}

onLoad((options) => {
  if (!authStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }

  orderId.value = options?.id || ''
  if (orderId.value) {
    loadOrder()
  }
})
</script>

<style lang="scss" scoped>
.refund-request {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 100rpx;

  &__container {
    padding: 20rpx;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32rpx 0;
    border-bottom: 1rpx solid var(--color-border);
    margin-bottom: 20rpx;
  }

  &__title {
    color: var(--color-text);
    font-size: 36rpx;
    font-weight: 700;
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

  &__info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 0;

    &:not(:last-child) {
      border-bottom: 1rpx solid var(--color-border);
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
  }

  &__form-group {
    margin-bottom: 24rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__form-label {
    display: block;
    color: var(--color-text);
    font-size: 26rpx;
    font-weight: 600;
    margin-bottom: 10rpx;
  }

  &__required {
    color: #f97316;
  }

  &__reason-select {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 88rpx;
    padding: 0 16rpx;
    border-radius: 12rpx;
    background: var(--color-bg-subtle);
    border: 1.5rpx solid var(--color-border);
    color: var(--color-text);
    font-size: 26rpx;
    transition: all 200ms ease;

    &:active {
      background: var(--color-bg-gray);
    }
  }

  &__placeholder {
    color: var(--color-text-tertiary);
  }

  &__arrow {
    color: var(--color-text-secondary);
    font-size: 32rpx;
  }

  &__amount-display {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 88rpx;
    padding: 0 16rpx;
    border-radius: 12rpx;
    background: var(--color-primary-light);
    border: 1.5rpx solid var(--color-primary);
  }

  &__amount-value {
    color: var(--color-primary);
    font-size: 32rpx;
    font-weight: 700;
  }

  &__form-hint {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    margin-top: 8rpx;
  }

  &__textarea {
    width: 100%;
    min-height: 120rpx;
    padding: 14rpx;
    box-sizing: border-box;
    border-radius: 12rpx;
    background: var(--color-bg-subtle);
    color: var(--color-text);
    font-size: 26rpx;
    border: 1.5rpx solid var(--color-border);
    transition: all 200ms ease;
    line-height: 1.5;
    font-family: inherit;

    &:focus {
      border-color: var(--color-primary);
      background: #fff;
      box-shadow: 0 0 0 4rpx rgba(7, 193, 96, 0.1);
    }
  }

  &__char-count {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    margin-top: 8rpx;
    text-align: right;
  }

  &__error {
    display: block;
    color: #f97316;
    font-size: 22rpx;
    margin-top: 6rpx;
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
    margin-bottom: 6rpx;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14rpx 28rpx 20rpx;
    background: #fff;
    border-top: 1rpx solid var(--color-border);
    box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.06);
  }

  &__submit {
    height: 88rpx;
    border-radius: 44rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 30rpx;
    font-weight: 700;
    box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms ease;

    &:active:not(.loading):not(.disabled) {
      transform: translateY(2rpx);
      box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.15);
    }

    &.loading {
      background: #a2adb8;
      opacity: 0.8;
    }

    &.disabled {
      background: #d0d5dd;
      color: var(--color-text-tertiary);
      box-shadow: none;
      cursor: not-allowed;
    }
  }

  &__picker-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    animation: slideUp 300ms ease-out;
  }

  &__picker-content {
    width: 100%;
    max-height: 60vh;
    background: #fff;
    border-radius: 20rpx 20rpx 0 0;
    overflow: hidden;
    animation: slideUp 300ms ease-out;
  }

  &__picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 24rpx;
    border-bottom: 1rpx solid var(--color-border);
  }

  &__picker-title {
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 700;
  }

  &__picker-close {
    color: var(--color-text-secondary);
    font-size: 32rpx;
    cursor: pointer;
  }

  &__picker-list {
    max-height: calc(60vh - 80rpx);
  }

  &__picker-item {
    padding: 20rpx 24rpx;
    color: var(--color-text);
    font-size: 26rpx;
    border-bottom: 1rpx solid var(--color-border);
    transition: all 200ms ease;

    &.active {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 700;
    }

    &:active {
      background: var(--color-bg-subtle);
    }
  }

  &__success-mask {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(17, 24, 39, 0.48);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48rpx;
    box-sizing: border-box;
    animation: fadeIn 200ms ease-out;
    backdrop-filter: blur(4px);
  }

  &__success {
    width: 100%;
    border-radius: 20rpx;
    background: #fff;
    padding: 44rpx 36rpx 32rpx;
    box-sizing: border-box;
    animation: slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.16);
    text-align: center;
  }

  &__success-icon {
    display: block;
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 48rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16rpx;
  }

  &__success-title {
    display: block;
    color: var(--color-primary);
    font-size: 36rpx;
    font-weight: 800;
    margin-bottom: 12rpx;
  }

  &__success-desc {
    display: block;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    line-height: 1.6;
    margin-bottom: 32rpx;
  }

  &__success-actions {
    display: flex;
    gap: 14rpx;
  }

  &__success-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms ease;

    &:active {
      transform: scale(0.96);
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
