<template>
  <view class="checkout">
    <view v-if="selectedItems.length" class="checkout__items">
      <view v-for="item in selectedItems" :key="item.skuId" class="checkout__item">
        <image
          v-if="item.sku.product.images[0]"
          class="checkout__image"
          :src="item.sku.product.images[0]"
          mode="aspectFill"
        />
        <view class="checkout__product">
          <text class="checkout__name">{{ item.sku.product.name }}</text>
          <text v-if="Object.keys(item.sku.specifications).length" class="checkout__meta">
            {{ Object.entries(item.sku.specifications).map(([key, value]) => `${key}：${value}`).join(' / ') }}
          </text>
          <text class="checkout__meta">数量 {{ item.quantity }}</text>
        </view>
        <text class="checkout__price">¥{{ fenToYuan(item.sku.priceFen * item.quantity) }}</text>
      </view>
    </view>

    <view class="checkout__section">
      <view class="checkout__heading-row">
        <text class="checkout__heading">收货地址</text>
        <view class="checkout__address-actions">
          <text @tap="chooseAddress">{{ hasAddress ? '更换' : '地址管理' }}</text>
        </view>
      </view>

      <view v-if="hasAddress" class="checkout__address" @tap="chooseAddress">
        <view class="checkout__address-contact">
          <text class="checkout__address-name">{{ receiverName }}</text>
          <text class="checkout__address-phone">{{ receiverPhone }}</text>
        </view>
        <text class="checkout__address-detail">{{ shippingAddress }}</text>
        <text class="checkout__address-arrow">›</text>
      </view>

      <view v-else class="checkout__address-empty" @tap="chooseAddress">
        <text class="checkout__address-plus">＋</text>
        <view>
          <text class="checkout__address-empty-title">添加收货地址</text>
          <text class="checkout__address-empty-desc">保存后下次下单可以直接使用</text>
        </view>
        <text class="checkout__address-arrow">›</text>
      </view>

    </view>

    <view class="checkout__section">
      <text class="checkout__heading">订单备注</text>
      <textarea v-model="remark" class="checkout__textarea checkout__textarea--remark" placeholder="订单备注（选填）" maxlength="200" />
    </view>

    <view class="checkout__footer">
      <view class="checkout__total">
        <text>商品金额</text>
        <text class="checkout__amount">¥{{ fenToYuan(totalFen) }}</text>
      </view>
      <button class="checkout__submit" :disabled="submitting || !selectedItems.length" @tap="submitOrder">
        {{ submitting ? '提交中...' : '提交订单' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { cartApi, fenToYuan, type CartItem } from '@/api/modules/cart'
import { orderApi } from '@/api/modules/order'
import { addressApi, type ShopAddress } from '@/api/modules/address'
import { useCartStore } from '@/stores/modules/cart'

const cartStore = useCartStore()
const selectedIds = ref<string[]>([])
const receiverName = ref('')
const receiverPhone = ref('')
const shippingAddress = ref('')
const remark = ref('')
const submitting = ref(false)
const selectedAddressId = ref('')
const hasAddress = computed(() => Boolean(
  receiverName.value.trim() && receiverPhone.value.trim() && shippingAddress.value.trim()
))
const selectedItems = computed(() =>
  cartStore.items.filter((item) => selectedIds.value.includes(item.id))
)
const totalFen = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.sku.priceFen * item.quantity, 0)
)

function applyAddress(address: ShopAddress) {
  selectedAddressId.value = address.id
  receiverName.value = address.receiverName
  receiverPhone.value = address.receiverPhone
  shippingAddress.value = address.fullAddress
}

function chooseAddress() {
  uni.navigateTo({ url: '/pages/shop/addresses?select=1' })
}

async function loadDefaultAddress() {
  if (selectedAddressId.value) return
  const addresses = await addressApi.list()
  const address = addresses.find((item) => item.isDefault) || addresses[0]
  if (address) applyAddress(address)
}

onLoad(async (options) => {
  uni.$on('shop-address-selected', applyAddress)
  try {
    const parsed = JSON.parse(decodeURIComponent(options?.items || '[]')) as Array<{ id: string }>
    selectedIds.value = parsed.map((item) => String(item.id))
    cartStore.setCart(await cartApi.getCart())
  } catch {
    uni.showToast({ title: '结算商品加载失败', icon: 'none' })
    selectedIds.value = []
  }
})
onShow(loadDefaultAddress)
onUnload(() => uni.$off('shop-address-selected', applyAddress))

