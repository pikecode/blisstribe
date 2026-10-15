<template>
  <view class="detail">
    <view v-if="loading" class="state">预约详情加载中...</view>
    <template v-else-if="appointment">
      <view class="hero" :class="`hero--${appointment.status}`"><text class="hero__label">{{ statusText }}</text><text class="hero__title">{{ nextStepTitle }}</text><text class="hero__desc">{{ nextStepDesc }}</text></view>
      <view class="card">
        <text class="card__title">预约信息</text>
        <view class="row"><text>服务项目</text><strong>{{ appointment.entitlement.orderItem.itemName }}</strong></view>
        <view class="row"><text>{{ appointment.confirmedStartAt ? '到场时间' : '期望时间' }}</text><strong>{{ formatDateTime(appointment.confirmedStartAt || appointment.requestedStartAt) }}</strong></view>
        <view v-if="appointment.status === 'pending' && appointment.confirmationDeadline" class="row"><text>确认截止</text><strong>{{ formatDateTime(appointment.confirmationDeadline) }}</strong></view>
        <view class="row"><text>服务机构</text><strong>{{ appointment.institution.name }}</strong></view>
        <view class="row"><text>服务地址</text><strong>{{ appointment.institution.address || '机构确认时告知' }}</strong></view>
        <view v-if="appointment.performedByName" class="row"><text>实际执行人员</text><strong>{{ appointment.performedByName }}</strong></view>
        <view v-if="appointment.assignedStaffName" class="row"><text>接待人员</text><strong>{{ appointment.assignedStaffName }}</strong></view>
      </view>
      <view v-if="appointment.patientNote || appointment.cancelReason" class="card"><text class="card__title">补充信息</text><text class="text">{{ appointment.cancelReason || appointment.patientNote }}</text></view>
      <view v-if="appointment.proposedStartAt && ['pending', 'confirmed', 'cancelled'].includes(appointment.status)" class="card"><text class="card__title">机构建议改约</text><text class="text">新时间：{{ formatDateTime(appointment.proposedStartAt) }}
原因：{{ appointment.proposalReason }}
确认截止：{{ formatDateTime(appointment.proposalExpiresAt!) }}</text><button v-if="new Date(appointment.proposalExpiresAt!).getTime() > Date.now()" class="back" @tap="acceptReschedule">接受新时间</button><text v-else class="text">建议已过期，请联系机构重新协调。</text><text class="text">{{ appointment.status === 'cancelled' ? '原预约已取消，请勿按原时间到场。' : '确认前原预约安排继续保留。' }}</text></view>
      <view v-if="appointment.correctionStatus !== 'none'" class="card"><text class="card__title">原记录已修正</text><text class="text">{{ appointment.correctionReason }}。原核销记录保留，次数已按处理方案调整。</text></view>
      <button v-if="appointment.status === 'completed'" class="cancel" @tap="goDispute">反馈记录问题／查看异议</button>
      <button v-if="canCancel" class="cancel" @tap="cancel">取消预约</button>
      <button class="back" @tap="goPlan">返回服务详情</button>
      <ServiceSupport title="预约咨询" :path="`/pages/services/appointment-detail?id=${appointment.id}`" :session-from="`service_appointment-detail_${appointment.id}`" :information="`预约编号：${appointment.id}\n当前状态：${statusText}`" />
    </template>
    <view v-else class="state">预约详情加载失败</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ServiceSupport from '@/components/business/ServiceSupport.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceAppointment } from '@/api/modules/service-program'

