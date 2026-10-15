<template>
  <view v-if="rows.length || error" class="goods-card">
    <text class="title">套餐实物</text><text class="note">已包含在套餐内，无需再次支付</text>
    <view v-if="error" class="empty" @tap="load">交付信息加载失败，点击重试</view>
    <view v-for="row in rows" :key="row.id" class="goods-item">
      <view class="head"><text>{{ row.name }}</text><text class="status">{{ statusText(row) }}</text></view>
      <text class="line">{{ Object.values(row.snapshot.specifications || {}).join(' / ') || '默认规格' }} · 共 {{ row.quantity }} 件 · 已退 {{ row.refundedQuantity }} 件</text>
      <text v-if="row.address" class="line">{{ row.address.receiverName }} {{ row.address.receiverPhone }}
{{ row.address.fullAddress }}</text>
      <text v-if="row.trackingNo" class="line" @tap="copyTracking(row)">{{ row.expressCompany }} · {{ row.trackingNo }}（点击复制）</text>
      <text class="line">退货规则：{{ row.returnNotice }}</text>
      <text v-if="row.frozenQuantity" class="line">退款处理中，暂不交付</text>
      <view v-else-if="row.quantity > row.refundedQuantity + row.deliveredQuantity" class="actions">
        <button v-if="row.method === 'shipping' && row.status === 'pending'" :disabled="submitting" @tap="chooseAddress(row)">{{ row.address ? '修改收货地址' : '选择收货地址' }}</button>
        <button v-if="['ready', 'shipped'].includes(row.status)" :disabled="submitting" @tap="receive(row)">{{ row.method === 'pickup' ? '确认已领取' : '确认已收货' }}</button>
      </view>
      <button v-if="row.status === 'delivered' && row.deliveredQuantity > 0" class="manage" :disabled="submitting" @tap="openReturn(row)">申请退货／反馈商品问题</button>
    </view>
    <view v-for="entry in returns" :key="`return-${entry.id}`" class="goods-item">
      <view class="head"><text>{{ entry.name }} · 退货 {{ entry.quantity }} 件</text><text class="status">{{ returnStatus(entry) }}</text></view><text class="line">{{ entry.reason }}</text><text v-if="entry.note" class="line">{{ entry.note }}</text><text v-if="entry.returnAddress" class="line">退回地址：{{ entry.returnAddress }}</text><text v-if="entry.deadline" class="line">请于 {{ new Date(entry.deadline).toLocaleDateString() }} 前寄回；无法按期寄回请联系客服</text><text v-if="entry.trackingNo" class="line">寄回：{{ entry.expressCompany }} {{ entry.trackingNo }}</text>
      <button v-if="entry.status === 'requested'" class="manage" :disabled="submitting" @tap="withdrawReturn(entry)">撤回申请</button><button v-if="entry.status === 'approved'" class="manage" @tap="openReturnShipping(entry)">填写寄回物流</button><button v-if="entry.refundId" class="manage" @tap="goRefund(entry.refundId)">查看退款进度</button>
    </view>
    <view v-if="returnVisible" class="mask" @tap="returnVisible = false"><view class="sheet" @tap.stop><view class="sheet-head"><text>{{ returnForm.shippingId ? '填写寄回物流' : '申请套餐商品退货' }}</text><text @tap="returnVisible = false">关闭</text></view>
      <template v-if="returnForm.shippingId"><input v-model="returnForm.expressCompany" class="return-input" placeholder="快递公司" maxlength="100" /><input v-model="returnForm.trackingNo" class="return-input" placeholder="寄回快递单号" maxlength="100" /></template>
      <template v-else><view class="return-type"><text @tap="returnForm.reasonType = 'personal'">{{ returnForm.reasonType === 'personal' ? '●' : '○' }} 个人原因</text><text @tap="returnForm.reasonType = 'quality'">{{ returnForm.reasonType === 'quality' ? '●' : '○' }} 质量／错发／缺损</text></view><view class="return-quantity"><text>退货数量</text><button @tap="returnForm.quantity = Math.max(1, returnForm.quantity - 1)">−</button><text>{{ returnForm.quantity }}</text><button @tap="returnForm.quantity = Math.min(returnForm.maxQuantity, returnForm.quantity + 1)">＋</button></view><text class="line">核验符合条件后，按原分摊金额退 ¥{{ (returnEstimateFen / 100).toFixed(2) }}，不重算其他服务和商品价格。</text><textarea v-model="returnForm.reason" class="return-input" maxlength="500" placeholder="描述商品问题或退货原因，不填写诊疗资料" /><view class="photos"><image v-for="url in returnForm.images" :key="url" :src="url" mode="aspectFill" @tap="previewPhoto(url)" /></view><button class="manage" :disabled="uploading || returnForm.images.length >= 6" @tap="addPhotos">{{ uploading ? '上传中...' : '添加问题照片（最多 6 张）' }}</button><text class="line">提交后等待审核，批准后再寄回。个人原因由患者承担寄回运费，质量问题由平台协调责任方承担。</text></template>
      <button class="manage" :disabled="submitting || uploading" @tap="submitReturn">{{ submitting ? '提交中...' : '确认提交' }}</button>
    </view></view>
    <view v-if="addressVisible" class="mask" @tap="addressVisible = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-head"><text>选择收货地址</text><text @tap="addressVisible = false">关闭</text></view>
        <scroll-view scroll-y class="addresses"><view v-for="address in addresses" :key="address.id" class="address" @tap="setAddress(address.id)"><text>{{ address.receiverName }} {{ address.receiverPhone }}</text><text class="line">{{ address.fullAddress }}</text></view><text v-if="!addresses.length" class="line">请先新增收货地址</text></scroll-view>
        <button class="manage" @tap="manageAddress">维护收货地址</button>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { serviceProgramApi, type ServiceGoods, type ServiceGoodsReturn } from '@/api/modules/service-program'
