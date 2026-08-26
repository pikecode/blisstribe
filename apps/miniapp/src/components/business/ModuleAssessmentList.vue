<template>
  <view :class="['module-assessment-list', `module-assessment-list--${variant}`]">
    <view
      v-for="item in items"
      :key="item.code"
      class="module-assessment-list__item"
      @tap="$emit('moduleTap', item.code)"
    >
      <image
        v-if="variant === 'grid' && item.coverUrl"
        :src="item.coverUrl"
        class="module-assessment-list__bg"
        mode="aspectFill"
      />

      <template v-if="variant === 'grid'">
        <view class="module-assessment-list__head">
          <text class="module-assessment-list__icon">{{ item.icon || item.name.slice(0, 2) }}</text>
          <text :class="['module-assessment-list__status', { done: item.done }]">
            {{ item.done ? '已评估' : '待评估' }}
          </text>
        </view>
        <text class="module-assessment-list__title">{{ item.name }}</text>
        <text class="module-assessment-list__desc">
          {{ item.summary || item.description || `${item.name}类服务推荐` }}
        </text>
      </template>

      <template v-else>
        <view class="module-assessment-list__main">
          <text class="module-assessment-list__title">{{ item.name }}</text>
          <text class="module-assessment-list__desc">
            {{ item.summary || item.description || `${item.name}需求还未评估` }}
          </text>
        </view>
        <text :class="['module-assessment-list__pill', item.done ? 'module-assessment-list__pill--done' : 'module-assessment-list__pill--todo']">
          {{ item.done ? '已完成' : '待评估' }}
        </text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
export interface ModuleAssessmentListItem {
  code: string
  name: string
  description?: string
  coverUrl?: string
  icon?: string
  done: boolean
  summary?: string
}

withDefaults(defineProps<{
  items: ModuleAssessmentListItem[]
  variant?: 'grid' | 'list'
}>(), {
  variant: 'grid',
})

defineEmits<{
  moduleTap: [code: string]
}>()
</script>

<style lang="scss" scoped>
.module-assessment-list {
  &--grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;

    .module-assessment-list__item {
      position: relative;
      width: calc((100% - 16rpx) / 2);
      min-height: 204rpx;
      padding: 24rpx;
      background: var(--color-bg-white);
      border-radius: var(--radius-lg);
      box-sizing: border-box;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .module-assessment-list__head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22rpx;
    }

    .module-assessment-list__title,
    .module-assessment-list__desc {
      position: relative;
    }

    .module-assessment-list__desc {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  &--list {
    display: flex;
    flex-direction: column;
    gap: 16rpx;

    .module-assessment-list__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18rpx;
      padding: 18rpx;
      border-radius: 14rpx;
      background: var(--color-bg-subtle);
    }

    .module-assessment-list__main {
      flex: 1;
      min-width: 0;
    }

    .module-assessment-list__desc {
      white-space: nowrap;
    }
  }

  &__bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: .18;
  }

  &__icon {
    color: var(--color-text);
    font-size: 30rpx;
    font-weight: 750;
  }

  &__status {
    padding: 6rpx 13rpx;
    border-radius: var(--radius-round);
    background: var(--color-bg-gray);
    color: var(--color-text-tertiary);
    font-size: 20rpx;
    line-height: 26rpx;

    &.done {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }
  }

  &__title {
    display: block;
    color: var(--color-text);
    font-size: 31rpx;
    font-weight: 700;
    line-height: 1.32;
  }

  &__desc {
    display: block;
    margin-top: 8rpx;
    color: var(--color-text-secondary);
    font-size: 23rpx;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__pill {
    flex-shrink: 0;
    min-width: 96rpx;
    padding: 8rpx 12rpx;
    border-radius: 999rpx;
    text-align: center;
    font-size: 22rpx;
    line-height: 28rpx;

    &--done {
      background: var(--color-primary-light);
      color: #08783d;
    }

    &--todo {
      background: #fff4e5;
      color: #a15c00;
    }
  }
}
</style>
