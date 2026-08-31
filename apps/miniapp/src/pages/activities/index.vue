<template>
  <view class="activities">
    <view class="activities__head">
      <text class="activities__eyebrow">活动参与</text>
      <text class="activities__title">{{ currentModule?.name || '精选' }}活动</text>
      <text class="activities__subtitle">通过活动了解服务，再决定是否进一步咨询</text>
    </view>

    <view class="activities__filters">
      <text
        v-for="item in statusTabs"
        :key="item.value"
        class="activities__filter"
        :class="{ active: statusScope === item.value }"
        @tap="changeStatus(item.value)"
      >
        {{ item.label }}
      </text>
    </view>

    <view v-if="loading" class="activities__state">活动加载中</view>
    <view v-else-if="loadError" class="activities__state">
      <text>活动加载失败</text>
      <view class="activities__retry" @tap="loadActivities">重新加载</view>
    </view>
    <view v-else-if="!activities.length" class="activities__state">暂无活动</view>

    <view v-else class="activities__list">
      <view v-for="item in activities" :key="item.id" class="activity-card" @tap="goDetail(item.id)">
        <image v-if="item.coverUrl" :src="item.coverUrl" class="activity-card__cover" mode="aspectFill" />
        <view v-else class="activity-card__cover activity-card__cover--empty">
          <text>{{ item.module.name }}</text>
        </view>
        <view class="activity-card__body">
          <view class="activity-card__meta">
            <text>{{ item.module.name }}</text>
            <text>{{ activityTypeText(item.activityType) }}</text>
          </view>
          <text class="activity-card__title">{{ item.title }}</text>
          <text class="activity-card__desc">{{ item.subtitle || item.targetUserText }}</text>
          <view class="activity-card__info">
            <text>{{ formatDate(item.startAt) }}</text>
            <text>{{ activityRegistrationStateText(item.registrationStatus) }}</text>
          </view>
          <view class="activity-card__foot">
            <text>已报名 {{ item.registeredCount }}{{ item.capacity ? `/${item.capacity}` : '' }}</text>
            <text>{{ item.locationText || '线上参与' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { activityApi, activityRegistrationStateText, activityTypeText, type Activity } from '@/api/modules/activity'
import { productApi, type ProductModule } from '@/api/modules/product'

type StatusScope = 'registering' | 'upcoming' | 'ended'

const activities = ref<Activity[]>([])
const currentModule = ref<ProductModule | null>(null)
const loading = ref(false)
const loadError = ref(false)
const moduleCode = ref('')
const statusScope = ref<StatusScope>('registering')
const statusTabs: Array<{ label: string; value: StatusScope }> = [
  { label: '报名中', value: 'registering' },
  { label: '即将开始', value: 'upcoming' },
  { label: '已结束', value: 'ended' },
]

async function loadModule() {
  if (!moduleCode.value) {
    currentModule.value = null
    return
  }
  try {
    const modules = await productApi.modules()
    currentModule.value = modules.find((item) => item.code === moduleCode.value) || null
  } catch {
    currentModule.value = null
  }
}

async function loadActivities() {
  loading.value = true
  loadError.value = false
  try {
    activities.value = (await activityApi.list({
      moduleCode: moduleCode.value || undefined,
      statusScope: statusScope.value,
      page: 1,
      pageSize: 20,
    })).list
  } catch {
    activities.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function changeStatus(value: StatusScope) {
  statusScope.value = value
  loadActivities()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/activities/detail?id=${id}` })
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onLoad((options) => {
  moduleCode.value = String(options?.moduleCode || '')
})

onShow(async () => {
  await loadModule()
  await loadActivities()
})
</script>

<style lang="scss" scoped>
.activities {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 28rpx;
  padding-bottom: 60rpx;

  &__head {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    margin-bottom: 24rpx;
  }

  &__eyebrow {
    color: var(--color-primary);
    font-size: 24rpx;
    font-weight: 700;
  }

  &__title {
    color: var(--color-text);
    font-size: 42rpx;
    font-weight: 800;
    line-height: 54rpx;
  }

  &__subtitle {
    color: var(--color-text-secondary);
    font-size: 25rpx;
    line-height: 38rpx;
  }

  &__filters {
    display: flex;
    gap: 14rpx;
    margin-bottom: 24rpx;
  }

  &__filter {
    height: 60rpx;
    padding: 0 24rpx;
    border-radius: 30rpx;
    background: #fff;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 60rpx;

    &.active {
      background: var(--color-primary);
      color: #fff;
      font-weight: 700;
    }
  }

  &__state {
    padding: 96rpx 24rpx;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    text-align: center;
  }

  &__retry {
    display: inline-flex;
    margin-top: 18rpx;
    color: var(--color-primary);
    font-weight: 700;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 22rpx;
  }
}

.activity-card {
  overflow: hidden;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, .06);

  &__cover {
    width: 100%;
    height: 260rpx;
    background: #e9eef3;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      font-size: 30rpx;
      font-weight: 700;
    }
  }

  &__body {
    padding: 24rpx;
  }

  &__meta,
  &__info,
  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    line-height: 32rpx;
  }

  &__title {
    display: block;
    margin-top: 12rpx;
    color: var(--color-text);
    font-size: 32rpx;
    font-weight: 800;
    line-height: 44rpx;
  }

  &__desc {
    display: block;
    margin-top: 8rpx;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 38rpx;
  }

  &__info {
    margin-top: 18rpx;
    color: var(--color-primary);
    font-weight: 700;
  }

  &__foot {
    margin-top: 12rpx;
  }
}
</style>
