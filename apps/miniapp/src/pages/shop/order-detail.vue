<template>
  <view class="order-detail">
    <view v-if="loading" class="order-detail__state">
      <text>订单加载中...</text>
    </view>

    <view v-else-if="loadError" class="order-detail__state order-detail__state--error">
      <text>订单加载失败</text>
      <view class="order-detail__retry" @tap="loadOrder">重新加载</view>
    </view>

    <view v-else-if="order" class="order-detail__content">
      <!-- 支付加载状态 -->
      <view v-if="paymentLoading" class="order-detail__payment-loading">
        <view class="order-detail__spinner"></view>
        <text class="order-detail__loading-text">支付处理中...</text>
      </view>

      <!-- 订单状态卡片 -->
      <view class="order-status-card">
        <text class="order-status-card__status" :class="statusClass(order.status)">{{ statusText(order.status) }}</text>
        <text class="order-status-card__no">{{ order.orderNo }}</text>
        <text class="order-status-card__date">{{ formatDate(order.createdAt) }}</text>
      </view>

      <!-- 订单商品 -->
      <view class="order-section">
        <text class="order-section__title">订单商品</text>
        <view v-for="item in order.items" :key="item.id" class="order-product">
          <view class="order-product__info">
            <text class="order-product__title">{{ item.productName }}</text>
            <view class="order-product__meta">
              <text>数量：{{ item.quantity }}</text>
              <text>单价：¥{{ (item.unitPriceFen / 100).toFixed(2) }}</text>
            </view>
          </view>
          <text class="order-product__subtotal">¥{{ (item.subtotalFen / 100).toFixed(2) }}</text>
        </view>
      </view>

      <!-- 物流信息 -->
      <view v-if="order.status === 'shipped' && order.trackingNo" class="order-section">
        <text class="order-section__title">物流信息</text>
        <view class="logistics-info">
          <view class="logistics-info__item">
            <text class="logistics-info__label">物流单号</text>
            <text class="logistics-info__value">{{ order.trackingNo }}</text>
          </view>
        </view>
      </view>

      <!-- 订单汇总 -->
      <view class="order-section">
        <text class="order-section__title">订单汇总</text>
        <view class="order-summary">
          <view class="order-summary__row">
            <text class="order-summary__label">小计</text>
            <text class="order-summary__value">¥{{ (itemTotal / 100).toFixed(2) }}</text>
          </view>
          <view class="order-summary__row">
            <text class="order-summary__label">运费</text>
            <text class="order-summary__value">¥0.00</text>
          </view>
          <view class="order-summary__row order-summary__row--total">
            <text class="order-summary__label">总计</text>
            <text class="order-summary__total">¥{{ (order.paymentAmountFen / 100).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 订单操作 -->
      <view class="order-actions">
        <view v-if="order.status === 'pending_payment'" class="order-actions__group">
          <view class="order-actions__button order-actions__button--secondary" @tap="handleCancel">取消订单</view>
          <view class="order-actions__button order-actions__button--primary" @tap="handlePay">立即支付</view>
        </view>
        <view v-else-if="canRequestRefund" class="order-actions__group">
          <view class="order-actions__button order-actions__button--secondary" @tap="handleRefund">申请退款</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi, type Order, type OrderStatus } from '@/api/modules/order'
import { shopApi } from '@/api/modules/shop'

const order = ref<Order | null>(null)
const loading = ref(false)
const loadError = ref(false)
const orderId = ref('')
const paymentLoading = ref(false)
const canRequestRefund = computed(() =>
  order.value?.paymentStatus === 'paid' && order.value.fulfillmentStatus === 'pending'
)

const itemTotal = computed(() => {
  if (!order.value) return 0
  return order.value.items.reduce((sum, item) => sum + item.subtotalFen, 0)
})

function statusText(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending_payment: '待支付',
    closing: '确认支付状态中',
    paid: '已支付',
    shipped: '已发货',
    completed: '已完成',
  }
  return map[status] || status
}

