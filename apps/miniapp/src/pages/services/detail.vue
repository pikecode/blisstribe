<template>
  <view class="detail">
    <view v-if="loading" class="state">服务详情加载中...</view>
    <template v-else-if="plan">
      <view class="hero">
        <view class="hero__head"><text class="hero__label">{{ statusText }}</text><text class="hero__date">有效期至 {{ formatDate(plan.expiresAt) }}</text></view>
        <text class="hero__title">{{ plan.order?.offering.name || '我的服务' }}</text>
        <text class="hero__institution">{{ plan.institution?.name }}</text>
        <view class="hero__summary"><view><strong>{{ totalAvailable }}</strong><text>剩余权益</text></view><view><strong>{{ totalUsed }}</strong><text>已完成</text></view><view><strong>{{ totalReserved }}</strong><text>已预约</text></view></view>
      </view>

      <view class="card">
        <view class="card__head"><text class="card__title">服务权益</text><text class="card__note">数量由预约和核销记录自动更新</text></view>
        <view v-for="item in plan.entitlements.filter(item => item.orderItem.kind !== 'goods')" :key="item.id" class="right">
          <view class="right__main"><text class="right__name">{{ item.orderItem.itemName }}</text><text v-if="item.orderItem.itemDescription" class="right__desc">{{ item.orderItem.itemDescription }}</text></view>
          <view class="right__count"><strong>{{ item.availableQuantity }}</strong><text>/ {{ item.totalQuantity }} 次可用</text></view>
          <view v-if="item.bookingBlocked" class="right__meta">预约资格暂停：{{ item.bookingBlockReason }}。请联系机构确认后恢复。</view>
          <view class="right__track"><view :style="{ width: progressWidth(item) }" /></view>
          <view class="right__meta"><text>已预约 {{ item.reservedQuantity }}</text><text>已完成 {{ item.usedQuantity }}</text><text v-if="item.refundFrozen">退款处理中 {{ item.refundFrozen }}</text></view>
        </view>
      </view>

      <PackageGoods :plan-id="plan.id" @updated="load" />
      <view class="card institution"><view><text class="card__title">服务机构</text><text class="institution__name">{{ plan.institution?.name }}</text><text class="institution__address">{{ plan.institution?.address || '服务地址由机构确认' }}</text></view><text class="institution__tag">负责履约</text></view>
      <view v-if="appointments.length" class="card"><view class="card__head"><text class="card__title">预约记录</text><text class="card__note">{{ appointments.length }} 条</text></view><view v-for="item in appointments" :key="item.id" class="appointment" @tap="goAppointment(item.id)"><view><text class="appointment__name">{{ item.entitlement.orderItem.itemName }}</text><text class="appointment__time">{{ formatDateTime(item.confirmedStartAt || item.requestedStartAt) }}</text></view><view><text class="appointment__status">{{ appointmentStatus(item.status) }}</text><text class="appointment__arrow">›</text></view></view></view>
      <view v-if="latestRefund" class="refund-card" @tap="goRefundDetail"><view><text class="refund-card__label">售后进度</text><text class="refund-card__title">{{ refundStatus(latestRefund.status) }}</text><text class="refund-card__desc">退款 ¥{{ (latestRefund.requestedAmountFen / 100).toFixed(2) }}</text></view><text>›</text></view>
      <view v-if="plan.extensions?.length" class="card"><text class="card__title">有效期调整记录</text><view v-for="entry in plan.extensions" :key="entry.id" class="appointment"><view><text class="appointment__name">机构等待顺延 {{ entry.addedDays }} 天</text><text class="appointment__time">{{ entry.reason }}</text><text class="appointment__time">{{ formatDate(entry.startAt) }} 至 {{ formatDate(entry.endAt) }}</text></view></view></view>
      <view class="card">
        <view class="card__head"><text class="card__title">服务随访</text><text class="card__note">机构联系安排与体验反馈</text></view>
        <view v-if="followUpError" class="followup-empty" @tap="loadFollowUps">随访加载失败，点击重试</view>
        <text v-else-if="!followUps.length" class="followup-empty">暂无随访安排</text>
        <view v-for="entry in followUps" :key="entry.id" class="followup">
          <view class="followup-head"><text>{{ formatDateTime(entry.scheduledAt) }}</text><text>{{ followUpStatus(entry.status) }}</text></view>
          <text class="followup-text">{{ entry.contactName }} · {{ entry.purpose }}</text>
          <text v-if="entry.outcome" class="followup-text">{{ entry.status === 'cancelled' ? '取消原因' : '联系结果' }}：{{ entry.outcome }}</text>
          <text v-if="entry.patientFeedback" class="followup-feedback">我的反馈：{{ entry.patientFeedback }}</text>
          <button v-else-if="entry.status === 'completed'" class="followup-button" :disabled="feedbackSubmitting" @tap="submitFeedback(entry.id)">反馈服务体验</button>
        </view>
      </view>
      <view class="notice"><text class="notice__title">下一步</text><text v-if="activeAppointment">已有预约正在处理中，请先查看预约安排。</text><text v-else-if="plan.status === 'active' && totalAvailable > 0">选择本次服务项目和期望时间，提交后由机构确认。</text><text v-else>{{ statusText }}，如需帮助请联系服务机构。</text></view>
      <button v-if="activeAppointment" class="primary" @tap="goAppointment(activeAppointment.id)">查看最近预约</button>
      <button v-else-if="plan.status === 'active' && totalAvailable > 0" class="primary" @tap="goBooking">预约下一次</button>
      <button v-if="refundableCount > 0" class="secondary" @tap="goRefund">申请未使用服务退款</button>
      <button class="secondary" @tap="goDisputes">服务异议与处理记录</button>
      <ServiceSupport title="服务咨询" :path="`/pages/services/detail?id=${plan.id}`" :session-from="`service_detail_${plan.id}`" :information="`服务计划编号：${plan.id}\n当前状态：${statusText}`" />
    </template>
    <view v-else class="state"><text>服务详情加载失败</text><button @tap="load">重新加载</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PackageGoods from './PackageGoods.vue'
