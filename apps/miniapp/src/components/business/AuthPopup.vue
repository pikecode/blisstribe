<template>
  <view v-if="visible" class="auth-popup">
    <view class="auth-popup__mask" @tap="close" />
    <view class="auth-popup__sheet">
      <view class="auth-popup__handle" />
      <view class="auth-popup__brand">
        <view class="auth-popup__brand-row">
          <view class="auth-popup__logo">B</view>
          <view class="auth-popup__brand-copy">
            <text class="auth-popup__brand-name">BlissTribe</text>
            <text class="auth-popup__brand-subtitle">心悦部落</text>
          </view>
        </view>
        <text class="auth-popup__title">登录后继续查看</text>
        <text class="auth-popup__desc">保存评估结果，同步咨询与报名进度</text>
      </view>
      <button
        class="auth-popup__btn"
        :disabled="loading"
        open-type="getUserProfile"
        @tap="handleLogin"
      >
        <text>{{ loading ? '登录中...' : '微信登录 / 继续' }}</text>
      </button>
      <text class="auth-popup__privacy-tip">仅用于账号识别和资料完善</text>
      <view class="auth-popup__agreement">
        <UserAgreement v-model="agreed" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { storage } from '@/utils/storage'
import { useAuthStore, type RegisterWxUserInfo } from '@/stores/modules/auth'
import UserAgreement from './UserAgreement.vue'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { wechatLogin } = useAuth()
const authStore = useAuthStore()
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
    let wxUserInfo: RegisterWxUserInfo | undefined
    try {
      const res = await uni.getUserProfile({ desc: '用于完善用户资料' })
      const info = res.userInfo as unknown as RegisterWxUserInfo
      wxUserInfo = {
        nickName: info.nickName,
        avatarUrl: info.avatarUrl,
        gender: info.gender ?? 0,
      }
    } catch {
      // 用户拒绝头像昵称授权时，仍允许继续微信登录并手动注册资料。
    }

    const result = await wechatLogin(wxUserInfo)
    emit('close')   // 无论老用户还是新用户，授权成功后先关闭弹窗
    if (result.isNewUser) {
      authStore.setRegisterWxUserInfo(wxUserInfo)
      const inviteCode = storage.get<string>('pendingInviteCode')
      const query = inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : ''
      uni.navigateTo({ url: `/pages/register/register${query}` })
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
    background: rgba(31, 41, 55, 0.46);
  }

  &__sheet {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 22rpx 48rpx calc(48rpx + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  &__handle {
    width: 64rpx;
    height: 8rpx;
    background: var(--color-border-strong);
    border-radius: 4rpx;
    margin: 0 auto 36rpx;
  }

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40rpx;
    text-align: center;
  }

  &__brand-row {
    display: flex;
    align-items: center;
    margin-bottom: 32rpx;
  }

  &__brand-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-left: 18rpx;
  }

  &__brand-name {
    color: var(--color-text);
    font-size: 30rpx;
    font-weight: 800;
    line-height: 38rpx;
  }

  &__brand-subtitle {
    margin-top: 2rpx;
    color: var(--color-text-secondary);
    font-size: 22rpx;
    line-height: 28rpx;
  }

  &__logo {
    width: 76rpx;
    height: 76rpx;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #fff;
    font-size: 38rpx;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-action);
  }

  &__title {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--color-text);
    line-height: 46rpx;
    margin-bottom: 12rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: var(--color-text-secondary);
    line-height: 36rpx;
  }

  &__btn {
    width: 100%;
    height: 96rpx;
    background: var(--color-primary);
    color: #fff;
    border-radius: var(--radius-round);
    font-size: var(--font-size-lg);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18rpx;
    box-shadow: var(--shadow-action);

    &::after { border: none; }

    &[disabled] {
      opacity: var(--opacity-disabled);
    }
  }

  &__privacy-tip {
    display: block;
    margin-bottom: 24rpx;
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    line-height: 32rpx;
    text-align: center;
  }

  &__agreement {
    width: 100%;
  }
}
</style>
