<template>
  <view class="refund">
    <view v-if="loading" class="state">退款信息加载中...</view>
    <template v-else-if="plan && order">
      <view class="intro"><text class="intro__title">选择退款内容</text><text class="intro__desc">可申请未使用服务和未交付实物；提交后所选内容暂停预约或交付。已交付商品请在服务详情申请退货。</text></view>
      <view class="card">
        <view v-for="item in refundableRights" :key="item.id" class="item">
          <view class="item__head"><view><text class="item__name">{{ item.orderItem.itemName }}</text><text class="item__meta">可退 {{ refundableCount(item.id) }} {{ item.orderItem.kind === 'goods' ? '件' : '次' }} · 已{{ item.orderItem.kind === 'goods' ? '交付' : '完成' }} {{ item.usedQuantity }}</text></view><view class="stepper"><button :disabled="quantityOf(item.id) <= 0" @tap="changeQuantity(item.id, -1)">−</button><text>{{ quantityOf(item.id) }}</text><button :disabled="quantityOf(item.id) >= refundableCount(item.id)" @tap="changeQuantity(item.id, 1)">＋</button></view></view>
          <view v-if="selectedAppointments(item.id).length" class="affected"><text>将同时取消以下预约</text><text v-for="appointment in selectedAppointments(item.id)" :key="appointment.id">{{ formatDateTime(appointment.confirmedStartAt || appointment.requestedStartAt) }}</text></view>
        </view>
      </view>

      <view class="card"><text class="card__title">退款原因</text><view class="reason" @tap="showReasons = true"><text :class="{ placeholder: !reason }">{{ reason || '请选择退款原因' }}</text><text>›</text></view><textarea v-model="description" maxlength="300" placeholder="请补充说明，便于客服审核" /></view>
      <view class="summary"><view><text>预计退款</text><strong>¥{{ (refundAmountFen / 100).toFixed(2) }}</strong></view><text>金额以原成交分摊计算，资金退款以微信确认结果为准。零元商品仅终结交付权益，无资金退回。</text></view>
      <button class="submit" :disabled="!canSubmit || submitting" @tap="submit">{{ submitting ? '提交中...' : '提交退款申请' }}</button>
    </template>
    <view v-else class="state">当前服务无法申请退款</view>

    <view v-if="showReasons" class="sheet-mask" @tap="showReasons = false"><view class="sheet" @tap.stop><view class="sheet__head"><text>选择退款原因</text><button @tap="showReasons = false">×</button></view><view v-for="item in reasons" :key="item" class="sheet__item" @tap="reason = item; showReasons = false"><text>{{ item }}</text><text>{{ reason === item ? '✓' : '' }}</text></view></view></view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceAppointment, type ServiceEntitlement, type ServiceOrder, type ServicePlan } from '@/api/modules/service-program'

const planId = ref(0)
const plan = ref<ServicePlan | null>(null)
const order = ref<ServiceOrder | null>(null)
const appointments = ref<ServiceAppointment[]>([])
const quantities = reactive<Record<number, number>>({})
const reason = ref('')
const description = ref('')
const loading = ref(true)
const submitting = ref(false)
const showReasons = ref(false)
const reasons = ['计划有变', '暂时无法到店', '服务内容不合适', '机构时间无法协调', '其他']
const cancellableAppointments = computed(() => appointments.value.filter((item) => ['pending', 'confirmed'].includes(item.status)))
const refundableRights = computed(() => plan.value?.entitlements.filter((item) => refundableCount(item.id) > 0) || [])
const refundAmountFen = computed(() => refundableRights.value.reduce((sum, item) => {
  const quantity = quantityOf(item.id)
  const previous = item.refundedQuantity
  return sum + Math.floor(item.orderItem.allocatedAmountFen * (previous + quantity) / item.totalQuantity) - Math.floor(item.orderItem.allocatedAmountFen * previous / item.totalQuantity)
}, 0))
const canSubmit = computed(() => refundableRights.value.some(item => quantityOf(item.id) > 0) && !!reason.value && !!description.value.trim())

