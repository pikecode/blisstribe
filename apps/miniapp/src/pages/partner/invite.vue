<template>
  <view class="partner-invite">
    <view class="partner-invite__card">
      <text class="partner-invite__label">专属邀请码</text>
      <text class="partner-invite__code">{{ inviteCode || '--' }}</text>
      <text class="partner-invite__desc">客户注册时填写该邀请码，即可绑定到你的经营主体。</text>
    </view>

    <view class="partner-invite__actions">
      <button class="partner-invite__btn partner-invite__btn--share" open-type="share" :disabled="!inviteCode">分享给微信好友</button>
      <view class="partner-invite__btn" @tap="copyCode">复制邀请码</view>
      <view class="partner-invite__btn partner-invite__btn--ghost" @tap="reload">刷新</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { partnerApi } from '@/api/modules/partner'

const inviteCode = ref('')

async function reload(): Promise<void> {
  const result = await partnerApi.getInvitationCode()
  inviteCode.value = result.inviteCode
}

function copyCode(): void {
  if (!inviteCode.value) return
  uni.setClipboardData({ data: inviteCode.value })
}

onShow(reload)

onShareAppMessage(() => ({
  title: '邀请您了解服务',
  path: `/pages/index/index?inviteCode=${encodeURIComponent(inviteCode.value)}`,
}))
</script>

<style lang="scss" scoped>
.partner-invite {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 32rpx;

  &__card {
    background: #fff;
    border-radius: 16rpx;
    padding: 48rpx 32rpx;
    text-align: center;
  }
  &__label { display: block; font-size: 26rpx; color: var(--color-text-tertiary); }
  &__code {
    display: block;
    margin: 24rpx 0;
    font-size: 64rpx;
    font-weight: 800;
    letter-spacing: 6rpx;
    color: var(--color-text);
  }
  &__desc { display: block; font-size: 26rpx; color: var(--color-text-secondary); line-height: 1.6; }
  &__actions { margin-top: 32rpx; display: flex; flex-direction: column; gap: 20rpx; }
  &__btn {
    box-sizing: border-box;
    width: 100%;
    height: 84rpx;
    padding: 0;
    margin: 0;
    font-size: 28rpx;
    line-height: 84rpx;
    border-radius: 16rpx;
    background: var(--color-primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    &--ghost {
      background: #fff;
      color: var(--color-text);
      border: 1rpx solid var(--color-border);
    }
    &--share { border: 0; }
  }
}
</style>
