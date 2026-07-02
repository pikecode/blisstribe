<template>
  <view v-if="visible" class="auth-popup">
    <view class="auth-popup__mask" @tap="close" />
    <view class="auth-popup__sheet">
      <view class="auth-popup__handle" />
      <view class="auth-popup__brand">
        <view class="auth-popup__logo">B</view>
        <text class="auth-popup__title">加入心悦部落</text>
        <text class="auth-popup__desc">授权后即可体验完整功能</text>
      </view>
      <button
        class="auth-popup__btn"
        :disabled="loading"
        open-type="getUserProfile"
        @tap="handleLogin"
      >
        <text>{{ loading ? '授权中...' : '微信一键授权' }}</text>
      </button>
      <view class="auth-popup__agreement">
        <UserAgreement v-model="agreed" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { redirectToHome } from '@/utils/auth'
import UserAgreement from './UserAgreement.vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { wechatLogin } = useAuth()
const loading = ref(false)
const agreed = ref(false)

function close() {
  if (!loading.value) emit('close')
}

const handleLogin = async (): Promise<void> => {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  if (loading.value) return
  loading.value = true
  try {
    const result = await wechatLogin()
    emit('close')   // 无论老用户还是新用户，授权成功后先关闭弹窗
    if (result.isNewUser) {
      uni.navigateTo({ url: '/pages/register/register' })
    }
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '授权失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-popup {
  position: fixed;
  inset: 0;
  z-index: 999;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
  }

  &__sheet {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 24rpx 48rpx 64rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__handle {
    width: 64rpx;
    height: 8rpx;
    background: #e0e0e0;
    border-radius: 4rpx;
    margin-bottom: 40rpx;
  }

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 48rpx;
  }

  &__logo {
    width: 96rpx;
    height: 96rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-size: 48rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 8rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: #999;
  }

  &__btn {
    width: 100%;
    height: 88rpx;
    background: #07c160;
    color: #fff;
    border-radius: 44rpx;
    font-size: 30rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24rpx;
    &::after { border: none; }
  }

  &__agreement {
    width: 100%;
  }
}
</style>
