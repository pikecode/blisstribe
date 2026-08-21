<template>
  <view class="partner-dashboard">
    <view v-if="loading" class="partner-dashboard__empty">加载中...</view>

    <view v-else-if="!partner" class="partner-dashboard__empty">
      <text class="partner-dashboard__empty-title">还不是经营伙伴</text>
      <text class="partner-dashboard__empty-desc">提交入驻申请，审核通过后即可邀请客户并查看经营数据。</text>
      <view class="partner-dashboard__primary" @tap="goApply">申请入驻</view>
    </view>

    <view v-else>
      <view class="partner-dashboard__header">
        <text class="partner-dashboard__name">{{ partner.displayName }}</text>
        <text class="partner-dashboard__status" :class="`s-${partner.status}`">{{ statusText }}</text>
        <text class="partner-dashboard__no">编号 {{ partner.partnerNo }}</text>
      </view>

      <view v-if="partner.status !== PartnerStatus.ACTIVE" class="partner-dashboard__notice">
        <text>{{ statusNotice }}</text>
        <view v-if="partner.status === PartnerStatus.REJECTED" class="partner-dashboard__link-btn" @tap="goApply">修改后重新提交</view>
      </view>

      <view class="partner-dashboard__metrics">
        <view class="partner-dashboard__metric">
          <text class="partner-dashboard__metric-value">--</text>
          <text class="partner-dashboard__metric-label">今日访问</text>
        </view>
        <view class="partner-dashboard__metric">
          <text class="partner-dashboard__metric-value">--</text>
          <text class="partner-dashboard__metric-label">客户数</text>
        </view>
        <view class="partner-dashboard__metric">
          <text class="partner-dashboard__metric-value">--</text>
          <text class="partner-dashboard__metric-label">预计收益</text>
        </view>
      </view>

      <view class="partner-dashboard__actions">
        <view class="partner-dashboard__action" @tap="goInvite">
          <text>邀请客户</text>
          <text>›</text>
        </view>
        <view class="partner-dashboard__action" @tap="goCustomers">
          <text>我的客户</text>
          <text>›</text>
        </view>
        <view class="partner-dashboard__action" @tap="goApply">
          <text>主体资料</text>
          <text>›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { partnerApi } from '@/api/modules/partner'
import type { Partner } from '@blisstribe/shared'

const PartnerStatus = {
  PENDING: 0,
  ACTIVE: 1,
  REJECTED: 2,
  FROZEN: 3,
  DISABLED: 4,
} as const

const loading = ref(true)
const partner = ref<Partner | null>(null)

const statusText = computed(() => {
  if (!partner.value) return ''
  const map: Record<number, string> = {
    [PartnerStatus.PENDING]: '待审核',
    [PartnerStatus.ACTIVE]: '正常',
    [PartnerStatus.REJECTED]: '已拒绝',
    [PartnerStatus.FROZEN]: '已冻结',
    [PartnerStatus.DISABLED]: '已停用',
  }
  return map[partner.value.status] || '未知'
})

const statusNotice = computed(() => {
  if (!partner.value) return ''
  if (partner.value.status === PartnerStatus.PENDING) return '平台正在审核你的入驻资料，审核通过后将开通邀请能力。'
  if (partner.value.status === PartnerStatus.REJECTED) return partner.value.auditReason || '入驻申请未通过，请修改资料后重新提交。'
  if (partner.value.status === PartnerStatus.FROZEN) return '当前主体已被冻结，邀请和收益能力暂不可用。'
  if (partner.value.status === PartnerStatus.DISABLED) return '当前主体已停用。'
  return ''
})

async function load(): Promise<void> {
  loading.value = true
  try {
    partner.value = await partnerApi.getMine()
  } finally {
    loading.value = false
  }
}

function goApply() { uni.navigateTo({ url: '/pages/partner/apply' }) }
function goInvite() { uni.navigateTo({ url: '/pages/partner/invite' }) }
function goCustomers() { uni.navigateTo({ url: '/pages/partner/customers' }) }

onShow(load)
</script>

<style lang="scss" scoped>
.partner-dashboard {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 32rpx;

  &__empty {
    min-height: 520rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20rpx;
    color: var(--color-text-tertiary);
  }
  &__empty-title { font-size: 36rpx; color: var(--color-text); font-weight: 700; }
  &__empty-desc { width: 520rpx; text-align: center; line-height: 1.6; font-size: 26rpx; }

  &__primary {
    margin-top: 20rpx;
    width: 360rpx;
    height: 80rpx;
    border-radius: 16rpx;
    background: var(--color-primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__header {
    background: #fff;
    border-radius: 16rpx;
    padding: 32rpx;
    margin-bottom: 20rpx;
  }
  &__name { display: block; font-size: 40rpx; font-weight: 700; color: var(--color-text); }
  &__status {
    display: inline-flex;
    margin-top: 16rpx;
    padding: 8rpx 18rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    background: #f5f5f5;
    color: #666;
    &.s-1 { background: rgba(7, 193, 96, 0.1); color: var(--color-primary); }
    &.s-2, &.s-3 { background: rgba(250, 81, 81, 0.1); color: var(--color-danger); }
  }
  &__no { display: block; margin-top: 12rpx; font-size: 24rpx; color: var(--color-text-tertiary); }

  &__notice {
    background: #fff8e6;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    font-size: 26rpx;
    line-height: 1.5;
    color: #8a5a00;
  }
  &__link-btn { margin-top: 12rpx; color: var(--color-primary); }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16rpx;
    margin-bottom: 20rpx;
  }
  &__metric {
    background: #fff;
    border-radius: 16rpx;
    padding: 28rpx 12rpx;
    text-align: center;
  }
  &__metric-value { display: block; font-size: 36rpx; font-weight: 700; color: var(--color-text); }
  &__metric-label { display: block; margin-top: 8rpx; font-size: 24rpx; color: var(--color-text-tertiary); }

  &__actions {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
  }
  &__action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    border-bottom: 1rpx solid #f1f1f1;
    font-size: 30rpx;
    &:last-child { border-bottom: none; }
  }
}
</style>
