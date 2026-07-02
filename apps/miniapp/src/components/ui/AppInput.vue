<template>
  <view class="app-input" :class="{ 'app-input--error': error }">
    <input
      class="app-input__inner"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :placeholder-style="placeholderStyle"
      :password="type === 'password' && !showPassword"
      :maxlength="maxlength"
      :disabled="disabled"
      :readonly="readonly"
      @input="onInput"
      @blur="onBlur"
    />
    <view v-if="type === 'password'" class="app-input__suffix" @tap="showPassword = !showPassword">
      <text class="app-input__icon">{{ showPassword ? '🙈' : '👁' }}</text>
    </view>
    <view v-if="clearable && modelValue && !disabled" class="app-input__suffix" @tap="clear">
      <text class="app-input__icon">✕</text>
    </view>
  </view>
  <view v-if="error" class="app-input__error">{{ error }}</view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  modelValue: string
  type?: 'text' | 'password' | 'number' | 'tel'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  maxlength?: number
  clearable?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  readonly: false,
  maxlength: -1,
  clearable: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const showPassword = ref(false)
const placeholderStyle = computed(() => 'color: var(--color-text-placeholder)')

const onInput = (e: InputEvent): void => {
  const detail = e.detail as unknown as { value: string }
  emit('update:modelValue', detail.value)
}

const onBlur = (): void => {
  emit('blur')
}

const clear = (): void => {
  emit('update:modelValue', '')
}
</script>

<style lang="scss" scoped>
.app-input {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: var(--color-bg-white);
  border: 2rpx solid var(--color-border);
  border-radius: var(--radius-md);

  &--error {
    border-color: var(--color-danger);
  }

  &__inner {
    flex: 1;
    height: 100%;
    font-size: var(--font-size-md);
    color: var(--color-text);
  }

  &__suffix {
    padding: 0 8rpx;
  }

  &__icon {
    font-size: var(--font-size-md);
    color: var(--color-text-tertiary);
  }

  &__error {
    margin-top: 8rpx;
    padding-left: 24rpx;
    font-size: var(--font-size-xs);
    color: var(--color-danger);
  }
}
</style>
