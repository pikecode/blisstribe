<template>
  <view v-if="activity" class="activity-detail">
    <view class="activity-detail__hero">
      <image v-if="activity.coverUrl" :src="activity.coverUrl" class="activity-detail__cover" mode="aspectFill" />
      <view v-else class="activity-detail__cover activity-detail__cover--empty">
        <text>{{ activity.module.name }}</text>
      </view>
    </view>

    <view class="activity-detail__main">
      <view class="activity-detail__badges">
        <text>{{ activity.module.name }}</text>
        <text>{{ activityTypeText(activity.activityType) }}</text>
      </view>
      <text class="activity-detail__title">{{ activity.title }}</text>
      <text class="activity-detail__subtitle">{{ activity.subtitle || activity.targetUserText }}</text>
      <view class="activity-detail__stats">
        <text>{{ detailRegistrationStateText }}</text>
        <text>已报名 {{ activity.registeredCount }}{{ activity.capacity ? `/${activity.capacity}` : '' }}</text>
      </view>
    </view>

    <view class="activity-detail__section">
      <text class="activity-detail__section-title">活动安排</text>
      <view class="activity-detail__info">
        <view class="activity-detail__info-row">
          <text>活动时间</text>
          <text>{{ formatDate(activity.startAt) }} - {{ formatTime(activity.endAt) }}</text>
        </view>
        <view class="activity-detail__info-row">
          <text>报名截止</text>
          <text>{{ formatDate(activity.registrationEndAt) }}</text>
        </view>
        <view class="activity-detail__info-row">
          <text>参与方式</text>
          <text>{{ activity.locationText || '线上参与' }}</text>
        </view>
      </view>
    </view>

    <view v-if="activity.highlights.length" class="activity-detail__section">
      <text class="activity-detail__section-title">活动亮点</text>
      <view class="activity-detail__chips">
        <text v-for="item in activity.highlights" :key="item" class="activity-detail__chip">{{ item }}</text>
      </view>
    </view>

    <view v-if="activity.detail" class="activity-detail__section">
      <text class="activity-detail__section-title">活动详情</text>
      <text class="activity-detail__text">{{ activity.detail }}</text>
    </view>

    <view v-if="activity.relatedProducts?.length" class="activity-detail__section">
      <view class="activity-detail__section-head">
        <text class="activity-detail__section-title">关联产品</text>
      </view>
      <view class="activity-detail__products">
        <view v-for="item in activity.relatedProducts" :key="item.id" class="activity-detail__product" @tap="goProduct(item.id)">
          <image v-if="item.coverUrl" :src="item.coverUrl" class="activity-detail__product-cover" mode="aspectFill" />
          <view class="activity-detail__product-main">
            <text class="activity-detail__product-title">{{ item.title }}</text>
            <text class="activity-detail__product-desc">{{ item.summary || item.subtitle }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="activity-detail__form">
      <view class="activity-detail__form-head">
        <text class="activity-detail__section-title">报名信息</text>
        <text class="activity-detail__form-desc">{{ hasActiveRegistration ? '已提交' : '请留下称呼，问题可选填' }}</text>
      </view>
      <view v-if="hasActiveRegistration" class="activity-detail__registered">
        <view class="activity-detail__registered-mark">已报名</view>
        <view class="activity-detail__registered-content">
          <text class="activity-detail__registered-title">{{ activity.myRegistration?.name || name || '报名信息已提交' }}</text>
          <text class="activity-detail__registered-desc">
            {{ activity.myRegistration?.message || '你已成功报名，后续请留意活动通知。' }}
          </text>
        </view>
      </view>
      <view v-else class="activity-detail__field">
        <view class="activity-detail__field-head">
          <text class="activity-detail__field-label">姓名或称呼</text>
          <text class="activity-detail__field-required">必填</text>
        </view>
        <input
          class="activity-detail__input"
          :class="{ active: nameFocused }"
          :value="name"
          placeholder="例如：小林"
          placeholder-class="activity-detail__placeholder"
          maxlength="40"
          @input="onNameInput"
          @focus="nameFocused = true"
          @blur="nameFocused = false"
        />
      </view>
      <view v-if="!hasActiveRegistration" class="activity-detail__field">
        <view class="activity-detail__field-head">
          <text class="activity-detail__field-label">关注的问题</text>
          <text class="activity-detail__field-count">{{ message.length }}/300</text>
        </view>
        <textarea
          class="activity-detail__textarea"
          :class="{ active: messageFocused }"
          :value="message"
          placeholder="可以写下你希望重点了解的内容"
          placeholder-class="activity-detail__placeholder"
          maxlength="300"
          @input="onMessageInput"
          @focus="messageFocused = true"
          @blur="messageFocused = false"
        />
      </view>
    </view>

    <view class="activity-detail__footer">
      <view class="activity-detail__submit" :class="{ disabled: !canSubmit || submitting }" @tap="submitRegistration">
        {{ submitText }}
      </view>
    </view>
  </view>

  <view v-else class="activity-detail__empty">活动加载中</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  activityApi,
  activityDisplayRegistrationText,
  activityRegistrationStateText,
  activityRegistrationStatusText,
  activityTypeText,
  isActiveActivityRegistrationStatus,
  type Activity,
} from '@/api/modules/activity'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { storage } from '@/utils/storage'
import { setAuthRedirect } from '@/utils/auth'

