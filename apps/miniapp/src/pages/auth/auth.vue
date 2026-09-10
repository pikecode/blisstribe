<template>
  <view class="auth">
    <view class="auth__hero">
      <view class="auth__brand-row">
        <image class="auth__logo" src="/static/logo-brand.jpeg" mode="aspectFit" />
        <view class="auth__brand-copy">
          <text class="auth__brand-name">隐途心悦部落</text>
          <text class="auth__brand-subtitle">心悦部落</text>
        </view>
      </view>

      <view class="auth__headline">
        <text class="auth__title">先了解你的需求，再推荐合适服务</text>
        <text class="auth__desc">登录后可保存评估结果、同步咨询进展和活动报名记录。</text>
      </view>

      <view class="auth__benefits">
        <view v-for="item in benefits" :key="item" class="auth__benefit">
          <view class="auth__benefit-icon">✓</view>
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="auth__spacer" />

    <view class="auth__bottom">
      <view class="auth__action">
        <button
          class="auth__btn-wechat"
          :disabled="loading"
          open-type="getUserProfile"
          @tap="handleWechatLogin"
        >
          <text v-if="!loading" class="auth__btn-text">微信登录 / 继续</text>
          <text v-else class="auth__btn-text">登录中...</text>
        </button>
      </view>

      <text class="auth__privacy-tip">仅用于账号识别和资料完善，你可在后续页面补充信息</text>
      <view class="auth__agreement">
        <UserAgreement v-model="agreed" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { redirectAfterLogin } from '@/utils/auth'
import { useAuthStore } from '@/stores/modules/auth'
import { storage } from '@/utils/storage'
import UserAgreement from '@/components/business/UserAgreement.vue'

const { wechatLogin } = useAuth()
const authStore = useAuthStore()

const loading = ref(false)
const agreed = ref(false)
const benefits = ['保存健康需求评估', '查看专属服务推荐', '同步咨询与报名进度']

const handleWechatLogin = async (): Promise<void> => {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  if (loading.value) return
  loading.value = true

  try {
    // getUserProfile 需要用户主动点击触发，这里先获取 userInfo
    let wxUserInfo: { nickName: string; avatarUrl: string; gender: number } | undefined
    try {
      const res = await uni.getUserProfile({ desc: '用于完善用户资料' })
      const info = res.userInfo as unknown as {
        nickName: string
        avatarUrl: string
        gender: number
      }
      wxUserInfo = {
        nickName: info.nickName,
        avatarUrl: info.avatarUrl,
        gender: info.gender ?? 0,
      }
    } catch {
      // 用户拒绝 userInfo，仍可继续登录（老用户直接登录，新用户注册页可后续补充）
    }

    const result = await wechatLogin(wxUserInfo)

    if (result.isNewUser) {
      authStore.setRegisterWxUserInfo(wxUserInfo)
      // 新用户：跳转完善信息页
      const inviteCode = storage.get<string>('pendingInviteCode')
      const query = inviteCode ? `?inviteCode=${encodeURIComponent(inviteCode)}` : ''
      uni.redirectTo({ url: `/pages/register/register${query}` })
    } else {
      // 老用户：wechatLogin 内部已按来源页完成跳转
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '授权失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 已登录用户直接进首页
if (authStore.isLogin) {
  redirectAfterLogin()
}
</script>

<style lang="scss" scoped>
.auth {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 48rpx;
  background:
    linear-gradient(180deg, var(--color-primary-soft) 0%, #ffffff 44%, #ffffff 100%);
  box-sizing: border-box;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -120rpx;
    right: -160rpx;
    width: 360rpx;
    height: 360rpx;
    border-radius: 50%;
    background: rgba(7, 193, 96, 0.1);
  }

  &__hero {
    position: relative;
    display: flex;
    flex-direction: column;
    padding-top: calc(112rpx + env(safe-area-inset-top));
  }

  &__brand-row {
    display: flex;
    align-items: center;
    margin-bottom: 72rpx;
  }

  &__brand-copy {
    display: flex;
    flex-direction: column;
    margin-left: 20rpx;
  }

  &__brand-name {
    color: var(--color-text);
    font-size: 34rpx;
    font-weight: 800;
    line-height: 42rpx;
  }

  &__brand-subtitle {
    margin-top: 2rpx;
    color: var(--color-text-secondary);
    font-size: 23rpx;
    line-height: 30rpx;
  }

  &__headline {
    display: flex;
    flex-direction: column;
    margin-bottom: 44rpx;
  }

  &__spacer {
    flex: 1;
  }

  &__bottom {
    position: relative;
    padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  }

  &__logo {
    width: 88rpx;
    height: 88rpx;
    flex-shrink: 0;
    border-radius: 16rpx;
  }

  &__title {
    color: var(--color-text);
    font-size: 48rpx;
    font-weight: 800;
    line-height: 62rpx;
  }

  &__desc {
    margin-top: 20rpx;
    color: var(--color-text-secondary);
    font-size: 28rpx;
    line-height: 42rpx;
  }

  &__benefits {
    display: flex;
    flex-direction: column;
    gap: 18rpx;
  }

  &__benefit {
    display: flex;
    align-items: center;
    min-height: 56rpx;
    color: var(--color-text);
    font-size: 27rpx;
    line-height: 36rpx;
  }

  &__benefit-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 34rpx;
    height: 34rpx;
    margin-right: 16rpx;
    border-radius: 50%;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 22rpx;
    font-weight: 800;
  }

  &__action {
    width: 100%;
    margin-bottom: 18rpx;
  }

  &__btn-wechat {
    width: 100%;
    height: 96rpx;
    background-color: var(--color-primary);
    color: #fff;
    border-radius: var(--radius-round);
    font-size: var(--font-size-lg);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-action);

    &::after {
      border: none;
    }

    &[disabled] {
      opacity: var(--opacity-disabled);
    }
  }

  &__btn-text {
    color: #fff;
  }

  &__privacy-tip {
    display: block;
    margin-bottom: 28rpx;
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
