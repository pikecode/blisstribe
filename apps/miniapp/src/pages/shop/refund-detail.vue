<template>
  <view class="refund-detail">
    <view class="refund-detail__container">
      <!-- Header -->
      <view class="refund-detail__header">
        <text class="refund-detail__title">退款详情</text>
      </view>

      <!-- Refund Info -->
      <view v-if="refund" class="refund-detail__content">
        <!-- Status Card -->
        <view class="refund-detail__section">
          <refund-status :status="refund.status" :rejection-reason="refund.rejectionReason" />
        </view>

        <!-- Amount & Order Info -->
        <view class="refund-detail__section">
          <view class="refund-detail__section-heading">
            <text class="refund-detail__section-title">{{ refund.approvedAmountFen != null ? '批准退款金额' : '申请退款金额' }}</text>
            <button class="refund-detail__refresh-btn" :loading="loading" :disabled="loading" @tap="loadRefund">刷新</button>
          </view>
          <view v-if="loadError" class="refund-detail__refresh-error">
            <text>{{ loadError }}，当前显示上次加载的信息</text>
            <button class="refund-detail__refresh-btn" :disabled="loading" @tap="loadRefund">重试</button>
          </view>
          <view class="refund-detail__amount-box">
            <text class="refund-detail__amount">¥{{ formatAmount(refund.approvedAmountFen ?? refund.requestedAmountFen) }}</text>
          </view>

          <text class="refund-detail__section-title" style="margin-top: 24rpx">订单信息</text>
          <view class="refund-detail__info-item">
            <text class="refund-detail__label">{{ orderNo ? '订单号' : '订单编号' }}</text>
            <text class="refund-detail__value">{{ orderNo || refund.orderId }}</text>
          </view>
          <view class="refund-detail__info-item">
            <text class="refund-detail__label">退款编号</text>
            <text class="refund-detail__value">{{ refund.id }}</text>
          </view>
          <view v-if="refund.approvedAmountFen != null && refund.approvedAmountFen !== refund.requestedAmountFen" class="refund-detail__info-item">
            <text class="refund-detail__label">申请金额</text>
            <text class="refund-detail__value">¥{{ formatAmount(refund.requestedAmountFen) }}</text>
          </view>
          <view class="refund-detail__info-item">
            <text class="refund-detail__label">申请时间</text>
            <text class="refund-detail__value">{{ formatDateTime(refund.createdAt) }}</text>
          </view>
          <view class="refund-detail__info-item">
            <text class="refund-detail__label">申请原因</text>
            <text class="refund-detail__value">{{ refund.reason || '无' }}</text>
          </view>
          <view v-if="refund.wechatRefundId" class="refund-detail__info-item">
            <text class="refund-detail__label">退款单号</text>
            <text class="refund-detail__value">{{ refund.wechatRefundId }}</text>
          </view>
          <view v-if="refund.status === 'success' && refund.completedAt" class="refund-detail__info-item">
            <text class="refund-detail__label">退款成功时间</text>
            <text class="refund-detail__value">{{ formatDateTime(refund.completedAt) }}</text>
          </view>
        </view>

        <!-- Timeline -->
        <view class="refund-detail__section">
          <text class="refund-detail__section-title">处理进度</text>
          <view class="refund-detail__timeline">
            <view v-for="(step, index) in timeline" :key="index" class="refund-detail__timeline-item" :class="step.tone">
              <view class="refund-detail__timeline-dot"></view>
              <text class="refund-detail__timeline-label">{{ step.label }}</text>
              <text v-if="step.detail" class="refund-detail__timeline-time">{{ step.detail }}</text>
            </view>
          </view>
        </view>

        <view class="refund-detail__tips">
          <text class="refund-detail__tips-title">{{ statusText }}</text>
          <text class="refund-detail__tips-item">{{ statusTip }}</text>
        </view>

        <!-- 客服咨询 -->
        <view class="refund-detail__section refund-detail__support">
          <text class="refund-detail__section-title">需要帮助？</text>
          <text class="refund-detail__support-hint">进入会话后，可发送退款详情卡片方便客服核查。暂未回复时请留言。</text>
          <button
            class="refund-detail__contact-btn"
            open-type="contact"
            :session-from="`refund_${refund.id}`"
            :show-message-card="true"
            :send-message-title="contactTitle"
            :send-message-path="contactPath"
            send-message-img="/static/logo.png"
            @error="handleContactError"
          >在线客服</button>
          <button class="refund-detail__copy-btn" @tap="copyConsultation">复制咨询信息</button>
          <text class="refund-detail__support-note">客服无法打开时，可复制咨询信息后发送给客服。</text>
        </view>

        <!-- Actions -->
        <view class="refund-detail__actions">
          <view class="refund-detail__action-btn" @tap="goBack">返回</view>
        </view>
      </view>

      <!-- Loading -->
      <view v-else class="refund-detail__loading">
        <text>{{ loading ? '正在加载退款详情…' : loadError || '退款信息暂不可用' }}</text>
        <text v-if="!loading" class="refund-detail__support-note">请检查网络后重试，或返回退款列表。</text>
        <button v-if="!loading && refundId" class="refund-detail__contact-btn" @tap="loadRefund">重新加载</button>
        <button v-if="!loading" class="refund-detail__copy-btn" @tap="goBack">返回退款列表</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { shopApi, type RefundResponse } from '@/api/modules/shop'
