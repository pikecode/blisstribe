<template>
  <view class="orders">
    <view class="orders__head">
      <text class="orders__title">我的订单</text>
      <text class="orders__subtitle">查看和管理你的所有订单</text>
    </view>

    <view class="orders__filters">
      <text
        v-for="item in statusTabs"
        :key="item.value"
        class="orders__filter"
        :class="{ active: selectedStatus === item.value }"
        @tap="changeStatus(item.value)"
      >
        {{ item.label }}
      </text>
    </view>

    <view v-if="loading" class="orders__state">
      <text>订单加载中...</text>
    </view>

    <view v-else-if="loadError" class="orders__state orders__state--error">
      <text>订单加载失败</text>
      <view class="orders__retry" @tap="loadOrders">重新加载</view>
    </view>

    <view v-else-if="orders.length === 0" class="orders__state orders__state--empty">
      <text>暂无订单</text>
      <text class="orders__empty-desc">你还没有{{ filterStatusText }}订单</text>
    </view>

    <view v-else class="orders__list">
      <view v-for="order in orders" :key="order.id" class="order-card" @tap="goDetail(order.id)">
        <view class="order-card__header">
          <text class="order-card__no">订单号：{{ order.orderNo }}</text>
          <text class="order-card__status" :class="statusClass(order.status)">{{ statusText(order.status) }}</text>
        </view>

        <view class="order-card__items">
          <view v-for="(item, index) in order.items.slice(0, 2)" :key="item.id" class="order-item">
            <view class="order-item__info">
              <text class="order-item__title">{{ item.productName }}</text>
              <text class="order-item__meta">x{{ item.quantity }}</text>
            </view>
            <text class="order-item__price">¥{{ (item.subtotalFen / 100).toFixed(2) }}</text>
          </view>
          <view v-if="order.items.length > 2" class="order-item order-item--more">
            <text>还有 {{ order.items.length - 2 }} 件商品</text>
          </view>
        </view>

        <view class="order-card__footer">
          <view>
            <text class="order-card__date">{{ formatDate(order.createdAt) }}</text>
            <text class="order-card__amount">实付：<text class="order-card__total">¥{{ (order.paymentAmountFen / 100).toFixed(2) }}</text></text>
          </view>
          <view class="order-card__actions">
            <view v-if="order.status === 'pending_payment'" class="order-card__action order-card__action--primary" @tap.stop="handlePayment(order.id)">立即支付</view>
            <view v-if="order.status === 'pending_payment'" class="order-card__action order-card__action--secondary" @tap.stop="handleCancel(order.id)">取消订单</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="orders.length > 0 && hasMore && !loading" class="orders__pagination">
      <view class="orders__load-more" @tap="loadMore">加载更多</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { orderApi, type Order, type OrderStatus } from '@/api/modules/order'
import { shopApi } from '@/api/modules/shop'

type FilterStatus = OrderStatus | ''

const orders = ref<Order[]>([])
const loading = ref(false)
const loadError = ref(false)
const selectedStatus = ref<FilterStatus>('')
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)

const statusTabs: Array<{ label: string; value: FilterStatus }> = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending_payment' },
  { label: '已支付', value: 'paid' },
  { label: '已发货', value: 'shipped' },
  { label: '已完成', value: 'completed' },
]

const filterStatusText = computed(() => {
  const map: Record<FilterStatus, string> = {
    '': '',
    'pending_payment': '待支付',
    'paid': '已支付',
    'shipped': '已发货',
    'completed': '已完成',
  }
  return map[selectedStatus.value]
})

const hasMore = computed(() => orders.value.length < total.value)

function statusText(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending_payment: '待支付',
    closing: '确认支付状态中',
    paid: '已支付',
    shipped: '已发货',
    completed: '已完成',
  }
  return map[status]
}

