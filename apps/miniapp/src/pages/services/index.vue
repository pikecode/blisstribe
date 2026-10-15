<template>
  <view class="services">
    <view class="intro"><button style="float:right;font-size:24rpx;background:white" @tap="goNotices">服务消息</button><text class="intro__eyebrow">MY SERVICES</text><text class="intro__title">我的服务</text><text class="intro__desc">查看已生效权益、服务机构和有效期</text></view>

    <view v-if="pendingOrders.length" class="section">
      <text class="section__title">待处理订单</text>
      <view v-for="item in pendingOrders" :key="item.id" class="pending" @tap="goPayment(item.id)">
        <view><text class="pending__name">{{ item.offering.name }}</text><text class="pending__meta">{{ item.institution.name }} · {{ remainingText(item.expiresAt) }}</text></view>
        <view class="pending__side"><text>¥{{ (item.paymentAmountFen / 100).toFixed(2) }}</text><text class="chevron">›</text></view>
      </view>
    </view>

    <view class="tabs">
      <view v-for="tab in tabs" :key="tab.value" class="tabs__item" :class="{ 'tabs__item--active': activeTab === tab.value }" @tap="activeTab = tab.value">{{ tab.label }}</view>
    </view>

    <view v-if="loading" class="empty">服务加载中...</view>
    <view v-else-if="filteredPlans.length" class="list">
      <view v-for="plan in filteredPlans" :key="plan.id" class="plan" @tap="goPlan(plan.id)">
        <view class="plan__head"><text class="plan__status" :class="`plan__status--${plan.status}`">{{ statusText(plan.status) }}</text><text v-if="plan.hasAftercare && plan.status !== 'aftercare'" class="plan__status">部分售后</text><text class="plan__date">有效期至 {{ formatDate(plan.expiresAt) }}</text></view>
        <text class="plan__name">{{ plan.order?.offering.name || '服务方案' }}</text>
        <text class="plan__institution">{{ plan.institution?.name || '服务机构待确认' }}</text>
        <view class="plan__rights">
          <view><strong>{{ totalAvailable(plan) }}</strong><text>剩余权益</text></view>
          <view><strong>{{ totalUsed(plan) }}</strong><text>已完成</text></view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>
    <view v-else class="empty"><text>{{ activeTab === 'all' ? '还没有已生效的服务' : '当前分类暂无服务' }}</text><button @tap="goProducts">查看推荐产品</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceOrder, type ServicePlan } from '@/api/modules/service-program'

const plans = ref<ServicePlan[]>([])
const pendingOrders = ref<ServiceOrder[]>([])
const loading = ref(true)
const activeTab = ref('all')
const tabs = [{ label: '全部', value: 'all' }, { label: '进行中', value: 'active' }, { label: '售后中', value: 'aftercare' }, { label: '已完成', value: 'completed' }, { label: '已到期', value: 'expired' }, { label: '已退款', value: 'refunded' }]
const filteredPlans = computed(() => plans.value.filter((item) => activeTab.value === 'all' || item.status === activeTab.value))

