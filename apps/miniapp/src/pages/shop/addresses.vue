<template>
  <view class="addresses">
    <view v-if="loading" class="addresses__state">地址加载中...</view>
    <view v-else-if="!addresses.length" class="addresses__state">
      <text class="addresses__empty-title">还没有收货地址</text>
      <text class="addresses__empty-desc">添加后，下次下单可以直接选择</text>
    </view>
    <view v-else class="addresses__list">
      <view v-for="address in addresses" :key="address.id" class="address-card" @tap="selectAddress(address)">
        <view class="address-card__head">
          <text class="address-card__name">{{ address.receiverName }}</text>
          <text class="address-card__phone">{{ address.receiverPhone }}</text>
          <text v-if="address.isDefault" class="address-card__default">默认</text>
        </view>
        <text class="address-card__detail">{{ address.fullAddress }}</text>
        <view class="address-card__actions" @tap.stop>
          <text v-if="!address.isDefault" @tap="setDefault(address)">设为默认</text>
          <text @tap="editAddress(address.id)">编辑</text>
          <text class="address-card__delete" @tap="removeAddress(address.id)">删除</text>
        </view>
      </view>
    </view>

    <view class="addresses__footer">
      <button class="addresses__add" @tap="addAddress">新增收货地址</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { addressApi, type ShopAddress } from '@/api/modules/address'

const addresses = ref<ShopAddress[]>([])
const loading = ref(false)
const selectMode = ref(false)

async function loadAddresses() {
  loading.value = true
  try {
    addresses.value = await addressApi.list()
  } finally {
    loading.value = false
  }
}

function selectAddress(address: ShopAddress) {
  if (!selectMode.value) return
  uni.$emit('shop-address-selected', address)
  uni.navigateBack()
}

function addAddress() {
  uni.navigateTo({ url: '/pages/shop/address-edit' })
}

function editAddress(id: string) {
  uni.navigateTo({ url: `/pages/shop/address-edit?id=${id}` })
}

async function setDefault(address: ShopAddress) {
  await addressApi.update(address.id, { isDefault: true })
  await loadAddresses()
}

function removeAddress(id: string) {
  uni.showModal({
    title: '删除地址',
    content: '确定删除这个收货地址吗？',
    confirmText: '删除',
    success: async ({ confirm }) => {
      if (!confirm) return
      await addressApi.remove(id)
      await loadAddresses()
    },
  })
}

onLoad((options) => {
  selectMode.value = options?.select === '1'
  if (selectMode.value) uni.setNavigationBarTitle({ title: '选择收货地址' })
})
onShow(loadAddresses)
</script>

<style lang="scss" scoped>
.addresses {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  background: var(--color-bg);

  &__list { display: flex; flex-direction: column; gap: 16rpx; }
  &__state { padding: 180rpx 30rpx; color: var(--color-text-tertiary); font-size: 26rpx; text-align: center; }
  &__empty-title { display: block; color: var(--color-text); font-size: 30rpx; font-weight: 700; }
  &__empty-desc { display: block; margin-top: 12rpx; }
  &__footer { position: fixed; right: 0; bottom: 0; left: 0; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1rpx solid var(--color-border); }
  &__add { height: 84rpx; margin: 0; border-radius: var(--radius-round); background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 700; line-height: 84rpx; }
  &__add::after { border: 0; }
}

.address-card {
  padding: 24rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: var(--shadow-sm);

  &__head { display: flex; align-items: center; gap: 16rpx; }
  &__name { color: var(--color-text); font-size: 28rpx; font-weight: 700; }
  &__phone { color: var(--color-text-secondary); font-size: 24rpx; }
  &__default { padding: 3rpx 10rpx; border-radius: 6rpx; background: var(--color-primary-light); color: var(--color-primary); font-size: 20rpx; }
  &__detail { display: block; margin-top: 12rpx; color: var(--color-text-secondary); font-size: 25rpx; line-height: 40rpx; }
  &__actions { display: flex; justify-content: flex-end; gap: 28rpx; margin-top: 20rpx; padding-top: 18rpx; border-top: 1rpx solid var(--color-border); color: var(--color-primary); font-size: 23rpx; }
  &__delete { color: var(--color-danger); }
}
</style>