function statusClass(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending_payment: 'order-card__status--warning',
    closing: 'order-card__status--warning',
    paid: 'order-card__status--info',
    shipped: 'order-card__status--primary',
    completed: 'order-card__status--success',
  }
  return map[status]
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function loadOrders(): Promise<void> {
  loading.value = true
  loadError.value = false
  currentPage.value = 1

  try {
    const result = await orderApi.list({
      status: selectedStatus.value,
      page: 1,
      pageSize,
    })
    orders.value = result.list
    total.value = result.total
  } catch {
    orders.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function loadMore(): Promise<void> {
  if (loading.value || !hasMore.value) return

  loading.value = true
  try {
    const result = await orderApi.list({
      status: selectedStatus.value,
      page: currentPage.value + 1,
      pageSize,
    })
    orders.value = [...orders.value, ...result.list]
    currentPage.value += 1
  } catch {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function changeStatus(status: FilterStatus): void {
  selectedStatus.value = status
  loadOrders()
}

function goDetail(id: string): void {
  uni.navigateTo({ url: `/pages/shop/order-detail?id=${id}` })
}

async function handlePayment(id: string): Promise<void> {
  try {
    await shopApi.createPayment(id)
    await loadOrders()
  } catch {
    uni.showToast({ title: '微信支付暂不可用，请稍后重试', icon: 'none' })
  }
}

function handleCancel(id: string): void {
  uni.showModal({
    title: '取消订单',
    content: '确定要取消这个订单吗？',
    success(res) {
      if (res.confirm) {
        cancelOrder(id)
      }
    },
  })
}

async function cancelOrder(id: string): Promise<void> {
  try {
    await orderApi.cancel(id)
    uni.showToast({ title: '订单已取消', icon: 'success' })
    loadOrders()
  } catch {
    uni.showToast({ title: '取消失败，请重试', icon: 'none' })
  }
}

onShow(loadOrders)
</script>

<style lang="scss" scoped>
.orders {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 32rpx;

  &__head {
    padding: 32rpx;
    background: linear-gradient(180deg, #ffffff 0%, #f6faf7 100%);
    border-bottom: 1rpx solid var(--color-border);
  }

  &__title {
    display: block;
    font-size: 42rpx;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.24;
    margin-bottom: 8rpx;
  }

  &__subtitle {
    display: block;
    font-size: 26rpx;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__filters {
    display: flex;
    gap: 12rpx;
    padding: 24rpx 32rpx;
    overflow-x: auto;
    background: #fff;
    border-bottom: 1rpx solid var(--color-border);
  }

  &__filter {
    flex-shrink: 0;
    padding: 10rpx 22rpx;
    border-radius: 30rpx;
    background: var(--color-bg-white);
    color: var(--color-text-secondary);
    font-size: 26rpx;
    font-weight: 600;
    border: 1rpx solid var(--color-border);
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.96);
    }

    &.active {
      color: #fff;
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  &__list {
    padding: 24rpx 32rpx 0;
  }

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

    &--empty {
      color: var(--color-text-tertiary);
    }
  }

  &__empty-desc {
    font-size: 24rpx;
    color: var(--color-text-secondary);
    display: block;
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

  &__pagination {
    padding: 32rpx;
    text-align: center;
  }

  &__load-more {
    padding: 14rpx 32rpx;
    border-radius: 30rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 26rpx;
    font-weight: 600;
    display: inline-block;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.98);
      box-shadow: var(--shadow-action);
    }
  }
}

.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) ease-in-out;

  &:active {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2rpx);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    padding-bottom: 12rpx;
    border-bottom: 1rpx solid var(--color-border);
  }

  &__no {
    font-size: 24rpx;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  &__status {
    display: inline-block;
    padding: 6rpx 14rpx;
    border-radius: 20rpx;
    font-size: 22rpx;
    font-weight: 600;
    background: var(--color-bg-subtle);
    color: var(--color-text-secondary);

    &--warning {
      background: #fff3cd;
      color: #856404;
    }

    &--info {
      background: #d1ecf1;
      color: #0c5460;
    }

    &--primary {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    &--success {
      background: #d4edda;
      color: #155724;
    }
  }

  &__items {
    margin-bottom: 16rpx;
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  &__date {
    display: block;
    font-size: 22rpx;
    color: var(--color-text-tertiary);
    margin-bottom: 8rpx;
  }

  &__amount {
    font-size: 24rpx;
    color: var(--color-text-secondary);
  }

  &__total {
    color: var(--color-primary);
    font-weight: 700;
    font-size: 30rpx;
  }

  &__actions {
    display: flex;
    gap: 8rpx;
  }

  &__action {
    padding: 8rpx 16rpx;
    border-radius: 20rpx;
    font-size: 22rpx;
    font-weight: 600;
    border: 1rpx solid var(--color-border);
    transition: all var(--duration-fast) ease-in-out;
    white-space: nowrap;

    &:active {
      transform: scale(0.95);
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

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  &__title {
    font-size: 26rpx;
    color: var(--color-text);
    font-weight: 600;
  }

  &__meta {
    font-size: 22rpx;
    color: var(--color-text-secondary);
  }

  &__price {
    font-size: 24rpx;
    color: var(--color-primary);
    font-weight: 600;
    flex-shrink: 0;
    margin-left: 16rpx;
  }

  &--more {
    justify-content: center;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    padding: 8rpx 0;
  }
}
</style>
