<template>
  <view class="partner-invite">
    <view class="partner-invite__card">
      <text class="partner-invite__label">专属邀请码</text>
      <text class="partner-invite__code">{{ inviteCode || '--' }}</text>
      <text class="partner-invite__desc">客户注册时填写该邀请码，即可绑定到你的经营主体。</text>
    </view>

    <view class="partner-invite__actions">
      <view class="partner-invite__btn" @tap="copyCode">复制邀请码</view>
      <view class="partner-invite__btn partner-invite__btn--ghost" @tap="copyPath">复制注册路径</view>
      <view class="partner-invite__btn partner-invite__btn--ghost" @tap="reload">刷新</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
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

function copyPath(): void {
  if (!inviteCode.value) return
  uni.setClipboardData({ data: `/pages/index/index?inviteCode=${inviteCode.value}` })
}

onShow(reload)
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
  &__actions { margin-top: 32rpx; display: flex; gap: 20rpx; }
  &__btn {
    flex: 1;
    height: 84rpx;
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
  }
}
</style>