import { useAuthStore } from '@/stores/modules/auth'
import RefundStatus from '@/components/business/RefundStatus.vue'

const authStore = useAuthStore()
const refundId = ref('')
const refund = ref<RefundResponse | null>(null)
const orderNo = ref('')
const loading = ref(false)
const loadError = ref('')
const statusText = computed(() => shopApi.getRefundStatusLabel(refund.value?.status || ''))
const statusTip = computed(() => {
  const tips: Record<string, string> = {
    pending: '申请已提交，请等待审核。您可以返回此页或下拉刷新查看进度。',
    approved: '申请已批准，等待提交退款。实际结果以支付渠道返回的信息为准。',
    processing: '退款正在处理中，请查看原支付账户的退款记录，到账时间以支付渠道及银行处理为准。',
    success: '支付渠道已确认退款成功，请在原支付账户核对退款记录。如仍有疑问，可联系在线客服。',
    rejected: '申请未通过审核，请查看拒绝原因。如有疑问，可联系在线客服。',
    failed: '退款暂未成功，请联系在线客服核查处理，避免重复提交。',
    closed: '本次退款已关闭，请联系在线客服确认原因和后续处理方式。',
  }
  return tips[refund.value?.status || ''] || '当前状态暂无法确认，请刷新或联系在线客服核查。'
})
const timeline = computed(() => {
  const data = refund.value
  if (!data) return []
  const steps = [{ label: '申请已提交', detail: formatDateTime(data.createdAt), tone: 'completed' }]
  if (data.status === 'pending') {
    steps.push({ label: '等待审核', detail: '审核结果将在此页更新', tone: 'active' })
  } else if (data.status === 'rejected') {
    steps.push({ label: '审核未通过', detail: data.rejectionReason || '如需了解原因，请联系客服', tone: 'exception' })
  } else if (['approved', 'processing', 'success', 'failed', 'closed'].includes(data.status)) {
    steps.push({ label: '审核已批准', detail: '', tone: 'completed' })
    steps.push({
      label: statusText.value,
      detail: data.status === 'success' && data.completedAt ? formatDateTime(data.completedAt) : statusTip.value,
      tone: ['failed', 'closed'].includes(data.status) ? 'exception' : data.status === 'success' ? 'completed' : 'active',
    })
  } else {
    steps.push({ label: '状态待确认', detail: '请刷新或联系客服核查', tone: 'active' })
  }
  return steps
})
const contactPath = computed(() => `/pages/shop/refund-detail?id=${encodeURIComponent(refund.value?.id || '')}`)
const contactTitle = computed(() => refund.value
  ? `退款咨询 #${refund.value.id} · ¥${formatAmount(refund.value.approvedAmountFen ?? refund.value.requestedAmountFen)} · ${statusText.value}`
  : '退款咨询')

function formatAmount(amountFen: number): string {
  return (amountFen / 100).toFixed(2)
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

async function loadRefund() {
  if (loading.value || !refundId.value) return
  loading.value = true
  loadError.value = ''
  try {
    const data = await shopApi.getRefundDetail(refundId.value)
    refund.value = data
    // 订单号不影响退款信息展示，获取失败时保留订单编号。
    if (!orderNo.value) {
      void shopApi.getOrderDetail(data.orderId).then((order) => {
        if (refund.value?.id === data.id) orderNo.value = order.orderNo
      }).catch(() => {})
    }
  } catch (error) {
    console.error('Failed to load refund:', error)
    loadError.value = '退款详情加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/shop/refund-list' }) })
}

function handleContactError() {
  uni.showToast({ title: '暂时无法打开客服，可复制咨询信息', icon: 'none' })
}

function copyConsultation() {
  const data = refund.value
  if (!data) return
  const lines = [
    '退款咨询',
    orderNo.value ? `订单号：${orderNo.value}` : `订单编号：${data.orderId}`,
    `退款编号：${data.id}`,
    `申请金额：¥${formatAmount(data.requestedAmountFen)}`,
    ...(data.approvedAmountFen != null ? [`批准金额：¥${formatAmount(data.approvedAmountFen)}`] : []),
    `当前状态：${statusText.value}`,
    `申请时间：${formatDateTime(data.createdAt)}`,
    `申请原因：${data.reason || '未填写'}`,
    ...(data.wechatRefundId ? [`微信退款单号：${data.wechatRefundId}`] : []),
  ]
  uni.setClipboardData({
    data: lines.join('\n'),
    success: () => uni.showToast({ title: '咨询信息已复制', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }),
  })
}

