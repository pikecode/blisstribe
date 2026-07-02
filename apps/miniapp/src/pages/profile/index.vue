<template>
  <view class="profile">
    <view v-if="isLogin" class="profile__user">
      <view class="profile__avatar">
        <image
          v-if="userStore.avatarUrl"
          :src="userStore.avatarUrl"
          class="profile__avatar-img"
          mode="aspectFill"
        />
        <text v-else class="profile__avatar-placeholder">👤</text>
      </view>
      <view class="profile__info">
        <text class="profile__name">{{ userStore.displayName }}</text>
        <text class="profile__phone">{{ userStore.userInfo?.phone }}</text>
      </view>
    </view>

    <view v-else class="profile__empty">
      <text class="profile__empty-text">未登录</text>
      <view class="profile__btn profile__btn--primary" @tap="goAuth">去登录</view>
    </view>

    <view v-if="isLogin" class="profile__links">
      <view class="profile__link" @tap="goEdit">
        <text>编辑资料</text>
        <text>›</text>
      </view>
    </view>

    <view v-if="isLogin" class="profile__action">
      <view class="profile__btn profile__btn--default" @tap="handleLogout">退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { useAuth } from '@/composables/useAuth'

const authStore = useAuthStore()
const userStore = useUserStore()
const { logout } = useAuth()

const isLogin = computed(() => authStore.isLogin)

const goAuth = (): void => {
  uni.navigateTo({ url: '/pages/auth/auth' })
}

const goEdit = (): void => {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

const handleLogout = async (): Promise<void> => {
  const { confirm } = await uni.showModal({ title: '提示', content: '确定退出登录？' })
  if (!confirm) return
  await logout()
}

onShow(() => {
  // 页面级鉴权兜底
})
</script>

<style lang="scss" scoped>
.profile {
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: 32rpx;

  &__user {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 32rpx;
    background-color: var(--color-bg-white);
    border-radius: var(--radius-md);
    margin-bottom: 32rpx;
  }

  &__avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    overflow: hidden;
    background-color: var(--color-bg-gray);
    flex-shrink: 0;
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

  &__info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name {
    font-size: var(--font-size-lg);
    font-weight: bold;
    color: var(--color-text);
  }

  &__phone {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32rpx;
    padding: 120rpx 0;
  }

  &__empty-text {
    font-size: var(--font-size-md);
    color: var(--color-text-tertiary);
  }

  &__links {
    margin-bottom: 32rpx;
  }

  &__link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    background-color: var(--color-bg-white);
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);
    color: var(--color-text);
  }

  &__action {
    margin-top: 48rpx;
  }

  &__btn {
    height: 88rpx;
    border-radius: var(--radius-md);
    font-size: var(--font-size-lg);
    display: flex;
    align-items: center;
    justify-content: center;

    &--primary {
      width: 100%;
      background-color: var(--color-primary);
      color: #fff;
    }

    &--default {
      width: 100%;
      background-color: var(--color-bg-white);
      color: var(--color-text);
      border: 2rpx solid var(--color-border);
    }
  }
}
</style>