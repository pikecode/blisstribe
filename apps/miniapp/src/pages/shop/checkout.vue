<template>
  <view class="checkout">
    <view v-if="selectedItems.length" class="checkout__items">
      <view v-for="item in selectedItems" :key="item.productId" class="checkout__item">
        <image
          v-if="item.product.images[0]"
          class="checkout__image"
          :src="item.product.images[0]"
          mode="aspectFill"
        />
        <view class="checkout__product">
          <text class="checkout__name">{{ item.product.name }}</text>
          <text class="checkout__meta">数量 {{ item.quantity }}</text>
        </view>
        <text class="checkout__price">¥{{ fenToYuan(item.product.priceFen * item.quantity) }}</text>
      </view>
    </view>

    <view class="checkout__section">
      <text class="checkout__heading">收货信息</text>
      <input v-model="receiverName" class="checkout__input" placeholder="收货人姓名" maxlength="40" />
      <input v-model="receiverPhone" class="checkout__input" placeholder="联系电话" type="number" maxlength="20" />
      <textarea
        v-model="shippingAddress"
        class="checkout__textarea"
        placeholder="详细收货地址"
        maxlength="200"
      />
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
import { onLoad } from '@dcloudio/uni-app'
import { cartApi, fenToYuan, type CartItem } from '@/api/modules/cart'
import { orderApi } from '@/api/modules/order'
import { useCartStore } from '@/stores/modules/cart'

const cartStore = useCartStore()
const selectedIds = ref<string[]>([])
const receiverName = ref('')
const receiverPhone = ref('')
const shippingAddress = ref('')
const remark = ref('')
const submitting = ref(false)
const selectedItems = computed(() =>
  cartStore.items.filter((item) => selectedIds.value.includes(item.id))
)
const totalFen = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.product.priceFen * item.quantity, 0)
)

onLoad(async (options) => {
  try {
    const parsed = JSON.parse(decodeURIComponent(options?.items || '[]')) as Array<{ id: string }>
    selectedIds.value = parsed.map((item) => String(item.id))
    cartStore.setCart(await cartApi.getCart())
  } catch {
    uni.showToast({ title: '结算商品加载失败', icon: 'none' })
    selectedIds.value = []
  }
})

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
        productId: item.productId,
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
    border: 1rpx solid var(--color-border);
    border-radius: 8rpx;
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
    border-radius: 6rpx;
    background: #f2f4f3;
  }

  &__product {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name { font-size: 27rpx; font-weight: 600; }
  &__meta { color: var(--color-text-secondary); font-size: 23rpx; }
  &__price { flex: 0 0 auto; font-size: 26rpx; font-weight: 600; }
  &__heading { display: block; margin-bottom: 16rpx; font-size: 28rpx; font-weight: 700; }
  &__input,
  &__textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 84rpx;
    margin-top: 12rpx;
    padding: 20rpx;
    border: 1rpx solid var(--color-border);
    border-radius: 6rpx;
    font-size: 26rpx;
    text-align: left;
  }

  &__textarea { height: 150rpx; }
  &__textarea--remark { height: 100rpx; }

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
  &__amount { color: #bd4b3c; font-size: 32rpx; font-weight: 700; }
  &__submit { width: 260rpx; margin: 0; border-radius: 6rpx; background: var(--color-primary); color: #fff; font-size: 28rpx; }
  &__submit[disabled] { opacity: 0.55; }
}
</style>
