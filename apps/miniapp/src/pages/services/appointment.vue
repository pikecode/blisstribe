<template>
  <view class="booking">
    <view v-if="loading" class="state">预约信息加载中...</view>
    <template v-else-if="plan">
      <view class="step"><text class="step__number">01</text><view><text class="step__title">选择服务项目</text><text class="step__desc">本次预约将占用 1 次服务权益</text></view></view>
      <view class="options">
        <view v-for="item in availableRights" :key="item.id" class="option" :class="{ 'option--active': entitlementId === item.id }" @tap="entitlementId = item.id">
          <view><text class="option__name">{{ item.orderItem.itemName }}</text><text class="option__desc">剩余 {{ item.availableQuantity }} / {{ item.totalQuantity }} 次</text></view><text class="option__radio">{{ entitlementId === item.id ? '●' : '○' }}</text>
        </view>
      </view>

      <view class="step"><text class="step__number">02</text><view><text class="step__title">选择期望时间</text><text class="step__desc">提交后由机构确认，当前时间尚未锁定</text></view></view>
      <view class="options">
        <view v-for="slot in availableSlots" :key="slot.id" class="option" :class="{ 'option--active': slotId === slot.id }" @tap="slotId = slot.id"><view><text class="option__name">{{ new Date(slot.startAt).toLocaleString('zh-CN', { hour12: false }) }}</text><text class="option__desc">剩余 {{ slot.available }} 个名额</text></view><text class="option__radio">{{ slotId === slot.id ? '●' : '○' }}</text></view>
        <view v-if="!availableSlots.length" class="notice">机构暂未开放可约时段，请联系机构协调。</view>
      </view>

      <view class="step"><text class="step__number">03</text><view><text class="step__title">补充说明</text><text class="step__desc">可填写到场或时间安排相关信息</text></view></view>
      <textarea v-model="patientNote" class="note" maxlength="300" placeholder="选填，不填写专业诊疗资料" />

      <view class="institution"><text>服务机构</text><strong>{{ plan.institution?.name }}</strong><text>{{ plan.institution?.address || '详细地点由机构确认' }}</text></view>
      <view class="notice">预约提交后状态为“待确认”。机构确认前可随时取消；确认后距开始超过 24 小时可自行取消，其他情况请联系客服协调。</view>
      <button class="submit" :disabled="submitting || !entitlementId || !slotId" @tap="submit">{{ submitting ? '提交中...' : '提交预约申请' }}</button>
    </template>
    <view v-else class="state">当前服务不可预约</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServicePlan } from '@/api/modules/service-program'

const planId = ref(0)
const plan = ref<ServicePlan | null>(null)
const preferredEntitlementId = ref(0)
const entitlementId = ref(0)
const patientNote = ref('')
const loading = ref(true)
const submitting = ref(false)
const requestId = `appointment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const slots = ref<Array<{ id: number; startAt: string; endAt: string; available: number }>>([])
const slotId = ref(0)
const availableSlots = computed(() => slots.value.filter((slot) => slot.available > 0 && new Date(slot.startAt) <= new Date(plan.value?.expiresAt || 0)))
const availableRights = computed(() => plan.value?.entitlements.filter((item) => item.orderItem.kind !== 'goods' && item.availableQuantity > 0 && !item.bookingBlocked) || [])

async function load() {
  loading.value = true
  try {
    plan.value = await serviceProgramApi.plan(planId.value)
    slots.value = await serviceProgramApi.slots(plan.value.institution!.id)
    slotId.value = availableSlots.value[0]?.id || 0
    entitlementId.value = availableRights.value.find(item => item.id === preferredEntitlementId.value)?.id || availableRights.value[0]?.id || 0
  } catch { plan.value = null } finally { loading.value = false }
}
async function submit() {
  if (!plan.value || !entitlementId.value || submitting.value) return
  const slot = availableSlots.value.find((item) => item.id === slotId.value)
  if (!slot) return
  const requestedStartAt = new Date(slot.startAt)
  if (requestedStartAt.getTime() <= Date.now() + 60 * 60 * 1000) { uni.showToast({ title: '请选择至少 1 小时后的时间', icon: 'none' }); return }
  submitting.value = true
  try {
    const appointment = await serviceProgramApi.createAppointment(plan.value.id, {
      slotId: slot.id, entitlementId: entitlementId.value, requestedStartAt: requestedStartAt.toISOString(), clientRequestId: requestId, patientNote: patientNote.value.trim(),
    })
    uni.redirectTo({ url: `/pages/services/appointment-detail?id=${appointment.id}` })
  } catch { /* 全局请求层展示业务错误 */ } finally { submitting.value = false }
}
onLoad((options) => { planId.value = Number(options?.planId) || 0; preferredEntitlementId.value = Number(options?.entitlementId) || 0; void load() })
</script>

<style scoped lang="scss">
.booking { min-height: 100vh; padding: 28rpx 24rpx 60rpx; background: var(--color-bg); }
.state { display: flex; min-height: 65vh; align-items: center; justify-content: center; color: var(--color-text-secondary); }
.step { display: flex; align-items: center; gap: 18rpx; margin: 26rpx 6rpx 16rpx; }
.step__number { color: var(--color-primary); font-size: 19rpx; font-weight: 800; letter-spacing: 2rpx; }
.step__title { display: block; color: var(--color-text); font-size: 27rpx; font-weight: 750; }
.step__desc { display: block; margin-top: 3rpx; color: var(--color-text-tertiary); font-size: 20rpx; }
.options { display: flex; flex-direction: column; gap: 12rpx; }
.option { display: flex; align-items: center; justify-content: space-between; padding: 25rpx 27rpx; border: 2rpx solid transparent; border-radius: 19rpx; background: #fff; }
.option--active { border-color: var(--color-primary); background: #f3fbf7; }
.option__name { display: block; color: var(--color-text); font-size: 26rpx; font-weight: 700; }
.option__desc { display: block; margin-top: 6rpx; color: var(--color-text-secondary); font-size: 21rpx; }
.option__radio { color: var(--color-primary); font-size: 30rpx; }
.time-card { overflow: hidden; border-radius: 20rpx; background: #fff; box-shadow: var(--shadow-sm); }
.time-row { display: grid; grid-template-columns: 1fr auto 28rpx; gap: 14rpx; padding: 27rpx; border-bottom: 1rpx solid var(--color-border); color: var(--color-text-secondary); font-size: 24rpx; }
.time-card picker:last-child .time-row { border-bottom: 0; }
.time-row strong { color: var(--color-text); font-weight: 700; }
.note { box-sizing: border-box; width: 100%; height: 180rpx; padding: 24rpx; border-radius: 19rpx; background: #fff; color: var(--color-text); font-size: 24rpx; }
.institution { display: flex; flex-direction: column; gap: 7rpx; margin-top: 22rpx; padding: 25rpx 27rpx; border-radius: 19rpx; background: #fff; color: var(--color-text-secondary); font-size: 22rpx; }
.institution strong { color: var(--color-text); font-size: 26rpx; }
.notice { padding: 24rpx 10rpx; color: var(--color-text-tertiary); font-size: 21rpx; line-height: 34rpx; }
.submit { width: 100%; height: 88rpx; margin: 8rpx 0 0; border-radius: 999rpx; background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 750; box-shadow: var(--shadow-action); }
.submit[disabled] { opacity: .5; }
</style>
