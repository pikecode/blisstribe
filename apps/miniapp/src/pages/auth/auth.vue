<template>
  <view class="auth">
    <view class="auth__brand">
      <view class="auth__logo">B</view>
      <text class="auth__title">欢迎使用 BlissTribe</text>
      <text class="auth__desc">授权后即可体验完整功能</text>
    </view>

    <!-- 占位空白，把底部区推下去 -->
    <view class="auth__spacer" />

    <view class="auth__bottom">
      <view class="auth__action">
        <button
          class="auth__btn-wechat"
          :disabled="loading"
          open-type="getUserProfile"
          @tap="handleWechatLogin"
        >
          <text v-if="!loading" class="auth__btn-text">微信一键授权</text>
          <text v-else class="auth__btn-text">授权中...</text>
        </button>
      </view>

      <view class="auth__agreement">
        <UserAgreement v-model="agreed" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { redirectToHome } from '@/utils/auth'
import { useAuthStore } from '@/stores/modules/auth'
import UserAgreement from '@/components/business/UserAgreement.vue'

const { wechatLogin } = useAuth()
const authStore = useAuthStore()

const loading = ref(false)
const agreed = ref(false)

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
      // 新用户：跳转完善信息页
      uni.redirectTo({ url: '/pages/register/register' })
    } else {
      // 老用户：wechatLogin 内部已跳转首页，兜底再跳一次
      redirectToHome()
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
  redirectToHome()
}
</script>

<style lang="scss" scoped>
.auth {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 48rpx;
  background-color: var(--color-bg-white);

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 160rpx;
  }

  &__spacer {
    flex: 1;
  }

  &__bottom {
    padding-bottom: 60rpx;
  }

  &__logo {
    width: 128rpx;
    height: 128rpx;
    border-radius: var(--radius-lg);
    background-color: var(--color-primary);
    color: #fff;
    font-size: 64rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32rpx;
  }

  &__title {
    font-size: 40rpx;
    font-weight: bold;
    color: var(--color-text);
    margin-bottom: 16rpx;
  }

  &__desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__action {
    width: 100%;
    margin-bottom: 48rpx;
  }

  &__btn-wechat {
    width: 100%;
    height: 88rpx;
    background-color: var(--color-primary);
    color: #fff;
    border-radius: var(--radius-md);
    font-size: var(--font-size-lg);
    display: flex;
    align-items: center;
    justify-content: center;

    &[disabled] {
      opacity: 0.6;
    }
  }

  &__btn-text {
    color: #fff;
  }

  &__agreement {
    width: 100%;
  }
}
</style>