import { fileApi } from '@/api/modules/file'
import { addressApi, type ShopAddress } from '@/api/modules/address'
const props = defineProps<{ planId: number }>()
const emit = defineEmits<{ updated: [] }>()
const rows = ref<ServiceGoods[]>([])
const returns = ref<ServiceGoodsReturn[]>([])
const returnVisible = ref(false)
const uploading = ref(false)
const returnForm = reactive({ id: 0, shippingId: 0, maxQuantity: 1, quantity: 1, reason: '', reasonType: 'personal' as 'personal' | 'quality', clientRequestId: '', totalQuantity: 1, refundedQuantity: 0, allocatedAmountFen: 0, images: [] as string[], expressCompany: '', trackingNo: '' })
const returnEstimateFen = computed(() => Math.floor(returnForm.allocatedAmountFen * (returnForm.refundedQuantity + returnForm.quantity) / returnForm.totalQuantity) - Math.floor(returnForm.allocatedAmountFen * returnForm.refundedQuantity / returnForm.totalQuantity))
function openReturn(row: ServiceGoods) { Object.assign(returnForm, { id: row.id, shippingId: 0, maxQuantity: row.deliveredQuantity, quantity: row.deliveredQuantity, reason: '', reasonType: 'personal', clientRequestId: `return-${Date.now()}-${Math.random().toString(36).slice(2)}`, images: [], totalQuantity: row.quantity, refundedQuantity: row.refundedQuantity, allocatedAmountFen: row.allocatedAmountFen }); returnVisible.value = true }
function openReturnShipping(entry: ServiceGoodsReturn) { Object.assign(returnForm, { shippingId: entry.id, expressCompany: '', trackingNo: '' }); returnVisible.value = true }
function returnStatus(entry: ServiceGoodsReturn) { if (entry.refundStatus === 'success') return '退款成功'; return ({ requested: '待审核', approved: '等待寄回', shipped: '待核验', disputed: '异议处理中', refund_pending: '查看退款进度', rejected: '未通过', withdrawn: '已撤回', returned: '已退回' } as Record<string, string>)[entry.status] || entry.status }
async function addPhotos() { uploading.value = true; try { const picked = await uni.chooseImage({ count: 6 - returnForm.images.length, sizeType: ['compressed'] }); for (const path of picked.tempFilePaths) { const result = await fileApi.uploadServiceGoodsEvidence(path); returnForm.images.push(result.url) } } catch { /* 用户取消或请求层展示上传失败 */ } finally { uploading.value = false } }
function previewPhoto(url: string) { uni.previewImage({ urls: returnForm.images, current: url }) }
async function submitReturn() { if (submitting.value) return; if (returnForm.shippingId ? !returnForm.expressCompany.trim() || !returnForm.trackingNo.trim() : !returnForm.reason.trim()) { uni.showToast({ title: '请完整填写申请或物流信息', icon: 'none' }); return }; submitting.value = true; try { if (returnForm.shippingId) await serviceProgramApi.goodsReturnAction(returnForm.shippingId, { action: 'shipped', expressCompany: returnForm.expressCompany, trackingNo: returnForm.trackingNo }); else await serviceProgramApi.requestGoodsReturn(returnForm.id, { quantity: returnForm.quantity, reason: returnForm.reason, reasonType: returnForm.reasonType, clientRequestId: returnForm.clientRequestId, images: returnForm.images }); returnVisible.value = false; await load(); emit('updated') } catch { /* 请求层展示错误 */ } finally { submitting.value = false } }
async function withdrawReturn(entry: ServiceGoodsReturn) { const result = await uni.showModal({ title: '撤回退货申请', content: '尚未审核的申请可撤回，之后可按规则重新申请。' }); if (!result.confirm) return; submitting.value = true; try { await serviceProgramApi.goodsReturnAction(entry.id, { action: 'withdraw' }); await load(); emit('updated') } catch { /* 请求层展示错误 */ } finally { submitting.value = false } }
function goRefund(id: number) { uni.navigateTo({ url: `/pages/services/refund-detail?id=${id}` }) }
const error = ref(false)
const submitting = ref(false)
const addressVisible = ref(false)
const addresses = ref<ShopAddress[]>([])
const selectedGoodsId = ref(0)
async function load() { error.value = false; try { const [goodsRows, returnRows] = await Promise.all([serviceProgramApi.goods(props.planId), serviceProgramApi.goodsReturns(props.planId)]); rows.value = goodsRows; returns.value = returnRows } catch { rows.value = []; error.value = true } }
function statusText(row: ServiceGoods) { return row.quantity === row.refundedQuantity ? '已退款' : ({ pending: row.method === 'pickup' ? '待准备' : '待寄送', ready: '待领取', shipped: '已寄送', delivered: '已交付' } as Record<string, string>)[row.status] || row.status }
async function chooseAddress(row: ServiceGoods) { try { addresses.value = await addressApi.list(); selectedGoodsId.value = row.id; addressVisible.value = true } catch { /* 请求层展示错误 */ } }
async function setAddress(addressId: string) { if (submitting.value) return; submitting.value = true; try { await serviceProgramApi.goodsAction(selectedGoodsId.value, { action: 'address', addressId: Number(addressId) }); addressVisible.value = false; await load() } catch { /* 请求层展示错误 */ } finally { submitting.value = false } }
function manageAddress() { addressVisible.value = false; uni.navigateTo({ url: '/pages/shop/addresses' }) }
async function receive(row: ServiceGoods) { const result = await uni.showModal({ title: row.method === 'pickup' ? '确认领取' : '确认收货', content: `请确认已收到 ${row.name} ${row.quantity - row.refundedQuantity} 件，确认后会记录交付。`, confirmText: '已经收到' }); if (!result.confirm) return; submitting.value = true; try { await serviceProgramApi.goodsAction(row.id, { action: 'receive' }); uni.showToast({ title: '交付已确认', icon: 'success' }); await load(); emit('updated') } catch { /* 请求层展示错误 */ } finally { submitting.value = false } }
function copyTracking(row: ServiceGoods) { uni.setClipboardData({ data: `${row.expressCompany} ${row.trackingNo}` }) }
watch(() => props.planId, () => { void load() }, { immediate: true })
</script>
<style scoped>
.return-input { box-sizing:border-box; width:100%; padding:20rpx; margin:16rpx 0; border:1rpx solid var(--color-border); border-radius:12rpx; font-size:25rpx; min-height:80rpx; } textarea.return-input { height:140rpx; }.return-type { display:flex; gap:20rpx; font-size:24rpx; color:var(--color-primary); }.return-quantity { display:flex; align-items:center; gap:20rpx; margin:20rpx 0; font-size:25rpx; }.return-quantity button { margin:0; width:64rpx; padding:0; font-size:25rpx; }.photos { display:flex; gap:12rpx; flex-wrap:wrap; }.photos image { width:80rpx; height:80rpx; border-radius:8rpx; }

