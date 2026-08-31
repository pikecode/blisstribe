<template>
  <view class="lead-detail">
    <view v-if="loading" class="lead-detail__state">
      <text>正在加载咨询详情</text>
    </view>

    <view v-else-if="loadError" class="lead-detail__state">
      <text>咨询详情加载失败</text>
      <view class="lead-detail__retry" @tap="loadLead">重新加载</view>
    </view>

    <view v-else-if="lead" class="lead-detail__content">
      <view class="lead-detail__summary">
        <image v-if="lead.product.coverUrl" :src="lead.product.coverUrl" class="lead-detail__cover" mode="aspectFill" />
        <view v-else class="lead-detail__cover lead-detail__cover--empty">
          <text>产品</text>
        </view>
        <view class="lead-detail__main">
          <text class="lead-detail__title">{{ lead.product.title }}</text>
          <text class="lead-detail__price">{{ lead.product.priceText || '咨询后确认' }}</text>
          <view class="lead-detail__status" :class="`lead-detail__status--${lead.status}`">{{ statusText(lead.status) }}</view>
        </view>
      </view>

      <view class="lead-detail__panel">
        <view class="lead-detail__panel-head">
          <text class="lead-detail__panel-title">我的需求</text>
          <text class="lead-detail__time">{{ formatDate(lead.createdAt) }}</text>
        </view>
        <view v-if="lead.needTags.length" class="lead-detail__tags">
          <text v-for="tag in lead.needTags" :key="tag" class="lead-detail__tag">{{ tag }}</text>
        </view>
        <view v-if="assessmentText(lead.message)" class="lead-detail__row">
          <text class="lead-detail__label">需求评估</text>
          <text class="lead-detail__value">{{ assessmentText(lead.message) }}</text>
        </view>
        <view v-if="userMessage(lead.message)" class="lead-detail__row">
          <text class="lead-detail__label">我的补充</text>
          <text class="lead-detail__value">{{ userMessage(lead.message) }}</text>
        </view>
        <view v-if="lead.partner" class="lead-detail__row">
          <text class="lead-detail__label">服务伙伴</text>
          <text class="lead-detail__value">{{ lead.partner.displayName }}</text>
        </view>
        <view v-if="lead.nextFollowAt" class="lead-detail__row">
          <text class="lead-detail__label">下次跟进</text>
          <text class="lead-detail__value">{{ formatDate(lead.nextFollowAt) }}</text>
        </view>
      </view>

      <view class="lead-detail__panel lead-detail__panel--timeline">
        <view class="lead-detail__panel-head">
          <text class="lead-detail__panel-title">跟进时间线</text>
          <text class="lead-detail__time">{{ lead.followUps.length }} 条</text>
        </view>
        <view v-if="lead.followUps.length" class="timeline">
          <view v-for="item in lead.followUps" :key="item.id" class="timeline__item">
            <view class="timeline__dot" />
            <view class="timeline__body">
              <view class="timeline__head">
                <text class="timeline__title">{{ followStatusText(item.fromStatus, item.toStatus) }}</text>
                <text class="timeline__operator">{{ operatorText(item.operatorType) }}</text>
              </view>
              <text class="timeline__time">{{ formatDate(item.createdAt) }}</text>
              <text v-if="item.note" class="timeline__note">{{ item.note }}</text>
              <text v-if="item.nextFollowAt" class="timeline__next">下次跟进：{{ formatDate(item.nextFollowAt) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="lead-detail__empty">暂无跟进记录</view>
      </view>

      <view class="lead-detail__actions">
        <view class="lead-detail__ghost" @tap="goProduct">查看产品</view>
        <view v-if="canConfirm" class="lead-detail__primary" :class="{ loading: confirming }" @tap="confirmContact">
          {{ confirming ? '确认中...' : '确认已沟通' }}
        </view>
        <view v-else-if="hasUserConfirmed" class="lead-detail__done">已确认沟通</view>
      </view>
    </view>

    <view v-else class="lead-detail__state">
      <text>咨询记录不存在</text>
      <view class="lead-detail__retry" @tap="goLeads">返回列表</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productApi, type ProductLead } from '@/api/modules/product'

const leadId = ref(0)
const lead = ref<ProductLead | null>(null)
const loading = ref(false)
const loadError = ref(false)
const confirming = ref(false)

const statusMap: Record<string, string> = {
  created: '已创建',
  new: '已提交',
  contacted: '跟进中',
  qualified: '方案确认中',
  converted: '已完成',
  invalid: '已结束',
}

const canConfirm = computed(() => {
  if (!lead.value) return false
  return !['converted', 'invalid'].includes(lead.value.status) && !hasUserConfirmed.value
})
const hasUserConfirmed = computed(() => lead.value?.followUps.some((item) => item.operatorType === 'user') ?? false)

function statusText(status: string) {
  return statusMap[status] || status
}

function followStatusText(fromStatus: string, toStatus: string) {
  if (fromStatus === 'created') return statusText(toStatus)
  if (fromStatus === toStatus) return statusText(toStatus)
  return `进展更新为${statusText(toStatus)}`
}

function operatorText(type: string) {
  if (type === 'user') return '用户确认'
  if (type === 'partner') return '服务伙伴'
  if (type === 'system') return '系统'
  return '运营'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function assessmentText(message: string) {
  const marker = '需求评估：'
  const index = message.indexOf(marker)
  return index >= 0 ? message.slice(index + marker.length).trim() : ''
}

function userMessage(message: string) {
  const marker = '需求评估：'
  const index = message.indexOf(marker)
  if (index > 0) return message.slice(0, index).trim()
  return index < 0 ? message.trim() : ''
}

async function loadLead() {
  if (!leadId.value) return
  loading.value = true
  loadError.value = false
  try {
    lead.value = await productApi.myLeadDetail(leadId.value)
  } catch {
    lead.value = null
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function confirmContact() {
  if (!lead.value || confirming.value || !canConfirm.value) return
  confirming.value = true
  try {
    lead.value = await productApi.confirmLeadContact(lead.value.id)
    uni.showToast({ title: '已确认沟通', icon: 'success' })
  } catch {
    // 请求层已统一提示
  } finally {
    confirming.value = false
  }
}

function goProduct() {
  if (!lead.value) return
  uni.navigateTo({ url: `/pages/products/detail?id=${lead.value.product.id}` })
}

function goLeads() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pages/profile/product-leads' })
}

onLoad((query) => {
  leadId.value = Number(query?.id || 0)
  loadLead()
})
</script>

<style lang="scss">
.lead-detail {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  background: #f4f7f5;

  &__state {
    min-height: 520rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24rpx;
    color: #647067;
    font-size: 28rpx;
  }

  &__retry {
    min-width: 180rpx;
    height: 64rpx;
    padding: 0 28rpx;
    border-radius: 32rpx;
    background: #19c15f;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    font-weight: 600;
  }

  &__summary,
  &__panel {
    border-radius: 18rpx;
    background: #fff;
    box-shadow: 0 8rpx 28rpx rgba(25, 60, 35, 0.08);
  }

  &__summary {
    display: flex;
    gap: 22rpx;
    padding: 24rpx;
  }

  &__cover {
    width: 160rpx;
    height: 160rpx;
    border-radius: 16rpx;
    flex: 0 0 160rpx;
    background: #e8f1ec;
  }

  &__cover--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a9a90;
    font-size: 24rpx;
  }

  &__main {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14rpx;
  }

  &__title {
    color: #17251b;
    font-size: 34rpx;
    font-weight: 700;
    line-height: 1.35;
  }

  &__price {
    color: #5b6a61;
    font-size: 26rpx;
  }

  &__status {
    align-self: flex-start;
    height: 46rpx;
    padding: 0 18rpx;
    border-radius: 23rpx;
    display: flex;
    align-items: center;
    color: #0d8d47;
    background: #ddf8e9;
    font-size: 24rpx;
    font-weight: 700;
  }

  &__status--converted {
    color: #7b4e00;
    background: #fff0c7;
  }

  &__status--invalid {
    color: #7b2931;
    background: #ffe0e4;
  }

  &__panel {
    margin-top: 24rpx;
    padding: 28rpx 24rpx;
  }

  &__panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    margin-bottom: 20rpx;
  }

  &__panel-title {
    color: #17251b;
    font-size: 30rpx;
    font-weight: 700;
  }

  &__time {
    color: #7b887f;
    font-size: 24rpx;
    white-space: nowrap;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 18rpx;
  }

  &__tag {
    padding: 8rpx 16rpx;
    border-radius: 20rpx;
    background: #e7f8ee;
    color: #10a84f;
    font-size: 23rpx;
    font-weight: 600;
  }

  &__row {
    padding: 18rpx 0;
    border-top: 1rpx solid #eef2ef;
  }

  &__label {
    display: block;
    margin-bottom: 8rpx;
    color: #7b887f;
    font-size: 24rpx;
  }

  &__value {
    display: block;
    color: #2d3b32;
    font-size: 27rpx;
    line-height: 1.6;
  }

  &__empty {
    color: #8a9a90;
    font-size: 26rpx;
    padding: 10rpx 0;
  }

  &__actions {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
    display: flex;
    gap: 18rpx;
    background: rgba(244, 247, 245, 0.96);
    backdrop-filter: blur(12rpx);
    border-top: 1rpx solid rgba(30, 60, 40, 0.08);
  }

  &__ghost,
  &__primary,
  &__done {
    height: 84rpx;
    border-radius: 42rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 29rpx;
    font-weight: 700;
  }

  &__ghost {
    flex: 0 0 220rpx;
    color: #1f3326;
    background: #fff;
    border: 1rpx solid #dbe5df;
  }

  &__primary {
    flex: 1;
    color: #fff;
    background: #19c15f;
  }

  &__done {
    flex: 1;
    color: #0d8d47;
    background: #ddf8e9;
  }

  &__primary.loading {
    opacity: 0.72;
  }
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 24rpx;

  &__item {
    display: flex;
    gap: 18rpx;
  }

  &__dot {
    width: 18rpx;
    height: 18rpx;
    margin-top: 12rpx;
    border-radius: 50%;
    background: #19c15f;
    box-shadow: 0 0 0 8rpx #e4f8ec;
    flex: 0 0 18rpx;
  }

  &__body {
    min-width: 0;
    flex: 1;
    padding-bottom: 22rpx;
    border-bottom: 1rpx solid #eef2ef;
  }

  &__item:last-child &__body {
    border-bottom: 0;
    padding-bottom: 0;
  }

  &__head {
    display: flex;
    justify-content: space-between;
    gap: 16rpx;
    align-items: center;
  }

  &__title {
    color: #17251b;
    font-size: 27rpx;
    font-weight: 700;
  }

  &__operator {
    color: #7b887f;
    font-size: 23rpx;
    white-space: nowrap;
  }

  &__time,
  &__note,
  &__next {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    line-height: 1.5;
  }

  &__time {
    color: #8a9a90;
  }

  &__note {
    color: #34453a;
  }

  &__next {
    color: #0d8d47;
  }
}
</style>