import ServiceSupport from '@/components/business/ServiceSupport.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceAppointment, type ServiceEntitlement, type ServicePlan, type ServiceRefund, type ServiceFollowUp } from '@/api/modules/service-program'

const followUps = ref<ServiceFollowUp[]>([])
const followUpError = ref(false)
const feedbackSubmitting = ref(false)
async function loadFollowUps() { followUpError.value = false; try { followUps.value = await serviceProgramApi.followUps(id.value) } catch { followUps.value = []; followUpError.value = true } }
function followUpStatus(status: string) { return ({ scheduled: '待联系', completed: '已完成', cancelled: '已取消' } as Record<string, string>)[status] || status }
async function submitFeedback(followUpId: number) {
  const result = await uni.showModal({ title: '反馈服务体验', editable: true, placeholderText: '填写体验或安排建议，请勿填写诊疗资料', confirmText: '提交' })
  if (!result.confirm || !result.content?.trim()) return
  if (result.content.length > 500) { uni.showToast({ title: '反馈请控制在 500 字以内', icon: 'none' }); return }
  feedbackSubmitting.value = true
  try { await serviceProgramApi.followUpFeedback(followUpId, result.content); uni.showToast({ title: '反馈已提交', icon: 'success' }); await loadFollowUps() } catch { /* 请求层展示业务错误 */ } finally { feedbackSubmitting.value = false }
}
const id = ref(0)
const plan = ref<ServicePlan | null>(null)
const loading = ref(true)
const appointments = ref<ServiceAppointment[]>([])
const latestRefund = ref<ServiceRefund | null>(null)
const totalAvailable = computed(() => plan.value?.entitlements.filter(item => item.orderItem.kind !== 'goods').reduce((sum, item) => sum + item.availableQuantity, 0) || 0)
const totalUsed = computed(() => plan.value?.entitlements.filter(item => item.orderItem.kind !== 'goods').reduce((sum, item) => sum + item.usedQuantity, 0) || 0)
const totalReserved = computed(() => plan.value?.entitlements.filter(item => item.orderItem.kind !== 'goods').reduce((sum, item) => sum + item.reservedQuantity, 0) || 0)
const refundableCount = computed(() => plan.value?.entitlements.filter(item => item.orderItem.kind !== 'goods').reduce((sum, item) => sum + item.refundableQuantity + item.reservedQuantity, 0) || 0)
const statusText = computed(() => ({ active: '服务进行中', aftercare: '售后处理中', completed: '服务已完成', refunded: '服务已退款', expired: '服务已过期' } as Record<string, string>)[plan.value?.status || ''] || '服务状态待确认')
const activeAppointment = computed(() => appointments.value.find((item) => ['pending', 'confirmed', 'arrived'].includes(item.status)))
async function load() {
  if (!id.value) return
  loading.value = true
  try {
    plan.value = await serviceProgramApi.plan(id.value)
    await loadFollowUps()
    const [appointmentRows, refundRows] = await Promise.all([serviceProgramApi.appointments(id.value).catch(() => []), serviceProgramApi.refunds().catch(() => [])])
    appointments.value = appointmentRows
    latestRefund.value = refundRows.find((item) => item.orderId === plan.value?.orderId) || null
  } catch { plan.value = null; appointments.value = []; latestRefund.value = null } finally { loading.value = false }
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` }
function formatDateTime(value: string) { const date = new Date(value); return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function appointmentStatus(status: string) { return ({ pending: '待确认', confirmed: '已确认', arrived: '已到场', completed: '已完成', refund_pending: '取消待处理', cancelled: '已取消', no_show: '未到场' } as Record<string, string>)[status] || status }
function refundStatus(status: string) { return ({ pending: '退款待审核', processing: '微信退款处理中', success: '退款成功', rejected: '退款未通过', withdrawn: '退款已撤回' } as Record<string, string>)[status] || status }
function progressWidth(item: ServiceEntitlement) { return `${Math.max(0, Math.min(100, ((item.totalQuantity - item.availableQuantity) / item.totalQuantity) * 100))}%` }
function goDisputes() { uni.navigateTo({ url: `/pages/services/disputes?planId=${id.value}` }) }
function goBooking() { uni.navigateTo({ url: `/pages/services/appointment?planId=${id.value}` }) }
function goAppointment(appointmentId: number) { uni.navigateTo({ url: `/pages/services/appointment-detail?id=${appointmentId}` }) }
function goRefund() { uni.navigateTo({ url: `/pages/services/refund-request?planId=${id.value}` }) }
function goRefundDetail() { if (latestRefund.value) uni.navigateTo({ url: `/pages/services/refund-detail?id=${latestRefund.value.id}` }) }
onLoad((options) => { id.value = Number(options?.id) || 0 })
onShow(() => { void load() })
</script>

<style scoped lang="scss">
.followup { padding: 22rpx 0; border-bottom: 1rpx solid var(--color-border); }
.followup:last-child { border-bottom: 0; }
.followup-head { display: flex; justify-content: space-between; gap: 16rpx; font-size: 25rpx; font-weight: 700; }
.followup-text, .followup-feedback { display: block; margin-top: 12rpx; color: var(--color-text-secondary); font-size: 23rpx; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.followup-feedback { padding: 16rpx; border-radius: 12rpx; background: var(--color-bg); }
.followup-empty { color: var(--color-text-tertiary); font-size: 23rpx; }
.followup-button { margin-top: 20rpx; padding: 0 24rpx; border: 1rpx solid var(--color-border); border-radius: 12rpx; color: var(--color-primary); background: #fff; font-size: 24rpx; }

.detail { min-height: 100vh; padding: 24rpx 24rpx 60rpx; background: var(--color-bg); }
.state { display: flex; min-height: 65vh; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; color: var(--color-text-secondary); }
.state button { margin: 0; padding: 0 36rpx; background: var(--color-primary); color: #fff; font-size: 25rpx; }
.hero { padding: 34rpx; border-radius: 26rpx; background: linear-gradient(140deg, #12332d, #087c51); color: #fff; box-shadow: 0 18rpx 42rpx rgba(8,90,62,.2); }
.hero__head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; color: rgba(255,255,255,.7); font-size: 21rpx; }
.hero__label { padding: 7rpx 12rpx; border-radius: 999rpx; background: rgba(255,255,255,.14); color: #9df0c3; font-weight: 700; }
.hero__title { display: block; margin-top: 25rpx; font-size: 38rpx; font-weight: 800; }
.hero__institution { display: block; margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 23rpx; }
.hero__summary { display: flex; margin-top: 34rpx; padding-top: 28rpx; border-top: 1rpx solid rgba(255,255,255,.16); }
.hero__summary view { display: flex; flex: 1; flex-direction: column; gap: 5rpx; }
.hero__summary strong { font-size: 36rpx; }
.hero__summary text { color: rgba(255,255,255,.64); font-size: 20rpx; }
.card { margin-top: 20rpx; padding: 28rpx; border-radius: 22rpx; background: #fff; box-shadow: var(--shadow-sm); }
.card__head { display: flex; align-items: baseline; justify-content: space-between; gap: 20rpx; }
.card__title { color: var(--color-text); font-size: 28rpx; font-weight: 750; }
.card__note { color: var(--color-text-tertiary); font-size: 19rpx; }
.right { display: grid; grid-template-columns: 1fr auto; gap: 12rpx 22rpx; padding: 27rpx 0; border-bottom: 1rpx solid var(--color-border); }
.right:last-child { padding-bottom: 0; border-bottom: 0; }
.right__name { display: block; color: var(--color-text); font-size: 27rpx; font-weight: 700; }
.right__desc { display: block; margin-top: 6rpx; color: var(--color-text-secondary); font-size: 21rpx; line-height: 32rpx; }
.right__count { align-self: start; text-align: right; }
.right__count strong { color: var(--color-primary); font-size: 34rpx; }
.right__count text { color: var(--color-text-tertiary); font-size: 20rpx; }
.right__track { grid-column: 1 / -1; height: 8rpx; overflow: hidden; border-radius: 999rpx; background: var(--color-bg-gray); }
.right__track view { height: 100%; border-radius: inherit; background: var(--color-primary); }
.right__meta { display: flex; grid-column: 1 / -1; flex-wrap: wrap; gap: 18rpx; color: var(--color-text-tertiary); font-size: 20rpx; }
.institution { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.institution__name { display: block; margin-top: 15rpx; color: var(--color-text); font-size: 26rpx; font-weight: 700; }
.institution__address { display: block; margin-top: 6rpx; color: var(--color-text-secondary); font-size: 22rpx; }
.institution__tag { flex: 0 0 auto; padding: 8rpx 13rpx; border-radius: 999rpx; background: var(--color-primary-soft); color: var(--color-primary); font-size: 20rpx; }
.notice { margin-top: 20rpx; padding: 25rpx 28rpx; border-radius: 19rpx; background: #eef8f3; color: #3c6655; font-size: 23rpx; line-height: 36rpx; }
.notice__title { display: block; margin-bottom: 7rpx; color: #174f3a; font-weight: 800; }
.appointment { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 23rpx 0; border-bottom: 1rpx solid var(--color-border); }
.appointment:last-child { border-bottom: 0; }
.appointment__name { display: block; color: var(--color-text); font-size: 25rpx; font-weight: 700; }
.appointment__time { display: block; margin-top: 6rpx; color: var(--color-text-secondary); font-size: 21rpx; }
.appointment > view:last-child { display: flex; align-items: center; gap: 12rpx; }
.appointment__status { color: var(--color-primary); font-size: 21rpx; }
.appointment__arrow { color: var(--color-text-tertiary); font-size: 34rpx; }
.primary { width: 100%; height: 88rpx; margin: 24rpx 0 0; border-radius: 999rpx; background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 750; box-shadow: var(--shadow-action); }
.secondary { width: 100%; height: 82rpx; margin: 15rpx 0 0; border: 1rpx solid var(--color-border); border-radius: 999rpx; background: #fff; color: var(--color-text-secondary); font-size: 25rpx; }
.refund-card { display: flex; align-items: center; justify-content: space-between; margin-top: 20rpx; padding: 24rpx 28rpx; border: 1rpx solid #f0dcb1; border-radius: 19rpx; background: #fffaf0; color: #9a651c; font-size: 34rpx; }
.refund-card__label { display: block; color: #a16e2a; font-size: 19rpx; }
.refund-card__title { display: block; margin-top: 5rpx; color: #71470d; font-size: 26rpx; font-weight: 750; }
.refund-card__desc { display: block; margin-top: 4rpx; color: #9a651c; font-size: 21rpx; }
</style>