async function submitOrder() {
  if (submitting.value) return
  if (!selectedItems.value.length) {
    uni.showToast({ title: '没有可结算的商品', icon: 'none' })
    return
  }
  if (!receiverName.value.trim() || !receiverPhone.value.trim() || !shippingAddress.value.trim()) {
    uni.showToast({ title: '请填写完整收货信息', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const order = await orderApi.create({
      items: selectedItems.value.map((item) => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
      receiverName: receiverName.value.trim(),
      receiverPhone: receiverPhone.value.trim(),
      shippingAddress: shippingAddress.value.trim(),
      remark: remark.value.trim() || undefined,
    })
    cartStore.setCart(await cartApi.getCart())
    uni.redirectTo({ url: `/pages/shop/order-detail?id=${order.id}` })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.checkout {
  min-height: 100vh;
  padding: 24rpx 24rpx 180rpx;
  background: var(--color-bg);
  color: var(--color-text);

  &__items,
  &__section {
    margin-bottom: 20rpx;
    padding: 24rpx;
    background: #fff;
    border-radius: 18rpx;
    box-shadow: var(--shadow-sm);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 20rpx;
    min-height: 112rpx;
    border-bottom: 1rpx solid var(--color-border);

    &:last-child { border-bottom: 0; }
  }

  &__image {
    width: 96rpx;
    height: 96rpx;
    flex: 0 0 96rpx;
    border-radius: 12rpx;
    background: #f2f4f3;
  }

  &__product {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name { font-size: 27rpx; font-weight: 700; }
  &__meta { color: var(--color-text-secondary); font-size: 23rpx; }
  &__price { flex: 0 0 auto; color: #d04a36; font-size: 27rpx; font-weight: 800; }
  &__heading { display: block; font-size: 28rpx; font-weight: 700; }
  &__heading-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
  &__address-actions { display: flex; gap: 24rpx; color: var(--color-primary); font-size: 23rpx; }
  &__address,
  &__address-empty {
    position: relative;
    min-height: 112rpx;
    padding: 22rpx 52rpx 22rpx 22rpx;
    border-radius: 16rpx;
    background: var(--color-primary-soft);
  }
  &__address-contact { display: flex; align-items: center; gap: 18rpx; margin-bottom: 10rpx; }
  &__address-name { color: var(--color-text); font-size: 27rpx; font-weight: 700; }
  &__address-phone { color: var(--color-text-secondary); font-size: 24rpx; }
  &__address-detail { display: block; color: var(--color-text-secondary); font-size: 24rpx; line-height: 38rpx; }
  &__address-arrow { position: absolute; top: 50%; right: 20rpx; color: var(--color-text-tertiary); font-size: 38rpx; transform: translateY(-50%); }
  &__address-empty { display: flex; align-items: center; gap: 18rpx; }
  &__address-plus { width: 58rpx; height: 58rpx; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); font-size: 34rpx; line-height: 56rpx; text-align: center; }
  &__address-empty-title { display: block; color: var(--color-text); font-size: 26rpx; font-weight: 700; }
  &__address-empty-desc { display: block; margin-top: 6rpx; color: var(--color-text-tertiary); font-size: 22rpx; }
  &__textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 84rpx;
    margin-top: 12rpx;
    padding: 20rpx;
    border: 1rpx solid var(--color-border);
    border-radius: 14rpx;
    background: var(--color-bg-subtle);
    font-size: 26rpx;
    text-align: left;
  }

  &__textarea--remark { height: 100rpx; margin-top: 18rpx; }

  &__footer {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 1rpx solid var(--color-border);
  }

  &__total { display: flex; flex-direction: column; gap: 6rpx; color: var(--color-text-secondary); font-size: 22rpx; }
  &__amount { color: #d04a36; font-size: 34rpx; font-weight: 800; }
  &__submit { width: 260rpx; height: 84rpx; margin: 0; border-radius: var(--radius-round); background: var(--color-primary); color: #fff; font-size: 28rpx; font-weight: 700; box-shadow: var(--shadow-action); }
  &__submit[disabled] { opacity: 0.55; }
}
</style>