function statusClass(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending_payment: 'order-status-card__status--warning',
    closing: 'order-status-card__status--warning',
    paid: 'order-status-card__status--info',
    shipped: 'order-status-card__status--primary',
    completed: 'order-status-card__status--success',
  }
  return map[status] || status
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function loadOrder(): Promise<void> {
  if (!orderId.value) return

  loading.value = true
  loadError.value = false

  try {
    order.value = await orderApi.detail(orderId.value)
  } catch {
    order.value = null
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function handlePay(): void {
  uni.showModal({
    title: '确认支付',
    content: `确认支付 ¥${((order.value?.paymentAmountFen ?? 0) / 100).toFixed(2)}？`,
    success(res) {
      if (res.confirm) {
        processPayment()
      }
    },
  })
}

async function processPayment(): Promise<void> {
  if (!order.value) return

  paymentLoading.value = true
  try {
    await shopApi.createPayment(order.value.id)
    await loadOrder()
    if (order.value?.paymentStatus !== 'paid') {
      uni.showToast({ title: '支付渠道暂未配置，请稍后重试', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '微信支付暂不可用，请稍后重试', icon: 'none' })
  } finally {
    paymentLoading.value = false
  }
}

function handleCancel(): void {
  uni.showModal({
    title: '取消订单',
    content: '确定要取消这个订单吗？取消后无法恢复。',
    success(res) {
      if (res.confirm) {
        cancelOrder()
      }
    },
  })
}

async function cancelOrder(): Promise<void> {
  if (!order.value) return

  try {
    await orderApi.cancel(order.value.id)
    uni.showToast({ title: '订单已取消', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch {
    uni.showToast({ title: '取消失败，请重试', icon: 'none' })
  }
}

function handleRefund(): void {
  if (!order.value || !canRequestRefund.value) return
  uni.navigateTo({ url: `/pages/shop/refund-request?id=${order.value.id}` })
}

onLoad((options) => {
  if (options?.id) {
    orderId.value = String(options.id)
    loadOrder()
  }
})
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 32rpx 32rpx 100rpx;

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    padding: 120rpx 32rpx;
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: 28rpx;

    &--error {
      color: #e74c3c;
    }
  }

  &__retry {
    padding: 12rpx 28rpx;
    border-radius: 30rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 24rpx;
    font-weight: 600;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.96);
    }
  }

  &__content {
    animation: slideUp var(--duration-normal) var(--easing-ease-out);
  }
}

.order-status-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
  text-align: center;

  &__status {
    display: block;
    font-size: 32rpx;
    font-weight: 800;
    margin-bottom: 16rpx;

    &--warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    &--info {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    &--primary {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    &--success {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &__no {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    margin-bottom: 8rpx;
  }

  &__date {
    display: block;
    font-size: 22rpx;
    opacity: 0.9;
  }
}

.order-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  &__title {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 20rpx;
    padding-bottom: 12rpx;
    border-bottom: 1rpx solid var(--color-border);
  }
}

.order-product {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__title {
    font-size: 26rpx;
    color: var(--color-text);
    font-weight: 600;
    line-height: 1.4;
  }

  &__meta {
    display: flex;
    gap: 16rpx;
    font-size: 22rpx;
    color: var(--color-text-secondary);
  }

  &__subtotal {
    font-size: 26rpx;
    color: var(--color-primary);
    font-weight: 700;
    margin-left: 16rpx;
    flex-shrink: 0;
  }
}

.logistics-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16rpx;
    background: var(--color-bg-subtle);
    border-radius: 12rpx;
  }

  &__label {
    font-size: 24rpx;
    color: var(--color-text-secondary);
  }

  &__value {
    font-size: 24rpx;
    color: var(--color-text);
    font-weight: 600;
  }

  &__link {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-primary);
    font-size: 24rpx;
    font-weight: 600;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      opacity: 0.7;
    }
  }

  &__arrow {
    font-size: 28rpx;
    margin-left: 8rpx;
  }
}

.order-summary {
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12rpx 0;

    &--total {
      padding: 16rpx 0;
      margin-top: 8rpx;
      border-top: 1rpx solid var(--color-border);
      border-bottom: 1rpx solid var(--color-border);
    }
  }

  &__label {
    font-size: 24rpx;
    color: var(--color-text-secondary);
  }

  &__value {
    font-size: 24rpx;
    color: var(--color-text);
    font-weight: 600;
  }

  &__total {
    font-size: 32rpx;
    color: var(--color-primary);
    font-weight: 800;
  }
}

.order-actions {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  &__group {
    display: flex;
    gap: 12rpx;
  }

  &__button {
    flex: 1;
    padding: 14rpx 24rpx;
    border-radius: 30rpx;
    font-size: 26rpx;
    font-weight: 600;
    text-align: center;
    transition: all var(--duration-fast) ease-in-out;
    border: 1rpx solid var(--color-border);

    &:active {
      transform: scale(0.96);
    }

    &--primary {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }

    &--secondary {
      background: #fff;
      color: var(--color-text-secondary);
      border-color: var(--color-border);
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.order-detail__success-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.order-detail__success {
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  width: 90%;
  max-width: 540rpx;
  animation: slideUp var(--duration-normal) var(--easing-ease-out);
}

.order-detail__success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #fff;
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 24rpx;
}

.order-detail__success-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 12rpx;
}

.order-detail__success-desc {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-bottom: 32rpx;
}

.order-detail__order-no-display {
  background: var(--color-bg-subtle);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-detail__order-no-label {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.order-detail__order-no-value {
  font-size: 26rpx;
  color: var(--color-text);
  font-weight: 700;
  font-family: monospace;
}

.order-detail__success-actions {
  display: flex;
  gap: 12rpx;
}

.order-detail__success-btn {
  flex: 1;
  padding: 14rpx 24rpx;
  border-radius: 30rpx;
  background: var(--color-primary);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  transition: all var(--duration-fast) ease-in-out;

  &:active {
    transform: scale(0.96);
  }

  &--secondary {
    background: #fff;
    color: var(--color-primary);
    border: 1rpx solid var(--color-primary);
  }
}

.order-detail__payment-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.order-detail__spinner {
  width: 50rpx;
  height: 50rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top: 4rpx solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.order-detail__loading-text {
  color: #fff;
  font-size: 28rpx;
  margin-top: 24rpx;
  font-weight: 600;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
