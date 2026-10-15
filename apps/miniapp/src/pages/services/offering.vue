<template>
  <view class="offering">
    <view v-if="loading" class="state">方案加载中...</view>
    <view v-else-if="error" class="state"><text>方案加载失败</text><button @tap="load">重新加载</button></view>
    <template v-else-if="offering">
      <view class="hero">
        <text class="hero__label">SERVICE PROGRAM</text>
        <text class="hero__title">{{ offering.name }}</text>
        <text class="hero__subtitle">{{ offering.subtitle || '由专业机构提供线下服务' }}</text>
        <view class="hero__price-row"><text class="hero__price">{{ priceText }}</text><text>有效期 {{ offering.validityDays }} 天</text></view>
      </view>

      <view class="card institution">
        <view><text class="card__eyebrow">实际服务机构</text><text class="card__title">{{ offering.institution.name }}</text><text class="card__desc">{{ offering.institution.address || '具体地点由机构确认' }}</text></view>
        <text v-if="offering.institution.receptionHours" class="card__desc">接待时间：{{ receptionText(offering.institution.receptionHours) }}</text><text class="institution__mark">机构履约</text>
      </view>

      <view class="card">
        <text class="card__title">方案包含</text>
        <view v-for="item in offering.items" :key="item.id" class="item">
          <view><text class="item__name">{{ item.name }}</text><text v-if="item.description" class="card__desc">{{ item.description }}</text></view>
          <text class="item__count">× {{ item.quantity }}</text>
        </view>
      </view>

      <view v-if="offering.items.some(item => item.kind === 'goods')" class="card"><text class="card__title">套餐实物交付与退货</text><view v-for="item in offering.items.filter(item => item.kind === 'goods')" :key="item.id"><text class="rule">{{ item.name }} · {{ Object.values(item.goodsSnapshot?.specifications || {}).join(' / ') || '默认规格' }} · {{ item.quantity }} 件</text><text class="rule">分摊金额 ¥{{ (item.allocatedAmountFen / 100).toFixed(2) }} · {{ item.deliveryMethod === 'shipping' ? '物流寄送，付款后完善地址' : '机构现场领取' }}，无需再次付款</text><text class="rule">{{ item.returnNotice }}</text></view></view>
      <view v-if="offering.requiresQualification" class="notice notice--qualification">
        <text class="notice__title">购买前需要机构确认</text>
        <text>请先提交咨询并完成机构安排的评估，确认适合后才能购买。</text>
      </view>

      <view class="card"><text class="card__title">近期预约安排</text><text v-if="offering.earliestStartAt" class="card__desc">最早可约：{{ new Date(offering.earliestStartAt).toLocaleString('zh-CN', { hour12: false }) }}</text><text v-else class="card__desc">机构暂未开放时段，暂停新购买，请先咨询。</text><text class="card__desc">日期仅供参考，支付不保留时段，预约需机构确认。</text></view>
      <view class="card rules">
        <view><text class="card__eyebrow">预约须知</text><text class="rules__text">{{ offering.appointmentNotice }}</text></view>
        <view><text class="card__eyebrow">退款规则</text><text class="rules__text">{{ offering.refundNotice }}</text></view>
      </view>

      <view v-if="eligibility" class="notice"><text class="notice__title">{{ eligibility.canBuy ? '当前可购买' : '暂不可购买' }}</text><text>{{ eligibility.canBuy ? '提交订单时将再次核对购买条件与库存。' : eligibility.reason }}</text></view>
      <view v-else-if="eligibilityError" class="notice"><text>购买条件加载失败，请重试</text><button size="mini" @tap="loadEligibility">重试</button></view>
      <view class="disclaimer">具体服务安排由机构评估确认，购买方案不替代专业判断，也不承诺服务效果。</view>
      <view class="footer"><view><text>应付</text><strong>{{ priceText }}</strong></view><button :loading="buying" :disabled="buying" @tap="offering.earliestStartAt ? buy() : consult()">{{ offering.earliestStartAt ? '确认购买' : '咨询机构' }}</button></view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceOffering } from '@/api/modules/service-program'
import { useAuthStore } from '@/stores/modules/auth'
import { setAuthRedirect } from '@/utils/auth'

const id = ref(0)
const offering = ref<ServiceOffering | null>(null)
const loading = ref(false)
const error = ref(false)
const authStore = useAuthStore()
const eligibility = ref<{ canBuy: boolean; reason: string } | null>(null)
const eligibilityError = ref(false)
const buying = ref(false)
async function loadEligibility() {
  if (!authStore.isLogin || !id.value) { eligibility.value = null; return }
  eligibilityError.value = false
  try { eligibility.value = await serviceProgramApi.eligibility(id.value) }
  catch { eligibility.value = null; eligibilityError.value = true }
}

const priceText = computed(() => offering.value?.priceFen ? `¥${(offering.value.priceFen / 100).toFixed(2)}` : '免费')