const id = ref(0)
const appointment = ref<ServiceAppointment | null>(null)
const loading = ref(true)
const statusText = computed(() => ({ pending: '待机构确认', confirmed: '预约已确认', arrived: '已到场', completed: '服务已完成', refund_pending: '取消待处理', cancelled: '预约已取消', no_show: '未到场' } as Record<string, string>)[appointment.value?.status || ''] || '预约状态待确认')
const nextStepTitle = computed(() => appointment.value?.status === 'pending' ? '等待机构确认' : appointment.value?.status === 'confirmed' ? '请按时到场' : statusText.value)
const nextStepDesc = computed(() => appointment.value?.status === 'pending' ? '机构会确认时间与接待安排，请留意状态更新。' : appointment.value?.status === 'confirmed' ? '请提前安排出行，到达后由机构登记到场。' : appointment.value?.status === 'refund_pending' ? '该预约已关联退款申请，当前暂停接待，等待平台处理。' : '预约记录与权益数量已经同步。')
const canCancel = computed(() => appointment.value?.status === 'pending' || (appointment.value?.status === 'confirmed' && new Date(appointment.value.confirmedStartAt || appointment.value.requestedStartAt).getTime() - Date.now() > 24 * 60 * 60 * 1000))
async function load() { loading.value = true; try { appointment.value = await serviceProgramApi.appointment(id.value) } catch { appointment.value = null } finally { loading.value = false } }
async function acceptReschedule() {
  if (!appointment.value) return
  const { confirm } = await uni.showModal({ title: '确认改约', content: '接受后原时段将释放，以新时间安排到场。', confirmText: '确认接受' })
  if (!confirm) return
  try { appointment.value = await serviceProgramApi.acceptReschedule(appointment.value.id); uni.showToast({ title: '改约成功', icon: 'success' }) } catch { /* 请求层显示错误 */ }
}
async function cancel() {
  if (!appointment.value) return
  const { confirm } = await uni.showModal({ title: '取消预约', content: '取消后会释放本次占用的服务次数，是否继续？', confirmText: '确认取消', confirmColor: '#d92d20' })
  if (!confirm) return
  appointment.value = await serviceProgramApi.cancelAppointment(appointment.value.id, '患者主动取消')
  uni.showToast({ title: '预约已取消', icon: 'success' })
}
function formatDateTime(value: string) { const date = new Date(value); return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function goDispute() { if (appointment.value) uni.navigateTo({ url: `/pages/services/dispute-detail?appointmentId=${appointment.value.id}` }) }
function goPlan() { if (appointment.value) uni.redirectTo({ url: `/pages/services/detail?id=${appointment.value.planId}` }) }
onLoad((options) => { id.value = Number(options?.id) || 0 })
onShow(() => { void load() })
</script>

<style scoped lang="scss">
.detail { min-height: 100vh; padding: 24rpx 24rpx 60rpx; background: var(--color-bg); }
.state { display: flex; min-height: 65vh; align-items: center; justify-content: center; color: var(--color-text-secondary); }
.hero { padding: 39rpx 32rpx; border-radius: 24rpx; background: linear-gradient(140deg, #12332d, #087c51); color: #fff; }
.hero--cancelled, .hero--no_show { background: linear-gradient(140deg, #454d4a, #6e7773); }
.hero__label { display: block; color: #9df0c3; font-size: 21rpx; font-weight: 750; }
.hero__title { display: block; margin-top: 16rpx; font-size: 37rpx; font-weight: 800; }
.hero__desc { display: block; margin-top: 10rpx; color: rgba(255,255,255,.72); font-size: 23rpx; line-height: 36rpx; }
.card { margin-top: 20rpx; padding: 12rpx 28rpx; border-radius: 21rpx; background: #fff; box-shadow: var(--shadow-sm); }
.card__title { display: block; padding: 22rpx 0 13rpx; color: var(--color-text); font-size: 28rpx; font-weight: 750; }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 28rpx; padding: 21rpx 0; border-bottom: 1rpx solid var(--color-border); color: var(--color-text-secondary); font-size: 23rpx; }
.row:last-child { border-bottom: 0; }
.row strong { max-width: 68%; color: var(--color-text); font-weight: 650; text-align: right; }
.text { display: block; padding-bottom: 24rpx; color: var(--color-text-secondary); font-size: 23rpx; line-height: 36rpx; }
.cancel, .back { width: 100%; height: 86rpx; margin: 28rpx 0 0; border-radius: 999rpx; font-size: 27rpx; font-weight: 700; }
.cancel { border: 1rpx solid #f1c0bb; background: #fff; color: #c43c30; }
.back { margin-top: 16rpx; background: var(--color-primary); color: #fff; }
</style>
