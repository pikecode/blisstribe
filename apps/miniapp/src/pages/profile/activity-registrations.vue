<template>
  <view class="my-activities">
    <view v-if="loading" class="my-activities__state">加载中</view>
    <view v-else-if="!registrations.length" class="my-activities__state">还没有活动报名</view>
    <view v-else class="my-activities__list">
      <view v-for="item in registrations" :key="item.id" class="registration-card" @tap="goDetail(item.activityId)">
        <view class="registration-card__head">
          <text class="registration-card__title">{{ item.activity.title }}</text>
          <text class="registration-card__status">{{ activityRegistrationStatusText(item.status) }}</text>
        </view>
        <text class="registration-card__time">{{ formatDate(item.activity.startAt) }}</text>
        <text class="registration-card__desc">{{ item.activity.locationText || '线上参与' }}</text>
        <view v-if="item.followUpNote" class="registration-card__note">{{ item.followUpNote }}</view>
        <view v-if="canCancel(item)" class="registration-card__cancel" @tap.stop="cancel(item)">取消报名</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { activityApi, activityRegistrationStatusText, type ActivityRegistration } from '@/api/modules/activity'

const registrations = ref<ActivityRegistration[]>([])
const loading = ref(false)

async function loadRegistrations() {
  loading.value = true
  try {
    registrations.value = (await activityApi.myRegistrations({ page: 1, pageSize: 50 })).list
  } catch {
    registrations.value = []
  } finally {
    loading.value = false
  }
}

function canCancel(item: ActivityRegistration) {
  return ['registered', 'confirmed'].includes(item.status) && new Date(item.activity.endAt).getTime() > Date.now()
}

async function cancel(item: ActivityRegistration) {
  const { confirm } = await uni.showModal({
    title: '取消报名',
    content: '确定取消当前活动报名？',
    confirmText: '取消报名',
    confirmColor: '#d92d20',
  })
  if (!confirm) return
  try {
    await activityApi.cancelRegistration(item.activityId, { cancelReason: '用户主动取消' })
    uni.showToast({ title: '已取消', icon: 'success' })
    await loadRegistrations()
  } catch {
    // 请求层已统一提示
  }
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/activities/detail?id=${id}` })
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onShow(loadRegistrations)
</script>

<style lang="scss" scoped>
.my-activities {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 28rpx;

  &__state {
    padding: 110rpx 24rpx;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    text-align: center;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }
}

.registration-card {
  padding: 26rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, .06);

  &__head {
    display: flex;
    justify-content: space-between;
    gap: 18rpx;
  }

  &__title {
    flex: 1;
    color: var(--color-text);
    font-size: 31rpx;
    font-weight: 800;
    line-height: 42rpx;
  }

  &__status {
    color: var(--color-primary);
    font-size: 24rpx;
    font-weight: 700;
    white-space: nowrap;
  }

  &__time,
  &__desc,
  &__note {
    display: block;
    margin-top: 10rpx;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 36rpx;
  }

  &__note {
    padding: 16rpx;
    border-radius: 12rpx;
    background: #f6f8f7;
  }

  &__cancel {
    margin-top: 18rpx;
    color: #d92d20;
    font-size: 25rpx;
    font-weight: 700;
  }
}
</style>
