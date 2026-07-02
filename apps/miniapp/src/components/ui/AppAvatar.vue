<template>
  <view class="app-avatar" :class="`app-avatar--${size}`" @tap="handleClick">
    <image
      v-if="src"
      class="app-avatar__img"
      :src="src"
      mode="aspectFill"
    />
    <view v-else class="app-avatar__placeholder">
      <text class="app-avatar__icon">👤</text>
    </view>
    <view v-if="editable" class="app-avatar__edit">
      <text class="app-avatar__edit-icon">📷</text>
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  src?: string
  size?: 'small' | 'medium' | 'large'
  editable?: boolean
  defaultSrc?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  size: 'medium',
  editable: false,
  defaultSrc: '',
})

const emit = defineEmits<{ change: [] }>()

const handleClick = (): void => {
  if (props.editable) {
    emit('change')
  }
}
</script>

<style lang="scss" scoped>
.app-avatar {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--color-bg-gray);

  &--small {
    width: 64rpx;
    height: 64rpx;
  }
  &--medium {
    width: 96rpx;
    height: 96rpx;
  }
  &--large {
    width: 160rpx;
    height: 160rpx;
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__icon {
    font-size: 48rpx;
    color: var(--color-text-tertiary);
  }

  &__edit {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 40rpx;
    height: 40rpx;
    background-color: var(--color-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__edit-icon {
    font-size: 20rpx;
  }
}
</style>
