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
  padding: 0 24rpx 40rpx;

  &__head {
    margin: 0 -24rpx 32rpx;
    padding: 48rpx 32rpx 36rpx;
    background: linear-gradient(135deg, #ffffff 0%, #f8fbf9 100%);
    border-bottom: 1rpx solid var(--color-border);
  }

  &__eyebrow {
    display: block;
    color: var(--color-primary);
    font-size: 22rpx;
    font-weight: 700;
    letter-spacing: 0.5rpx;
    line-height: 30rpx;
    margin-bottom: 12rpx;
    text-transform: uppercase;
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 44rpx;
    font-weight: 900;
    line-height: 1.2;
    margin-bottom: 12rpx;
    letter-spacing: -0.5rpx;
  }

  &__subtitle {
    display: block;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    line-height: 1.6;
    max-width: 80%;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
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
  padding: 24rpx;
  background: var(--color-bg-white);
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
    margin-bottom: 20rpx;
    padding-bottom: 18rpx;
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
  }

  &__product {
    display: flex;
    align-items: center;
    gap: 14rpx;
    flex: 1;
    min-width: 0;
  }

  &__cover {
    width: 80rpx;
    height: 60rpx;
    border-radius: 10rpx;
    background: linear-gradient(135deg, #f0f4f8 0%, #e9eef3 100%);
    flex-shrink: 0;
    overflow: hidden;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-tertiary);
      font-size: 19rpx;
      font-weight: 600;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 26rpx;
    font-weight: 700;
    line-height: 1.32;
    margin-bottom: 4rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 20rpx;
    line-height: 1.4;
  }

  &__status {
    flex-shrink: 0;
    padding: 6rpx 12rpx;
    border-radius: 18rpx;
    background: var(--color-bg-gray);
    color: var(--color-text-secondary);
    font-size: 20rpx;
    font-weight: 600;
    white-space: nowrap;

    &--new {
      background: #eff6ff;
      color: #0084ff;
    }

    &--contacted {
      background: #f0f7ff;
      color: #0066cc;
    }

    &--qualified {
      background: #e6fcf5;
      color: #07c160;
    }

    &--converted {
      background: #d4f5e9;
      color: #00b96b;
    }

    &--invalid {
      background: #ffe6e6;
      color: #d92d20;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-bottom: 18rpx;
  }

  &__tag {
    padding: 5rpx 11rpx;
    border-radius: 16rpx;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 20rpx;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  &__row {
    margin-bottom: 14rpx;
    display: flex;
    align-items: flex-start;
    gap: 12rpx;

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  &__label {
    flex-shrink: 0;
    color: var(--color-text-tertiary);
    font-size: 20rpx;
    font-weight: 600;
    min-width: 56rpx;
    line-height: 1.4;
  }

  &__value {
    flex: 1;
    color: var(--color-text);
    font-size: 22rpx;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__timeline {
    margin-top: 16rpx;
    padding-top: 14rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.06);
  }

  &__follow {
    position: relative;
    padding-left: 18rpx;
    margin-bottom: 12rpx;

    &::before {
      content: '';
      position: absolute;
      left: 2rpx;
      top: 7rpx;
      width: 6rpx;
      height: 6rpx;
      border-radius: 50%;
      background: var(--color-primary);
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__follow-time {
    display: block;
    color: var(--color-text-tertiary);
    font-size: 19rpx;
    margin-bottom: 2rpx;
  }

  &__follow-text {
    display: block;
    color: var(--color-text);
    font-size: 22rpx;
    font-weight: 600;
  }

  &__follow-note {
    display: block;
    margin-top: 3rpx;
    color: var(--color-text-secondary);
    font-size: 20rpx;
    line-height: 1.4;
  }
}
</style>