type UniValueEvent = { detail?: { value?: string | number } }

const authStore = useAuthStore()
const userStore = useUserStore()
const activity = ref<Activity | null>(null)
const activityId = ref(0)
const name = ref('')
const message = ref('')
const nameFocused = ref(false)
const messageFocused = ref(false)
const submitting = ref(false)
const hasActiveRegistration = computed(() => {
  const status = activity.value?.myRegistration?.status
  return isActiveActivityRegistrationStatus(status)
})
const canSubmit = computed(() => activity.value?.registrationStatus === 'registering' && !hasActiveRegistration.value)
const detailRegistrationStateText = computed(() => {
  return activityDisplayRegistrationText(activity.value)
})
const submitText = computed(() => {
  if (submitting.value) return '提交中...'
  if (hasActiveRegistration.value) return activityRegistrationStatusText(activity.value?.myRegistration?.status)
  return activityRegistrationStateText(activity.value?.registrationStatus)
})

function getEventValue(e: unknown): string {
  const detail = (e as UniValueEvent).detail
  return detail?.value === undefined ? '' : String(detail.value)
}

async function loadDetail() {
  if (!activityId.value) return
  try {
    const currentRegistration = activity.value?.myRegistration
    const nextActivity = await activityApi.detail(activityId.value)
    if (
      currentRegistration &&
      isActiveActivityRegistrationStatus(currentRegistration.status) &&
      !nextActivity.myRegistration
    ) {
      nextActivity.myRegistration = currentRegistration
      nextActivity.registeredCount = Math.max(nextActivity.registeredCount, activity.value?.registeredCount ?? 0)
      nextActivity.remainingCount = activity.value?.remainingCount ?? nextActivity.remainingCount
    }
    activity.value = nextActivity
    if (!name.value) name.value = userStore.userInfo?.nickname || ''
  } catch {
    activity.value = null
  }
}

function onNameInput(e: unknown) {
  name.value = getEventValue(e)
}

function onMessageInput(e: unknown) {
  message.value = getEventValue(e)
}

async function submitRegistration() {
  if (!activity.value || submitting.value) return
  if (!authStore.isLogin) {
    setAuthRedirect(`/pages/activities/detail?id=${activity.value.id}`)
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const registration = await activityApi.register(activity.value.id, {
      name: name.value.trim(),
      message: message.value.trim(),
      inviteCode: storage.get<string>('pendingInviteCode') || undefined,
      sourceScene: 'miniapp_activity_detail',
    })
    const wasActive = hasActiveRegistration.value
    activity.value = {
      ...activity.value,
      myRegistration: registration,
      registeredCount: wasActive ? activity.value.registeredCount : activity.value.registeredCount + 1,
      remainingCount: activity.value.remainingCount === null || wasActive ? activity.value.remainingCount : Math.max(activity.value.remainingCount - 1, 0),
    }
    uni.showToast({ title: '报名成功', icon: 'success' })
    await loadDetail()
  } catch {
    // 请求层已统一提示
  } finally {
    submitting.value = false
  }
}