async function load() {
  if (!id.value) return
  loading.value = true; error.value = false
  try { offering.value = await serviceProgramApi.offering(id.value) } catch { error.value = true } finally { loading.value = false }
}
function receptionText(hours: { weekdays: number[]; startMinute: number; endMinute: number }) { const names = ['日','一','二','三','四','五','六']; const time = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; return hours.weekdays.map(day => `周${names[day]}`).join('、') + ` ${time(hours.startMinute)}—${time(hours.endMinute)}` }
function consult() { if (offering.value) uni.navigateTo({ url: `/pages/products/detail?id=${offering.value.productId}` }) }
async function buy() {
  if (!offering.value || buying.value) return
  const url = `/pages/services/checkout?id=${offering.value.id}`
  if (!authStore.isLogin) { setAuthRedirect(url); uni.navigateTo({ url: '/pages/auth/auth' }); return }
  buying.value = true
  try {
    const result = await serviceProgramApi.eligibility(offering.value.id)
    eligibility.value = result
    if (!result.canBuy) { uni.showModal({ title: '暂不可购买', content: result.reason, showCancel: false }); return }
    uni.navigateTo({ url })
  } catch { /* 请求层显示失败原因，允许重试 */ }
  finally { buying.value = false }
}
onLoad((options) => { id.value = Number(options?.id) || 0 })
onShow(() => { if (id.value) { void load(); void loadEligibility() } })

</script>

<style scoped lang="scss">
.offering { min-height: 100vh; padding: 24rpx 24rpx 180rpx; background: var(--color-bg); }
.state { display: flex; min-height: 60vh; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; color: var(--color-text-secondary); }
.state button { margin: 0; padding: 0 36rpx; background: var(--color-primary); color: #fff; font-size: 25rpx; }
.hero { padding: 40rpx 34rpx; border-radius: 26rpx; background: linear-gradient(140deg, #12332d, #087c51); color: #fff; box-shadow: 0 18rpx 42rpx rgba(8,90,62,.2); }
.hero__label { display: block; color: #8ef0bf; font-size: 19rpx; font-weight: 800; letter-spacing: 4rpx; }
.hero__title { display: block; margin-top: 18rpx; font-size: 42rpx; font-weight: 800; }
.hero__subtitle { display: block; margin-top: 12rpx; color: rgba(255,255,255,.72); font-size: 24rpx; line-height: 36rpx; }
.hero__price-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: 34rpx; color: rgba(255,255,255,.68); font-size: 22rpx; }
.hero__price { color: #fff; font-size: 40rpx; font-weight: 800; }
.card { margin-top: 20rpx; padding: 28rpx; border-radius: 20rpx; background: #fff; box-shadow: var(--shadow-sm); }
.card__eyebrow { display: block; margin-bottom: 8rpx; color: var(--color-text-tertiary); font-size: 21rpx; }
.card__title { display: block; color: var(--color-text); font-size: 29rpx; font-weight: 750; }
.card__desc { display: block; margin-top: 7rpx; color: var(--color-text-secondary); font-size: 23rpx; line-height: 34rpx; }
.institution { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.institution__mark { flex: 0 0 auto; padding: 8rpx 14rpx; border-radius: 999rpx; background: var(--color-primary-soft); color: var(--color-primary); font-size: 21rpx; }
.item { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; padding: 24rpx 0; border-bottom: 1rpx solid var(--color-border); }
.item:last-child { border-bottom: 0; padding-bottom: 0; }
.item__name { display: block; color: var(--color-text); font-size: 27rpx; font-weight: 700; }
.item__count { color: var(--color-primary); font-size: 27rpx; font-weight: 800; }
.notice { margin-top: 20rpx; padding: 24rpx 28rpx; border: 1rpx solid #f2d59b; border-radius: 18rpx; background: #fff9ed; color: #805c18; font-size: 23rpx; line-height: 36rpx; }
.notice__title { display: block; margin-bottom: 6rpx; color: #6f4c08; font-weight: 800; }
.rules { display: flex; flex-direction: column; gap: 28rpx; }
.rule { display:block; margin-top:12rpx; color:var(--color-text-secondary); font-size:23rpx; line-height:1.6; }
.rules__text { display: block; color: var(--color-text-secondary); font-size: 24rpx; line-height: 38rpx; white-space: pre-wrap; }
.disclaimer { padding: 24rpx 12rpx; color: var(--color-text-tertiary); font-size: 21rpx; line-height: 34rpx; }
.footer { position: fixed; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid var(--color-border); }
.footer > view { display: flex; flex-direction: column; gap: 3rpx; color: var(--color-text-secondary); font-size: 21rpx; }
.footer strong { color: #c2412d; font-size: 34rpx; }
.footer button { width: 280rpx; height: 82rpx; margin: 0; border-radius: 999rpx; background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 700; box-shadow: var(--shadow-action); }
</style>
