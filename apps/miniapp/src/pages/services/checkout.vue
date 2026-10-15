<template>
  <view class="checkout">
    <view v-if="offering" class="checkout__content">
      <view class="summary">
        <text class="summary__label">本次购买</text><text class="summary__title">{{ offering.name }}</text>
        <text class="summary__institution">{{ offering.institution.name }}</text>
        <view v-for="item in offering.items" :key="item.id" class="summary__item"><text>{{ item.name }}</text><text>× {{ item.quantity }}</text></view>
      </view>
      <view class="card"><view class="row"><text>服务有效期</text><strong>支付成功后 {{ offering.validityDays }} 天</strong></view><view class="row"><text>购买对象</text><strong>本人使用</strong></view><view class="row"><text>应付金额</text><strong class="amount">{{ priceText }}</strong></view></view>
      <view class="card"><text class="card__title">近期预约</text><text class="rule">{{ offering.earliestStartAt ? new Date(offering.earliestStartAt).toLocaleString('zh-CN', { hour12: false }) : '当前暂无可约时段' }}</text><text class="rule">仅供参考，付款不保留时段，具体预约需机构确认。</text></view>
      <view class="card"><text class="card__title">购买前确认</text><text class="rule">预约须知：{{ offering.appointmentNotice }}</text><text class="rule">退款规则：{{ offering.refundNotice }}</text></view>
      <label class="agreement"><checkbox :checked="agreed" color="#07c160" @tap="agreed = !agreed" /><text>我已阅读并同意预约须知、退款规则，确认服务由本人使用</text></label>
      <view v-if="offering.items.some(item => item.kind === 'goods')" class="card"><text class="card__title">套餐实物交付与退货</text><view v-for="item in offering.items.filter(item => item.kind === 'goods')" :key="item.id"><text class="rule">{{ item.name }} · {{ Object.values(item.goodsSnapshot?.specifications || {}).join(' / ') || '默认规格' }} · {{ item.quantity }} 件</text><text class="rule">分摊金额 ¥{{ (item.allocatedAmountFen / 100).toFixed(2) }} · {{ item.deliveryMethod === 'shipping' ? '物流寄送，付款后完善地址' : '机构现场领取' }}，无需再次付款</text><text class="rule">{{ item.returnNotice }}</text></view></view>
      <view class="tip">付款成功后会生成“我的服务”。支付页面返回不代表最终成功，系统以微信支付确认结果为准。</view>
    </view>
    <view v-else class="state"><text>{{ loadError ? '信息加载失败' : '确认信息加载中...' }}</text><button v-if="loadError" @tap="load">重新加载</button></view>
    <view class="footer"><view><text>合计</text><strong>{{ priceText }}</strong></view><button :disabled="submitting || !agreed" @tap="submit">{{ submitting ? '处理中...' : offering?.priceFen ? '微信支付' : '确认领取' }}</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceOffering } from '@/api/modules/service-program'

const id = ref(0)
const offering = ref<ServiceOffering | null>(null)
const agreed = ref(false)
const loadError = ref(false)
const submitting = ref(false)
const requestId = `service-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const priceText = computed(() => offering.value?.priceFen ? `¥${(offering.value.priceFen / 100).toFixed(2)}` : '免费')

async function submit() {
  if (!offering.value || !agreed.value || submitting.value) return
  submitting.value = true
  try {
    const order = await serviceProgramApi.createOrder({ offeringId: offering.value.id, clientRequestId: requestId })
    if (order.paymentStatus !== 'paid') {
      try { await serviceProgramApi.payOrder(order.id) } catch { uni.showToast({ title: '支付未完成，可在订单中继续支付', icon: 'none' }) }
    }
    uni.redirectTo({ url: `/pages/services/payment-result?id=${order.id}` })
  } catch { /* 业务错误由请求层展示 */ } finally { submitting.value = false }
}
async function load() { loadError.value = false; try { offering.value = await serviceProgramApi.offering(id.value) } catch { loadError.value = true } }
onLoad((options) => { id.value = Number(options?.id) || 0; void load() })
</script>

<style scoped lang="scss">
.checkout { min-height: 100vh; padding: 24rpx 24rpx 180rpx; background: var(--color-bg); }
.summary, .card { margin-bottom: 20rpx; padding: 28rpx; border-radius: 20rpx; background: #fff; box-shadow: var(--shadow-sm); }
.summary__label { display: block; color: var(--color-primary); font-size: 21rpx; font-weight: 700; }
.summary__title { display: block; margin-top: 10rpx; color: var(--color-text); font-size: 34rpx; font-weight: 800; }
.summary__institution { display: block; margin: 8rpx 0 20rpx; color: var(--color-text-secondary); font-size: 23rpx; }
.summary__item, .row { display: flex; justify-content: space-between; gap: 20rpx; padding: 17rpx 0; border-top: 1rpx solid var(--color-border); color: var(--color-text-secondary); font-size: 24rpx; }
.row strong { color: var(--color-text); font-weight: 650; }
.row .amount { color: #c2412d; font-size: 29rpx; }
.card__title { display: block; margin-bottom: 14rpx; font-size: 28rpx; font-weight: 750; }
.rule { display: block; margin-top: 10rpx; color: var(--color-text-secondary); font-size: 23rpx; line-height: 36rpx; }
.agreement { display: flex; align-items: flex-start; gap: 12rpx; padding: 10rpx 8rpx; color: var(--color-text-secondary); font-size: 23rpx; line-height: 35rpx; }
.tip { padding: 22rpx 8rpx; color: var(--color-text-tertiary); font-size: 21rpx; line-height: 34rpx; }
.state { padding-top: 240rpx; text-align: center; color: var(--color-text-tertiary); }
.footer { position: fixed; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid var(--color-border); }
.footer > view { display: flex; flex-direction: column; color: var(--color-text-secondary); font-size: 21rpx; }
.footer strong { color: #c2412d; font-size: 34rpx; }
.footer button { width: 280rpx; height: 82rpx; margin: 0; border-radius: 999rpx; background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 700; }
.footer button[disabled] { opacity: .5; }
</style>