function goProduct(id: number) {
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onLoad((options) => {
  activityId.value = Number(options?.id) || 0
})

onShow(loadDetail)
</script>

<style lang="scss" scoped>
.activity-detail {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: calc(210rpx + env(safe-area-inset-bottom));

  &__cover {
    width: 100%;
    height: 380rpx;
    background: #e9eef3;

    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      font-size: 32rpx;
      font-weight: 700;
    }
  }

  &__main,
  &__section,
  &__form {
    margin: 22rpx 28rpx 0;
    padding: 26rpx;
    border-radius: 18rpx;
    background: #fff;
    box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, .06);
  }

  &__form {
    padding: 28rpx 24rpx 30rpx;
  }

  &__badges,
  &__stats,
  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    color: var(--color-primary);
    font-size: 23rpx;
    font-weight: 700;
  }

  &__title {
    display: block;
    margin-top: 14rpx;
    color: var(--color-text);
    font-size: 40rpx;
    font-weight: 800;
    line-height: 52rpx;
  }

  &__subtitle,
  &__text {
    display: block;
    margin-top: 10rpx;
    color: var(--color-text-secondary);
    font-size: 26rpx;
    line-height: 42rpx;
  }

  &__stats {
    margin-top: 18rpx;
  }

  &__section-title {
    display: block;
    color: var(--color-text);
    font-size: 30rpx;
    font-weight: 800;
    line-height: 40rpx;
  }

  &__form-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20rpx;
    margin-bottom: 24rpx;
  }

  &__form-desc {
    flex: 0 0 auto;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    line-height: 32rpx;
  }

  &__field {
    & + & {
      margin-top: 22rpx;
    }
  }

  &__field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    margin-bottom: 12rpx;
  }

  &__field-label {
    color: var(--color-text);
    font-size: 25rpx;
    font-weight: 700;
    line-height: 34rpx;
  }

  &__field-required,
  &__field-count {
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    line-height: 30rpx;
  }

  &__field-required {
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-weight: 700;
  }

  &__registered {
    display: flex;
    gap: 18rpx;
    padding: 22rpx;
    border: 1.5rpx solid rgba(7, 193, 96, .18);
    border-radius: 18rpx;
    background: linear-gradient(180deg, #f7fffa 0%, #fff 100%);
  }

  &__registered-mark {
    flex: 0 0 auto;
    height: 40rpx;
    padding: 0 16rpx;
    border-radius: 999rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 22rpx;
    font-weight: 800;
    line-height: 40rpx;
  }

  &__registered-content {
    flex: 1;
    min-width: 0;
  }

  &__registered-title {
    display: block;
    color: var(--color-text);
    font-size: 27rpx;
    font-weight: 800;
    line-height: 38rpx;
  }

  &__registered-desc {
    display: block;
    margin-top: 8rpx;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 38rpx;
  }

  &__info {
    margin-top: 18rpx;
  }

  &__info-row {
    display: flex;
    justify-content: space-between;
    gap: 24rpx;
    padding: 14rpx 0;
    color: var(--color-text-secondary);
    font-size: 25rpx;
    line-height: 36rpx;
    border-bottom: 1rpx solid #eef2f1;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 18rpx;
  }

  &__chip {
    padding: 10rpx 18rpx;
    border-radius: 999rpx;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 23rpx;
    line-height: 32rpx;
  }

  &__products {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 18rpx;
  }

  &__product {
    display: flex;
    gap: 16rpx;
  }

  &__product-cover {
    width: 112rpx;
    height: 88rpx;
    border-radius: 12rpx;
    background: #eef2f1;
    flex: 0 0 auto;
  }

  &__product-main {
    flex: 1;
    min-width: 0;
  }

  &__product-title,
  &__product-desc {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__product-title {
    color: var(--color-text);
    font-size: 27rpx;
    font-weight: 700;
    line-height: 38rpx;
  }

  &__product-desc {
    margin-top: 6rpx;
    color: var(--color-text-secondary);
    font-size: 23rpx;
  }

  &__input,
  &__textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1.5rpx solid var(--color-border);
    border-radius: 16rpx;
    background: var(--color-bg-subtle);
    color: var(--color-text);
    font-size: 26rpx;
    line-height: 38rpx;
    transition: all 180ms ease;

    &.active {
      border-color: rgba(7, 193, 96, .55);
      background: #fff;
      box-shadow: 0 0 0 6rpx rgba(7, 193, 96, .08);
    }
  }

  &__input {
    height: 84rpx;
    padding: 0 22rpx;
  }

  &__textarea {
    min-height: 190rpx;
    padding: 20rpx 22rpx;
  }

  &__placeholder {
    color: var(--color-text-placeholder);
    font-size: 26rpx;
  }

  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, .08);
  }

  &__submit {
    height: 82rpx;
    border-radius: 41rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 29rpx;
    font-weight: 800;
    line-height: 82rpx;
    text-align: center;

    &.disabled {
      background: #c7d1cc;
    }
  }

  &__empty {
    padding: 120rpx 30rpx;
    color: var(--color-text-secondary);
    text-align: center;
  }
}
</style>