function activeAppointmentCount(entitlementId: number) { return cancellableAppointments.value.filter((item) => item.entitlementId === entitlementId).length }
function refundableCount(entitlementId: number) { const item = plan.value?.entitlements.find((right) => right.id === entitlementId); return item ? item.refundableQuantity + activeAppointmentCount(entitlementId) : 0 }
function quantityOf(entitlementId: number) { return quantities[entitlementId] || 0 }
function changeQuantity(entitlementId: number, delta: number) { quantities[entitlementId] = Math.max(0, Math.min(refundableCount(entitlementId), quantityOf(entitlementId) + delta)) }
function selectedAppointments(entitlementId: number) {
  const item = plan.value?.entitlements.find((right) => right.id === entitlementId)
  const required = Math.max(0, quantityOf(entitlementId) - (item?.refundableQuantity || 0))
  return cancellableAppointments.value.filter((appointment) => appointment.entitlementId === entitlementId).slice(0, required)
}
async function load() {
  loading.value = true
  try {
    const [planRow, appointmentRows] = await Promise.all([serviceProgramApi.plan(planId.value), serviceProgramApi.appointments(planId.value)])
    plan.value = planRow
    appointments.value = appointmentRows
    order.value = await serviceProgramApi.order(planRow.orderId)
  } catch { plan.value = null } finally { loading.value = false }
}
async function submit() {
  if (!plan.value || !order.value || !canSubmit.value || submitting.value) return
  const { confirm } = await uni.showModal({ title: '确认申请退款', content: selectedAffectedCount() ? `将取消 ${selectedAffectedCount()} 个关联预约并冻结所选权益，是否继续？` : '提交后所选权益会进入退款冻结，是否继续？', confirmText: '提交申请' })
  if (!confirm) return
  submitting.value = true
  try {
    const refund = await serviceProgramApi.createRefund(order.value.id, {
      items: refundableRights.value.filter((item) => quantityOf(item.id) > 0).map((item) => ({ entitlementId: item.id, quantity: quantityOf(item.id), appointmentIds: selectedAppointments(item.id).map((appointment) => appointment.id) })),
      reason: `${reason.value}：${description.value.trim()}`,
    })
    uni.redirectTo({ url: `/pages/services/refund-detail?id=${refund.id}` })
  } catch { /* 请求层展示错误 */ } finally { submitting.value = false }
}
function selectedAffectedCount() { return refundableRights.value.reduce((sum, item) => sum + selectedAppointments(item.id).length, 0) }
function formatDateTime(value: string) { const date = new Date(value); return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
onLoad((options) => { planId.value = Number(options?.planId) || 0; void load() })
</script>

<style scoped lang="scss">
.refund { min-height: 100vh; padding: 24rpx 24rpx 60rpx; background: var(--color-bg); }
.state { display: flex; min-height: 65vh; align-items: center; justify-content: center; color: var(--color-text-secondary); }
.intro { padding: 22rpx 7rpx; }
.intro__title { display: block; color: var(--color-text); font-size: 36rpx; font-weight: 800; }
.intro__desc { display: block; margin-top: 9rpx; color: var(--color-text-secondary); font-size: 22rpx; line-height: 34rpx; }
.card { margin-bottom: 20rpx; padding: 12rpx 27rpx; border-radius: 21rpx; background: #fff; box-shadow: var(--shadow-sm); }
.card__title { display: block; padding: 22rpx 0 14rpx; color: var(--color-text); font-size: 27rpx; font-weight: 750; }
.item { padding: 25rpx 0; border-bottom: 1rpx solid var(--color-border); }
.item:last-child { border-bottom: 0; }
.item__head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.item__name { display: block; color: var(--color-text); font-size: 26rpx; font-weight: 700; }
.item__meta { display: block; margin-top: 6rpx; color: var(--color-text-secondary); font-size: 21rpx; }
.stepper { display: flex; align-items: center; overflow: hidden; border: 1rpx solid var(--color-border); border-radius: 12rpx; }
.stepper button { width: 58rpx; height: 56rpx; margin: 0; padding: 0; border-radius: 0; background: var(--color-bg-subtle); color: var(--color-text); font-size: 28rpx; line-height: 56rpx; }
.stepper text { width: 56rpx; text-align: center; font-size: 24rpx; }
.affected { display: flex; flex-direction: column; gap: 5rpx; margin-top: 17rpx; padding: 15rpx; border-radius: 12rpx; background: #fff7ed; color: #9a5b12; font-size: 20rpx; }
.reason { display: flex; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid var(--color-border); color: var(--color-text); font-size: 24rpx; }
.placeholder { color: var(--color-text-tertiary); }
textarea { box-sizing: border-box; width: 100%; height: 170rpx; padding: 20rpx 0; color: var(--color-text); font-size: 23rpx; }
.summary { margin: 4rpx 4rpx 24rpx; color: var(--color-text-tertiary); font-size: 21rpx; line-height: 33rpx; }
.summary > view { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 9rpx; color: var(--color-text-secondary); font-size: 24rpx; }
.summary strong { color: #c2412d; font-size: 36rpx; }
.submit { width: 100%; height: 88rpx; margin: 0; border-radius: 999rpx; background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 750; }
.submit[disabled] { opacity: .5; }
.sheet-mask { position: fixed; z-index: 20; inset: 0; display: flex; align-items: flex-end; background: rgba(0,0,0,.38); }
.sheet { box-sizing: border-box; width: 100%; padding: 20rpx 28rpx calc(26rpx + env(safe-area-inset-bottom)); border-radius: 28rpx 28rpx 0 0; background: #fff; }
.sheet__head, .sheet__item { display: flex; align-items: center; justify-content: space-between; }
.sheet__head { padding: 8rpx 0 18rpx; font-size: 28rpx; font-weight: 750; }
.sheet__head button { margin: 0; padding: 0 12rpx; background: transparent; color: var(--color-text-secondary); font-size: 35rpx; }
.sheet__item { padding: 25rpx 2rpx; border-top: 1rpx solid var(--color-border); color: var(--color-text); font-size: 25rpx; }
.sheet__item text:last-child { color: var(--color-primary); }
</style>
