<template>
  <view class="index">
    <view class="index__hero">
      <text class="index__title">BlissTribe</text>
      <text class="index__subtitle">欢迎使用</text>
    </view>
    <view v-if="isLogin" class="index__user">
      <view class="index__avatar">
        <image
          v-if="userStore.avatarUrl"
          :src="userStore.avatarUrl"
          class="index__avatar-img"
          mode="aspectFill"
        />
        <text v-else class="index__avatar-placeholder">👤</text>
      </view>
      <text class="index__name">{{ userStore.displayName }}</text>
    </view>
    <view v-else class="index__action">
      <view class="index__btn" @tap="goAuth">去登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

const authStore = useAuthStore()
const userStore = useUserStore()

const isLogin = computed(() => authStore.isLogin)

const goAuth = (): void => {
  uni.navigateTo({ url: '/pages/auth/auth' })
}

// tabBar 页面 onShow 检测登录态（页面级鉴权兜底）
onShow(() => {
  if (!authStore.isLogin) {
    // 未登录不强制跳转，展示去登录入口
  }
})
</script>

<style lang="scss" scoped>
.index {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 0 64rpx;

  &__hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 80rpx;
  }

  &__title {
    font-size: 64rpx;
    font-weight: bold;
    color: var(--color-primary);
  }

  &__subtitle {
    margin-top: 16rpx;
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
  }

  &__user {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
  }

  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    overflow: hidden;
    background-color: var(--color-bg-gray);
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
  }

  &__name {
    font-size: var(--font-size-lg);
    color: var(--color-text);
  }

  &__action {
    width: 100%;
  }

  &__btn {
    width: 100%;
    height: 88rpx;
    background-color: var(--color-primary);
    color: #fff;
    border-radius: var(--radius-md);
    font-size: var(--font-size-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
