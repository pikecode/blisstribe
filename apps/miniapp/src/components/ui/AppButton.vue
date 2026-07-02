<template>
  <view
    class="app-button"
    :class="[`app-button--${type}`, `app-button--${size}`, { 'is-block': block }]"
    hover-class="app-button--hover"
    :hover-stay-time="0"
    @tap="handleTap"
  >
    <view v-if="loading" class="app-button__loading" />
    <slot v-else />
  </view>
</template>

<script setup lang="ts">
interface Props {
  type?: 'primary' | 'default' | 'danger'
  size?: 'large' | 'medium' | 'small'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'large',
  disabled: false,
  loading: false,
  block: true,
})

const emit = defineEmits<{ tap: [] }>()

const handleTap = (): void => {
  if (props.disabled || props.loading) return
  emit('tap')
}
</script>

<style lang="scss" scoped>
.app-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  line-height: 1;
  transition: opacity 0.2s;

  &.is-block {
    width: 100%;
  }

  &--large {
    height: 88rpx;
    font-size: var(--font-size-lg);
  }
  &--medium {
    height: 72rpx;
    font-size: var(--font-size-md);
  }
  &--small {
    height: 56rpx;
    font-size: var(--font-size-sm);
  }

  &--primary {
    background-color: var(--color-primary);
    color: #fff;
  }
  &--default {
    background-color: var(--color-bg-white);
    color: var(--color-text);
    border: 2rpx solid var(--color-border);
  }
  &--danger {
    background-color: var(--color-danger);
    color: #fff;
  }

  &--hover {
    opacity: 0.75;
  }

  &__loading {
    width: 32rpx;
    height: 32rpx;
    border: 4rpx solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: app-button-spin 0.6s linear infinite;
  }
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