.goods-card { margin:20rpx 0; padding:28rpx; border-radius:20rpx; background:#fff; } .title { display:block; font-size:29rpx; font-weight:700; } .note,.line { display:block; margin-top:12rpx; color:var(--color-text-secondary); font-size:23rpx; line-height:1.6; white-space:pre-wrap; overflow-wrap:anywhere; } .goods-item { padding:24rpx 0; border-bottom:1rpx solid var(--color-border); }.goods-item:last-child { border:0; }.head { display:flex; justify-content:space-between; gap:20rpx; font-size:26rpx; font-weight:650; }.status { color:var(--color-primary); flex-shrink:0; }.actions { display:flex; flex-wrap:wrap; gap:16rpx; margin-top:18rpx; }.actions button,.manage { margin:0; padding:0 24rpx; border:1rpx solid var(--color-border); border-radius:12rpx; font-size:24rpx; background:#fff; color:var(--color-primary); }.empty { padding:20rpx 0; font-size:24rpx; color:var(--color-text-secondary); }.mask { position:fixed; inset:0; z-index:100; display:flex; align-items:flex-end; background:rgba(0,0,0,.4); }.sheet { width:100%; padding:28rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); border-radius:24rpx 24rpx 0 0; background:#fff; box-sizing:border-box; }.sheet-head { display:flex; justify-content:space-between; margin-bottom:20rpx; font-size:28rpx; font-weight:700; }.addresses { max-height:55vh; }.address { padding:24rpx 0; border-bottom:1rpx solid var(--color-border); font-size:26rpx; }.manage { width:100%; margin-top:24rpx; }
</style>
