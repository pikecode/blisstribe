<template>
  <view class="user-agreement" @tap="toggle">
    <view
      class="user-agreement__checkbox"
      :class="{ 'is-checked': modelValue }"
    >
      <text v-if="modelValue" class="user-agreement__tick">✓</text>
    </view>
    <view class="user-agreement__text">
      <text>我已阅读并同意</text>
      <text class="user-agreement__link" @tap.stop="openAgreement('user')">《用户协议》</text>
      <text>和</text>
      <text class="user-agreement__link" @tap.stop="openAgreement('privacy')">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const toggle = (): void => {
  emit('update:modelValue', !props.modelValue)
}

const openAgreement = (type: 'user' | 'privacy'): void => {
  const url =
    type === 'user'
      ? '/pages/agreement/user-agreement'
      : '/pages/agreement/privacy-policy'
  uni.navigateTo({ url })
}
</script>

<style lang="scss" scoped>
.user-agreement {
  display: flex;
  align-items: flex-start;
  padding: 0 32rpx;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;

  &__checkbox {
    flex-shrink: 0;
    width: 40rpx;
    height: 40rpx;
    margin-right: 16rpx;
    margin-top: 2rpx;
    border: 3rpx solid var(--color-border);
    border-radius: 50%;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;

    &.is-checked {
      background-color: var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  &__tick {
    color: #fff;
    font-size: 26rpx;
    line-height: 1;
  }

  &__link {
    color: var(--color-primary);
  }
}
</style>
