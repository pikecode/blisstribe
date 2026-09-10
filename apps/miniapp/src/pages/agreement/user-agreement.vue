<template>
  <view class="agreement">
    <view v-if="agreement" class="agreement__content">
      <text class="agreement__title">{{ agreement.title }}</text>
      <text class="agreement__version">版本：{{ agreement.version }}</text>
      <text class="agreement__body">{{ agreement.content }}</text>
    </view>
    <view v-else class="agreement__state">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agreementApi, type CurrentAgreement } from '@/api/modules/agreement'

const agreement = ref<CurrentAgreement | null>(null)

onLoad(async () => {
  try {
    agreement.value = await agreementApi.current('user')
  } catch {
    uni.showToast({ title: '协议加载失败', icon: 'none' })
  }
})
</script>

<style lang="scss" scoped>
.agreement {
  padding: 32rpx;
  background-color: var(--color-bg-white);
  min-height: 100vh;

  &__content {
    display: flex;
    flex-direction: column;
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: 1.8;
  }

  &__title { font-size: 36rpx; font-weight: 700; }
  &__version { margin-top: 12rpx; color: var(--color-text-secondary); }
  &__body { margin-top: 28rpx; white-space: pre-wrap; }
  &__state { color: var(--color-text-secondary); }
}
</style>