onLoad((options) => {
  refundId.value = options?.id || ''
  if (!refundId.value) loadError.value = '缺少退款编号，请从退款列表重新进入'
})

onShow(() => {
  if (!authStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }
  void loadRefund()
})

onPullDownRefresh(async () => {
  try {
    await loadRefund()
  } finally {
    uni.stopPullDownRefresh()
  }
})
</script>

<style lang="scss" scoped>
.refund-detail {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 100rpx;

  &__container {
    padding: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32rpx 0;
    border-bottom: 1rpx solid var(--color-border);
    background: var(--color-bg-white);
  }

  &__title {
    color: var(--color-text);
    font-size: 36rpx;
    font-weight: 700;
  }

  &__content {
    padding: 20rpx;
  }

  &__section {
    background: var(--color-bg-white);
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }

  &__section-title {
    display: block;
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 700;
    margin-bottom: 16rpx;
  }

  &__amount-box {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100rpx;
    border-radius: 12rpx;
    background: var(--color-primary-light);
    border: 2rpx solid var(--color-primary);
  }

  &__amount {
    color: var(--color-primary);
    font-size: 48rpx;
    font-weight: 900;
  }

  &__info-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 14rpx 0;
    border-bottom: 1rpx solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    color: var(--color-text-secondary);
    font-size: 24rpx;
  }

  &__value {
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
    text-align: right;
    max-width: 50%;
    word-break: break-word;
  }

  &__section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
  &__section-heading &__section-title { margin-bottom: 0; }
  &__refresh-btn { margin: 0; padding: 0 16rpx; background: transparent; color: var(--color-primary); font-size: 24rpx; line-height: 56rpx; &::after { border: none; } }
  &__refresh-error { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; color: #b45309; font-size: 22rpx; }

  &__timeline {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__timeline-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    padding-left: 40rpx;

    &::before {
      content: '';
      position: absolute;
      left: 8rpx;
      top: 40rpx;
      width: 2rpx;
      height: calc(100% + 10rpx);
      background: var(--color-border);
    }

    &:last-child {
      &::before {
        display: none;
      }
    }

    &.completed {
      .refund-detail__timeline-dot {
        background: var(--color-primary);
        border-color: var(--color-primary);
      }

      .refund-detail__timeline-label {
        color: var(--color-primary);
        font-weight: 700;
      }
    }
  }

  &__timeline-item.active &__timeline-dot { border-color: var(--color-primary); }
  &__timeline-item.exception &__timeline-dot { border-color: #ef4444; background: #ef4444; }
  &__timeline-item.exception &__timeline-label { color: #b91c1c; }

  &__timeline-dot {
    position: absolute;
    left: 0;
    top: 0;
    width: 18rpx;
    height: 18rpx;
    border-radius: 50%;
    background: var(--color-bg-subtle);
    border: 3rpx solid var(--color-border);
    box-sizing: border-box;
    transition: all 200ms ease;
  }

  &__timeline-label {
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__timeline-time {
    display: block;
    color: var(--color-text-secondary);
    font-size: 22rpx;
    margin-top: 4rpx;
  }

  &__tips {
    background: var(--color-bg-subtle);
    border-radius: 12rpx;
    padding: 16rpx;
    margin-bottom: 16rpx;
    border-left: 3rpx solid var(--color-primary);
  }

  &__tips-title {
    display: block;
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
    margin-bottom: 10rpx;
  }

  &__tips-item {
    display: block;
    color: var(--color-text-secondary);
    font-size: 22rpx;
    line-height: 1.6;
  }

  &__support-hint,
  &__support-note {
    display: block;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 1.6;
  }

  &__support-note { font-size: 22rpx; text-align: center; }

  &__contact-btn,
  &__copy-btn {
    margin: 20rpx 0 0;
    padding: 0 24rpx;
    border-radius: 16rpx;
    height: 84rpx;
    line-height: 84rpx;
    font-size: 28rpx;
    font-weight: 600;
    &::after { border: none; }
  }

  &__contact-btn { background: var(--color-primary); color: #fff; }
  &__copy-btn { background: var(--color-bg-subtle); color: var(--color-text); margin-bottom: 16rpx; }

  &__actions {
    display: flex;
    gap: 12rpx;
    margin-top: 20rpx;
  }

  &__action-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    background: var(--color-bg-gray);
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms ease;

    &:active {
      transform: scale(0.96);
    }

    &--primary {
      background: var(--color-primary);
      color: #fff;
      box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.2);

      &:active {
        box-shadow: 0 4rpx 12rpx rgba(7, 193, 96, 0.15);
      }
    }
  }

  &__loading {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    padding: 32rpx;
    text-align: center;
    align-items: center;
    justify-content: center;
    min-height: 400rpx;
    color: var(--color-text-secondary);
    font-size: 28rpx;
  }
}
</style>
