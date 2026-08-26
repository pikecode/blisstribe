<template>
  <view class="leads">
    <view class="leads__head">
      <text class="leads__eyebrow">咨询进展</text>
      <text class="leads__title">我的服务咨询</text>
      <text class="leads__subtitle">查看已提交需求、服务伙伴和后续跟进记录</text>
    </view>

    <view v-if="loading" class="leads__state">
      <text>正在加载咨询记录</text>
    </view>

    <view v-else-if="loadError" class="leads__state">
      <text>咨询记录加载失败</text>
      <view class="leads__retry" @tap="loadLeads">重新加载</view>
    </view>

    <view v-else-if="leads.length" class="leads__list">
      <view v-for="item in leads" :key="item.id" class="lead-card" @tap="goProduct(item.product.id)">
        <view class="lead-card__head">
          <view class="lead-card__product">
            <image v-if="item.product.coverUrl" :src="item.product.coverUrl" class="lead-card__cover" mode="aspectFill" />
            <view v-else class="lead-card__cover lead-card__cover--empty">
              <text>产品</text>
            </view>
            <view class="lead-card__main">
              <text class="lead-card__title">{{ item.product.title }}</text>
              <text class="lead-card__time">{{ formatDate(item.createdAt) }}</text>
            </view>
          </view>
          <text class="lead-card__status" :class="`lead-card__status--${item.status}`">{{ statusText(item.status) }}</text>
        </view>

        <view v-if="item.needTags.length" class="lead-card__tags">
          <text v-for="tag in item.needTags" :key="tag" class="lead-card__tag">{{ tag }}</text>
        </view>

        <view v-if="assessmentText(item.message)" class="lead-card__row">
          <text class="lead-card__label">需求评估</text>
          <text class="lead-card__value">{{ assessmentText(item.message) }}</text>
        </view>

        <view v-if="userMessage(item.message)" class="lead-card__row">
          <text class="lead-card__label">我的补充</text>
          <text class="lead-card__value">{{ userMessage(item.message) }}</text>
        </view>

        <view v-if="item.partner" class="lead-card__row">
          <text class="lead-card__label">服务伙伴</text>
          <text class="lead-card__value">{{ item.partner.displayName }}</text>
        </view>

        <view v-if="item.followUpNote" class="lead-card__row">
          <text class="lead-card__label">最新跟进</text>
          <text class="lead-card__value">{{ item.followUpNote }}</text>
        </view>

        <view v-if="item.followUps.length" class="lead-card__timeline">
          <view v-for="follow in item.followUps.slice(0, 2)" :key="follow.id" class="lead-card__follow">
            <text class="lead-card__follow-time">{{ formatDate(follow.createdAt) }}</text>
            <text class="lead-card__follow-text">
              {{ followStatusText(follow.fromStatus, follow.toStatus) }}
            </text>
            <text v-if="follow.note" class="lead-card__follow-note">{{ follow.note }}</text>
            <text v-if="follow.nextFollowAt" class="lead-card__follow-note">下次跟进：{{ formatDate(follow.nextFollowAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="leads__state">
      <text>暂无咨询记录</text>
      <view class="leads__retry" @tap="goProducts">去看看推荐</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { productApi, type ProductLead } from '@/api/modules/product'

const leads = ref<ProductLead[]>([])
const loading = ref(false)
const loadError = ref(false)

const statusMap: Record<string, string> = {
  created: '线索创建',
  new: '已提交',
  contacted: '已联系',
  qualified: '有效线索',
  converted: '已转化',
  invalid: '已关闭',
}

function statusText(status: string) {
  return statusMap[status] || status
}

function followStatusText(fromStatus: string, toStatus: string) {
  if (fromStatus === 'created') return statusText(toStatus)
  return `${statusText(fromStatus)}变更为${statusText(toStatus)}`
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

async function loadLeads() {
  loading.value = true
  loadError.value = false
  try {
    const res = await productApi.myLeads({ page: 1, pageSize: 50 })
    leads.value = res.list
  } catch {
    leads.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function goProducts() {
  uni.navigateTo({ url: '/pages/products/index' })
}

function goProduct(id: number) {
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

onShow(loadLeads)
</script>

<style lang="scss" scoped>
.leads {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 0 28rpx 32rpx;

  &__head {
    margin: 0 -28rpx 24rpx;
    padding: 42rpx 32rpx 30rpx;
    background: linear-gradient(180deg, #ffffff 0%, #f6faf7 100%);
    border-bottom: 1rpx solid var(--color-border);
  }

  &__eyebrow {
    display: block;
    color: var(--color-primary);
    font-size: 23rpx;
    font-weight: 700;
    line-height: 32rpx;
    margin-bottom: 8rpx;
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 42rpx;
    font-weight: 800;
    line-height: 1.24;
    margin-bottom: 10rpx;
  }

  &__subtitle {
    display: block;
    color: var(--color-text-secondary);
    font-size: 25rpx;
    line-height: 1.5;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__state {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24rpx;
    color: var(--color-text-tertiary);
    font-size: 28rpx;
  }

  &__retry {
    padding: 14rpx 32rpx;
    border-radius: 32rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 26rpx;
  }
}

.lead-card {
  padding: 28rpx;
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20rpx;
  }

  &__product {
    display: flex;
    align-items: center;
    gap: 18rpx;
    flex: 1;
    min-width: 0;
  }

  &__cover {
    width: 96rpx;
    height: 72rpx;
    border-radius: 12rpx;
    background: #e9eef3;
    flex-shrink: 0;
    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
      font-size: 22rpx;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 30rpx;
    font-weight: 600;
    line-height: 1.35;
  }

  &__time {
    display: block;
    margin-top: 6rpx;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
  }

  &__status {
    flex-shrink: 0;
    padding: 8rpx 16rpx;
    border-radius: 24rpx;
    background: var(--color-bg-gray);
    color: var(--color-text-secondary);
    font-size: 22rpx;
    &--qualified,
    &--converted {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 700;
    }
    &--invalid {
      background: rgba(217, 45, 32, 0.1);
      color: var(--color-danger);
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-top: 22rpx;
  }

  &__tag {
    padding: 6rpx 14rpx;
    border-radius: 20rpx;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 22rpx;
  }

  &__row {
    margin-top: 20rpx;
  }

  &__label {
    display: block;
    margin-bottom: 6rpx;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
  }

  &__value {
    display: block;
    color: #475467;
    font-size: 26rpx;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  &__timeline {
    margin-top: 22rpx;
    padding-top: 18rpx;
    border-top: 1rpx solid var(--color-border);
  }

  &__follow {
    position: relative;
    padding-left: 22rpx;
    margin-bottom: 18rpx;
    border-left: 3rpx solid rgba(7, 193, 96, 0.22);
    &:last-child {
      margin-bottom: 0;
    }
  }

  &__follow-time {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    margin-bottom: 4rpx;
  }

  &__follow-text {
    display: block;
    color: var(--color-text);
    font-size: 24rpx;
    font-weight: 600;
  }

  &__follow-note {
    display: block;
    margin-top: 4rpx;
    color: var(--color-text-secondary);
    font-size: 23rpx;
    line-height: 1.5;
  }
}
</style>
