<template>
  <view class="invite-unavailable">
    <text class="invite-unavailable__title">好友邀请暂未开放</text>
    <text class="invite-unavailable__desc">普通用户邀请奖励尚未启用。服务伙伴可从「服务伙伴」工作台使用专属邀请码邀请客户。</text>
  </view>
</template>

<style lang="scss" scoped>
.invite-unavailable {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 180rpx 56rpx 0;
  background: var(--color-bg);
  text-align: center;

  &__title { display: block; font-size: 36rpx; font-weight: 700; color: var(--color-text); }
  &__desc { display: block; margin-top: 24rpx; font-size: 28rpx; line-height: 1.7; color: var(--color-text-secondary); }
}
</style>
