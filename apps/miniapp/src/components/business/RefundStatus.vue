<template>
  <view class="refund-status" :class="`refund-status--${status}`">
    <text class="refund-status__icon">{{ statusIcon }}</text>
    <view class="refund-status__content">
      <text class="refund-status__label">{{ statusLabel }}</text>
      <text v-if="rejectionReason" class="refund-status__reason">{{ rejectionReason }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { shopApi } from '@/api/modules/shop'

interface Props {
  status: string
  rejectionReason?: string
}

const props = withDefaults(defineProps<Props>(), {
  status: 'pending',
})

const statusIcon = computed(() => {
  const icons: Record<string, string> = {
    pending: '⏳',
    approved: '↻',
    closed: '—',
    processing: '↻',
    rejected: '✕',
    success: '✓',
    failed: '!',
  }
  return icons[props.status] || '•'
})

const statusLabel = computed(() => shopApi.getRefundStatusLabel(props.status))

</script>

<style lang="scss" scoped>
.refund-status {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: var(--color-bg-subtle);
  border-left: 4rpx solid var(--color-text-tertiary);

  &__icon {
    flex-shrink: 0;
    font-size: 28rpx;
    font-weight: 700;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__label {
    display: block;
    color: var(--color-text);
    font-size: 26rpx;
    font-weight: 600;
  }

  &__reason {
    display: block;
    color: var(--color-text-secondary);
    font-size: 22rpx;
    line-height: 1.5;
  }

  // Status variants
  &--pending {
    background: #fef3c7;
    border-left-color: #f59e0b;

    .refund-status__icon {
      color: #f59e0b;
    }

    .refund-status__label {
      color: #92400e;
    }
  }

  &--approved,
  &--processing {
    background: #d1fae5;
    border-left-color: #10b981;

    .refund-status__icon {
      color: #10b981;
    }

    .refund-status__label {
      color: #065f46;
    }
  }

  &--rejected,
  &--failed {
    background: #fee2e2;
    border-left-color: #ef4444;

    .refund-status__icon {
      color: #ef4444;
    }

    .refund-status__label {
      color: #7f1d1d;
    }

    .refund-status__reason {
      color: #991b1b;
    }
  }

  &--success {
    background: #d1fae5;
    border-left-color: #10b981;

    .refund-status__icon {
      color: #10b981;
    }

    .refund-status__label {
      color: #065f46;
    }
  }
}
</style>
