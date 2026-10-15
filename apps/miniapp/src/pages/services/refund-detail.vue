<template>
  <view class="detail">
    <view v-if="loading" class="state">退款详情加载中...</view>
    <template v-else-if="refund">
      <view class="hero" :class="`hero--${refund.status}`"><text class="hero__status">{{ statusText }}</text><text class="hero__amount">¥{{ (refund.requestedAmountFen / 100).toFixed(2) }}</text><text class="hero__desc">{{ statusDescription }}</text></view>
      <view class="card"><text class="card__title">退款内容</text><view v-for="item in refund.items" :key="item.id" class="item"><view><text class="item__name">{{ item.entitlement.orderItem.itemName }}</text><text class="item__count">退款 {{ item.quantity }} 次</text></view><strong>¥{{ (item.amountFen / 100).toFixed(2) }}</strong></view></view>
      <view class="card"><text class="card__title">申请信息</text><view class="row"><text>退款编号</text><strong>{{ refund.refundNo }}</strong></view><view class="row"><text>申请原因</text><strong>{{ refund.reason }}</strong></view><view class="row"><text>申请时间</text><strong>{{ formatDateTime(refund.createdAt) }}</strong></view><view v-if="refund.adminNote" class="row"><text>审核说明</text><strong>{{ refund.adminNote }}</strong></view></view>
      <view v-if="refund.events.length" class="card"><text class="card__title">处理进度</text><view v-for="event in [...refund.events].reverse()" :key="event.id" class="event"><view class="event__dot" /><view><text class="event__title">{{ eventText(event.eventType) }}</text><text class="event__desc">{{ event.detail }}</text><text class="event__time">{{ formatDateTime(event.createdAt) }}</text></view></view></view>
      <button v-if="refund.status === 'pending'" class="withdraw" @tap="withdraw">撤回退款申请</button>
      <button class="refresh" @tap="load">刷新状态</button>
      <ServiceSupport title="服务退款咨询" :path="`/pages/services/refund-detail?id=${refund.id}`" :session-from="`service_refund-detail_${refund.id}`" :information="`退款编号：${refund.id}\n当前状态：${statusText}`" />
    </template>
    <view v-else class="state">退款详情加载失败</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ServiceSupport from '@/components/business/ServiceSupport.vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceRefund } from '@/api/modules/service-program'
const id = ref(0)
const refund = ref<ServiceRefund | null>(null)
const loading = ref(true)
const statusText = computed(() => ({ pending: '等待平台审核', processing: '微信退款处理中', success: '退款成功', rejected: '申请未通过', withdrawn: '申请已撤回' } as Record<string, string>)[refund.value?.status || ''] || '状态确认中')
const statusDescription = computed(() => refund.value?.status === 'success' ? (refund.value.requestedAmountFen === 0 ? '零元商品权益已终结，无资金退回。' : '退款已经原路退回，到账时间以微信支付账单为准。') : refund.value?.status === 'processing' ? '平台已批准并提交微信处理，无需重复申请。' : refund.value?.status === 'pending' ? (refund.value.items.some(item => item.compensation) ? '例外退费等待财务审核，原服务记录保留。' : '相关权益已冻结，审核完成后状态会更新。') : refund.value?.items.some(item => item.compensation) ? '本次退费未完成，异议继续协调，原服务记录未改变。' : '对应权益已经解除冻结，可返回服务详情查看。')
async function load() { loading.value = true; try { refund.value = await serviceProgramApi.refund(id.value) } catch { refund.value = null } finally { loading.value = false; uni.stopPullDownRefresh() } }
async function withdraw() { if (!refund.value) return; const { confirm } = await uni.showModal({ title: '撤回退款申请', content: '撤回后，未过期的服务次数会恢复可预约。', confirmText: '确认撤回' }); if (!confirm) return; refund.value = await serviceProgramApi.withdrawRefund(refund.value.id); uni.showToast({ title: '申请已撤回', icon: 'success' }) }
function eventText(type: string) { return ({ request_submitted: '已提交申请', approved: '平台已批准', rejected: '平台未批准', withdrawn: '申请已撤回', provider_result_unknown: '等待渠道确认', provider_query: '已查询微信结果', provider_success: '退款成功', dispute_compensation: '例外退费待财务审核', zero_amount_completed: '零元商品权益已终结' } as Record<string, string>)[type] || '状态已更新' }
function formatDateTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
onLoad((options) => { id.value = Number(options?.id) || 0; void load() })
onPullDownRefresh(() => { void load() })
</script>

<style scoped lang="scss">
.detail { min-height: 100vh; padding: 24rpx 24rpx 60rpx; background: var(--color-bg); }
.state { display: flex; min-height: 65vh; align-items: center; justify-content: center; color: var(--color-text-secondary); }
.hero { padding: 38rpx 32rpx; border-radius: 24rpx; background: linear-gradient(140deg, #12332d, #087c51); color: #fff; }
.hero--rejected, .hero--withdrawn { background: linear-gradient(140deg, #4b5350, #717a76); }
.hero__status { display: block; color: #9df0c3; font-size: 22rpx; font-weight: 750; }
.hero__amount { display: block; margin-top: 15rpx; font-size: 46rpx; font-weight: 800; }
.hero__desc { display: block; margin-top: 10rpx; color: rgba(255,255,255,.72); font-size: 22rpx; line-height: 35rpx; }
.card { margin-top: 20rpx; padding: 12rpx 27rpx; border-radius: 21rpx; background: #fff; box-shadow: var(--shadow-sm); }
.card__title { display: block; padding: 21rpx 0 12rpx; color: var(--color-text); font-size: 27rpx; font-weight: 750; }
.item, .row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24rpx; padding: 21rpx 0; border-bottom: 1rpx solid var(--color-border); }
.item:last-child, .row:last-child { border-bottom: 0; }
.item__name { display: block; color: var(--color-text); font-size: 25rpx; font-weight: 700; }
.item__count { display: block; margin-top: 5rpx; color: var(--color-text-secondary); font-size: 21rpx; }
.item strong { color: #c2412d; font-size: 25rpx; }
.row { color: var(--color-text-secondary); font-size: 22rpx; }
.row strong { max-width: 70%; color: var(--color-text); font-weight: 600; text-align: right; word-break: break-all; }
.event { position: relative; display: grid; grid-template-columns: 24rpx 1fr; gap: 12rpx; padding: 17rpx 0; }
.event__dot { width: 13rpx; height: 13rpx; margin-top: 9rpx; border-radius: 50%; background: var(--color-primary); }
.event__title { display: block; color: var(--color-text); font-size: 24rpx; font-weight: 700; }
.event__desc, .event__time { display: block; margin-top: 5rpx; color: var(--color-text-secondary); font-size: 20rpx; line-height: 31rpx; }
.event__time { color: var(--color-text-tertiary); }
.withdraw, .refresh { width: 100%; height: 86rpx; margin: 25rpx 0 0; border-radius: 999rpx; font-size: 27rpx; font-weight: 700; }
.withdraw { border: 1rpx solid #f1c0bb; background: #fff; color: #c43c30; }
.refresh { margin-top: 15rpx; background: var(--color-primary); color: #fff; }
</style>
