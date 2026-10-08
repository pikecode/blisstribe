<template>
  <view class="address-edit">
    <view class="address-edit__card">
      <text class="address-edit__label">收货人</text>
      <input v-model="receiverName" class="address-edit__input" maxlength="40" placeholder="请输入收货人姓名" />
      <text class="address-edit__label">联系电话</text>
      <input v-model="receiverPhone" class="address-edit__input" maxlength="30" placeholder="请输入联系电话" />
      <text class="address-edit__label">详细地址</text>
      <textarea v-model="fullAddress" class="address-edit__textarea" maxlength="200" placeholder="请输入省、市、区及详细地址" />
      <view class="address-edit__default">
        <view>
          <text class="address-edit__default-title">设为默认地址</text>
          <text class="address-edit__default-desc">结算时优先使用此地址</text>
        </view>
        <switch :checked="isDefault" color="#07c160" @change="changeDefault" />
      </view>
    </view>
    <button class="address-edit__save" :disabled="saving" @tap="save">{{ saving ? '保存中...' : '保存地址' }}</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addressApi } from '@/api/modules/address'

const id = ref('')
const receiverName = ref('')
const receiverPhone = ref('')
const fullAddress = ref('')
const isDefault = ref(false)
const saving = ref(false)

function changeDefault(event: Event) {
  isDefault.value = (event as Event & { detail: { value: boolean } }).detail.value
}

onLoad(async (options) => {
  id.value = String(options?.id || '')
  if (!id.value) {
    uni.setNavigationBarTitle({ title: '新增收货地址' })
    return
  }
  const address = (await addressApi.list()).find((item) => item.id === id.value)
  if (!address) return
  receiverName.value = address.receiverName
  receiverPhone.value = address.receiverPhone
  fullAddress.value = address.fullAddress
  isDefault.value = address.isDefault
})

async function save() {
  if (!receiverName.value.trim() || !receiverPhone.value.trim() || !fullAddress.value.trim()) {
    uni.showToast({ title: '请填写完整收货信息', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const data = {
      receiverName: receiverName.value.trim(),
      receiverPhone: receiverPhone.value.trim(),
      fullAddress: fullAddress.value.trim(),
      isDefault: isDefault.value,
    }
    if (id.value) await addressApi.update(id.value, data)
    else await addressApi.create(data)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.address-edit {
  min-height: 100vh;
  padding: 24rpx;
  background: var(--color-bg);

  &__card { padding: 28rpx; border-radius: 20rpx; background: #fff; box-shadow: var(--shadow-sm); }
  &__label { display: block; margin: 24rpx 0 10rpx; color: var(--color-text); font-size: 25rpx; font-weight: 700; }
  &__label:first-child { margin-top: 0; }
  &__input,
  &__textarea { box-sizing: border-box; width: 100%; padding: 20rpx; border: 1rpx solid var(--color-border); border-radius: 14rpx; background: var(--color-bg-subtle); font-size: 26rpx; }
  &__input { height: 84rpx; }
  &__textarea { height: 180rpx; }
  &__default { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; padding-top: 24rpx; border-top: 1rpx solid var(--color-border); }
  &__default-title { display: block; color: var(--color-text); font-size: 26rpx; font-weight: 700; }
  &__default-desc { display: block; margin-top: 5rpx; color: var(--color-text-tertiary); font-size: 22rpx; }
  &__save { height: 84rpx; margin: 28rpx 0 0; border-radius: var(--radius-round); background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 700; line-height: 84rpx; box-shadow: var(--shadow-action); }
  &__save::after { border: 0; }
  &__save[disabled] { opacity: 0.6; }
}
</style>
