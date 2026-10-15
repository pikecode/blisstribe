<template>
  <view class="result">
    <view v-if="loading" class="state">正在确认支付结果...</view>
    <view v-else-if="order" class="result__content">
      <view class="hero" :class="`hero--${viewState}`">
        <view class="hero__icon">{{ stateIcon }}</view>
        <text class="hero__title">{{ stateTitle }}</text>
        <text class="hero__desc">{{ stateDescription }}</text>
      </view>

      <view class="card">
        <view class="row"><text>服务方案</text><strong>{{ order.offering.name }}</strong></view>
        <view class="row"><text>服务机构</text><strong>{{ order.institution.name }}</strong></view>
        <view class="row"><text>订单编号</text><strong>{{ order.orderNo }}</strong></view>
        <view class="row"><text>支付金额</text><strong class="amount">¥{{ (order.paymentAmountFen / 100).toFixed(2) }}</strong></view>
      </view>

      <view class="actions">
        <button v-if="order.plan" class="actions__primary" @tap="goPlan">查看我的服务</button>
        <button v-else-if="canPay" class="actions__primary" :disabled="paying" @tap="continuePay">{{ paying ? '处理中...' : '继续支付' }}</button>
        <button v-if="isConfirming" class="actions__primary" :disabled="refreshing" @tap="refresh">{{ refreshing ? '确认中...' : '刷新支付结果' }}</button>
        <button class="actions__secondary" @tap="goServices">返回我的服务</button>
      </view>
      <text v-if="isConfirming" class="hint">微信支付结果可能有短暂延迟，请稍后刷新。系统以微信支付平台确认结果为准。</text>
    </view>
    <view v-else class="state"><text>订单信息加载失败</text><button @tap="refresh">重新加载</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceOrder } from '@/api/modules/service-program'

const orderId = ref(0)
const order = ref<ServiceOrder | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const paying = ref(false)

const isConfirming = computed(() => order.value?.status === 'pending_payment' && order.value?.paymentStatus === 'unpaid')
const canPay = computed(() => isConfirming.value && new Date(order.value?.expiresAt || 0).getTime() > Date.now())
const viewState = computed(() => order.value?.plan ? 'success' : order.value?.status === 'closed' ? 'closed' : 'pending')
const stateIcon = computed(() => viewState.value === 'success' ? '✓' : viewState.value === 'closed' ? '×' : '…')
const stateTitle = computed(() => viewState.value === 'success' ? '服务已生效' : viewState.value === 'closed' ? '订单已关闭' : '支付结果待确认')
const stateDescription = computed(() => viewState.value === 'success'
  ? '支付已确认，服务权益已经发放到“我的服务”。'
  : viewState.value === 'closed' ? '订单已取消或超过支付时限。' : '暂未收到微信支付成功确认。')

async function load(queryChannel = true) {
  if (!orderId.value) return
  try {
    let row = await serviceProgramApi.order(orderId.value)
    if (queryChannel && row.status === 'pending_payment' && row.paymentStatus === 'unpaid') {
      try { await serviceProgramApi.queryPayment(orderId.value) } catch { /* 保留订单真实状态，允许用户稍后重试 */ }
      row = await serviceProgramApi.order(orderId.value)
    }
    order.value = row
  } catch {
    order.value = null
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await load(true)
}

async function continuePay() {
  if (!order.value || paying.value) return
  paying.value = true
  try {
    await serviceProgramApi.payOrder(order.value.id)
  } catch {
    uni.showToast({ title: '支付未完成，请确认后重试', icon: 'none' })
  } finally {
    paying.value = false
    await load(true)
  }
}

function goPlan() {
  if (order.value?.plan) uni.redirectTo({ url: `/pages/services/detail?id=${order.value.plan.id}` })
}

function goServices() {
  uni.redirectTo({ url: '/pages/services/index' })
}

onLoad((options) => {
  orderId.value = Number(options?.id) || 0
  void load(true)
})
</script>

<style scoped lang="scss">
.result { min-height: 100vh; padding: 54rpx 24rpx; background: var(--color-bg); }
.state { display: flex; min-height: 65vh; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; color: var(--color-text-secondary); }
.state button { margin: 0; padding: 0 36rpx; background: var(--color-primary); color: #fff; font-size: 25rpx; }
.hero { display: flex; flex-direction: column; align-items: center; padding: 52rpx 30rpx 40rpx; text-align: center; }
.hero__icon { display: flex; width: 104rpx; height: 104rpx; align-items: center; justify-content: center; border-radius: 50%; background: #fff; font-size: 54rpx; font-weight: 800; box-shadow: var(--shadow-md); }
.hero--success .hero__icon { color: var(--color-primary); }
.hero--pending .hero__icon { color: #b7791f; }
.hero--closed .hero__icon { color: var(--color-text-tertiary); }
.hero__title { margin-top: 26rpx; color: var(--color-text); font-size: 38rpx; font-weight: 800; }
.hero__desc { max-width: 570rpx; margin-top: 12rpx; color: var(--color-text-secondary); font-size: 24rpx; line-height: 38rpx; }
.card { padding: 12rpx 28rpx; border-radius: 22rpx; background: #fff; box-shadow: var(--shadow-sm); }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 30rpx; padding: 23rpx 0; border-bottom: 1rpx solid var(--color-border); color: var(--color-text-secondary); font-size: 23rpx; }
.row:last-child { border-bottom: 0; }
.row strong { max-width: 68%; color: var(--color-text); font-size: 24rpx; font-weight: 650; text-align: right; word-break: break-all; }
.row .amount { color: #c2412d; font-size: 28rpx; }
.actions { display: flex; flex-direction: column; gap: 18rpx; margin-top: 38rpx; }
.actions button { width: 100%; height: 86rpx; margin: 0; border-radius: 999rpx; font-size: 27rpx; font-weight: 700; }
.actions__primary { background: var(--color-primary); color: #fff; box-shadow: var(--shadow-action); }
.actions__secondary { border: 1rpx solid var(--color-border); background: #fff; color: var(--color-text); }
.hint { display: block; padding: 26rpx 18rpx; color: var(--color-text-tertiary); font-size: 21rpx; line-height: 34rpx; text-align: center; }
</style>