async function load() {
  loading.value = true
  try {
    const [planRows, orderRows] = await Promise.all([
      serviceProgramApi.plans(),
      serviceProgramApi.orders({ status: 'pending_payment', page: 1, pageSize: 20 }),
    ])
    plans.value = planRows
    pendingOrders.value = orderRows.list
  } catch {
    uni.showToast({ title: '服务列表加载失败', icon: 'none' })
  } finally { loading.value = false }
}
function totalAvailable(plan: ServicePlan) { return plan.entitlements.reduce((sum, item) => sum + item.availableQuantity, 0) }
function totalUsed(plan: ServicePlan) { return plan.entitlements.reduce((sum, item) => sum + item.usedQuantity, 0) }
function statusText(status: string) { return ({ active: '进行中', aftercare: '售后中', completed: '已完成', refunded: '已退款', expired: '已过期' } as Record<string, string>)[status] || status }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}` }
function remainingText(value: string) { const minutes = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 60000)); return minutes ? `${minutes}分钟内支付` : '等待状态更新' }
function goNotices() { uni.navigateTo({ url: '/pages/services/notices' }) }
function goPlan(id: number) { uni.navigateTo({ url: `/pages/services/detail?id=${id}` }) }
function goPayment(id: number) { uni.navigateTo({ url: `/pages/services/payment-result?id=${id}` }) }
function goProducts() { uni.navigateTo({ url: '/pages/products/index' }) }
onShow(() => { void load() })
</script>

<style scoped lang="scss">
.services { min-height: 100vh; padding: 24rpx 24rpx 60rpx; background: var(--color-bg); }
.intro { padding: 32rpx 8rpx 28rpx; }
.intro__eyebrow { display: block; color: var(--color-primary); font-size: 19rpx; font-weight: 800; letter-spacing: 4rpx; }
.intro__title { display: block; margin-top: 9rpx; color: var(--color-text); font-size: 40rpx; font-weight: 800; }
.intro__desc { display: block; margin-top: 9rpx; color: var(--color-text-secondary); font-size: 23rpx; }
.section { margin-bottom: 24rpx; }
.section__title { display: block; margin: 0 6rpx 14rpx; color: var(--color-text); font-size: 26rpx; font-weight: 750; }
.pending { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 25rpx 26rpx; border: 1rpx solid #f0dcb1; border-radius: 19rpx; background: #fffaf0; }
.pending + .pending { margin-top: 12rpx; }
.pending__name { display: block; color: var(--color-text); font-size: 26rpx; font-weight: 700; }
.pending__meta { display: block; margin-top: 7rpx; color: #8a6426; font-size: 21rpx; }
.pending__side { display: flex; align-items: center; gap: 12rpx; color: #b45309; font-size: 26rpx; font-weight: 750; }
.tabs { display: flex; overflow-x: auto; white-space: nowrap; gap: 36rpx; margin: 8rpx 6rpx 20rpx; border-bottom: 1rpx solid var(--color-border); }
.tabs__item { position: relative; padding: 17rpx 2rpx; color: var(--color-text-secondary); font-size: 25rpx; }
.tabs__item--active { color: var(--color-text); font-weight: 750; }
.tabs__item--active::after { position: absolute; right: 0; bottom: -1rpx; left: 0; height: 5rpx; border-radius: 999rpx; background: var(--color-primary); content: ''; }
.list { display: flex; flex-direction: column; gap: 18rpx; }
.plan { padding: 27rpx; border-radius: 22rpx; background: #fff; box-shadow: var(--shadow-sm); }
.plan__head { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.plan__status { padding: 7rpx 12rpx; border-radius: 999rpx; background: var(--color-primary-soft); color: var(--color-primary); font-size: 20rpx; font-weight: 700; }
.plan__status--completed, .plan__status--expired, .plan__status--refunded { background: var(--color-bg-gray); color: var(--color-text-secondary); }
.plan__date { color: var(--color-text-tertiary); font-size: 21rpx; }
.plan__name { display: block; margin-top: 20rpx; color: var(--color-text); font-size: 31rpx; font-weight: 800; }
.plan__institution { display: block; margin-top: 7rpx; color: var(--color-text-secondary); font-size: 23rpx; }
.plan__rights { display: flex; align-items: center; gap: 46rpx; margin-top: 24rpx; padding-top: 21rpx; border-top: 1rpx solid var(--color-border); }
.plan__rights view { display: flex; align-items: baseline; gap: 8rpx; }
.plan__rights strong { color: var(--color-text); font-size: 31rpx; }
.plan__rights view text { color: var(--color-text-tertiary); font-size: 21rpx; }
.chevron { margin-left: auto; color: var(--color-text-tertiary); font-size: 38rpx; font-weight: 400; }
.empty { display: flex; min-height: 360rpx; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; color: var(--color-text-tertiary); font-size: 24rpx; }
.empty button { margin: 0; padding: 0 36rpx; background: #fff; color: var(--color-primary); font-size: 24rpx; }
</style>
