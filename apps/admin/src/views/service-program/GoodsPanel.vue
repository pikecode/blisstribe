<template>
  <section class="goods-panel">
    <h4>套餐实物交付</h4>
    <el-alert v-if="error" title="商品交付加载失败" type="error" :closable="false"><el-button link @click="load">重试</el-button></el-alert>
    <div v-loading="loading">
      <p v-if="!rows.length && !error" class="muted">该套餐不含实物</p>
      <article v-for="row in rows" :key="row.id">
        <header><strong>{{ row.name }}</strong><el-tag>{{ statusText(row) }}</el-tag></header>
        <p>{{ Object.values(row.snapshot.specifications || {}).join(' / ') || '默认规格' }} · 共 {{ row.quantity }} 件 · 已退 {{ row.refundedQuantity }} 件 · 已交付 {{ row.deliveredQuantity }} 件</p>
        <p v-if="row.address">{{ row.address.receiverName }} {{ row.address.receiverPhone }}<br>{{ row.address.fullAddress }}</p>
        <p v-if="row.trackingNo">{{ row.expressCompany }} · {{ row.trackingNo }}</p>
        <p v-if="row.frozenQuantity">{{ row.frozenQuantity }} 件退款处理中，暂停交付</p>
        <div v-else-if="row.quantity > row.refundedQuantity + row.deliveredQuantity" class="actions">
          <el-button v-if="row.method === 'pickup' && row.status === 'pending'" size="small" :disabled="submitting" @click="ready(row)">登记可领取</el-button>
          <el-button v-if="row.method === 'shipping' && row.status === 'pending'" size="small" :disabled="submitting || !row.address" @click="openShipping(row)">{{ row.address ? '登记寄送' : '等待患者填写地址' }}</el-button>
          <el-button v-if="row.status === 'shipped'" size="small" :disabled="submitting" @click="recover(row)">凭依据撤回寄送</el-button>
          <el-button v-if="['ready', 'shipped'].includes(row.status)" size="small" :disabled="submitting" @click="receive(row)">凭依据代确认交付</el-button>
        </div>
      </article>
    </div>
    <article v-for="entry in returns" :key="`return-${entry.id}`">
      <header><strong>{{ entry.name }} · 退货 {{ entry.quantity }} 件</strong><el-tag>{{ returnStatus(entry) }}</el-tag></header>
      <p>{{ entry.reason }}</p><p v-if="entry.note">处理说明：{{ entry.note }}</p><p v-if="entry.returnAddress">退回信息：{{ entry.returnAddress }}</p><p v-if="entry.trackingNo">寄回物流：{{ entry.expressCompany }} {{ entry.trackingNo }}</p>
      <el-image v-for="url in entry.images" :key="url" :src="url" :preview-src-list="entry.images" preview-teleported style="width:64px;height:64px;margin:4px" fit="cover" />
      <div class="actions"><el-button v-if="['requested', 'approved'].includes(entry.status)" size="small" @click="openReturn(entry, 'approve')">{{ entry.status === 'approved' ? '更新地址／延期' : '批准退货' }}</el-button><el-button v-if="entry.status === 'requested'" size="small" @click="openReturn(entry, 'reject')">拒绝并说明原因</el-button><el-button v-if="['approved','shipped','disputed'].includes(entry.status) || (entry.status === 'refund_pending' && ['rejected','withdrawn'].includes(entry.refundStatus || ''))" size="small" @click="openReturn(entry, 'inspect')">核验通过并生成退款</el-button><el-button v-if="['approved','shipped','disputed'].includes(entry.status)" size="small" @click="openReturn(entry, 'dispute')">核验异议</el-button><span v-if="entry.refundId">关联退款 #{{ entry.refundId }}，财务在服务退款列表审核</span></div>
    </article>
    <el-dialog v-model="returnVisible" title="处理套餐商品退货" width="520px" append-to-body>
      <el-alert v-if="returnForm.action === 'inspect'" title="确认已收到实物且符合退货条件。生成申请后仍需财务审核和微信确认退款结果。" :closable="false" />
      <el-form label-position="top" style="margin-top:16px"><el-form-item v-if="returnForm.action === 'approve'" label="退货地址与联系人"><el-input v-model="returnForm.returnAddress" type="textarea" maxlength="500" placeholder="包含退回地址、联系人和电话；保存后寄回期限为 7 天" /></el-form-item><el-form-item label="处理依据与说明（患者可见）"><el-input v-model="returnForm.note" type="textarea" :rows="3" maxlength="1000" placeholder="核验数量、商品状态、运费承担及处理依据" /></el-form-item><el-checkbox v-if="returnForm.action === 'inspect'" v-model="returnForm.reusable">实物检验合格，可以重新销售</el-checkbox></el-form>
      <template #footer><el-button @click="returnVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="saveReturn">确认处理</el-button></template>
    </el-dialog>
    <el-dialog v-model="shippingVisible" title="登记套餐商品寄送" width="460px" append-to-body>
      <el-alert title="确认实物已经交给快递；保存后患者可查看物流。" type="info" :closable="false" />
      <el-form label-position="top" style="margin-top:16px"><el-form-item label="快递公司"><el-input v-model="shipping.expressCompany" maxlength="100" /></el-form-item><el-form-item label="快递单号"><el-input v-model="shipping.trackingNo" maxlength="100" /></el-form-item></el-form>
      <template #footer><el-button @click="shippingVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="ship">确认寄送</el-button></template>
    </el-dialog>
  </section>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { serviceProgramApi, type ServiceGoods, type ServiceGoodsReturn } from '@/api/service-program'
const props = defineProps<{ planId: number }>()
const rows = ref<ServiceGoods[]>([])
const returns = ref<ServiceGoodsReturn[]>([])
const returnVisible = ref(false)
const returnForm = reactive({ id: 0, action: 'approve' as 'approve' | 'reject' | 'inspect' | 'dispute', note: '', returnAddress: '', reusable: false })
function openReturn(entry: ServiceGoodsReturn, action: typeof returnForm.action) { Object.assign(returnForm, { id: entry.id, action, note: '', returnAddress: entry.returnAddress, reusable: false }); returnVisible.value = true }
function returnStatus(entry: ServiceGoodsReturn) { if (entry.refundStatus === 'success') return '退款成功'; return ({ requested: '退货待审核', approved: '等待寄回', shipped: '已寄回待核验', disputed: '核验异议处理中', refund_pending: '已核验，查看退款进度', rejected: '退货未通过', withdrawn: '已撤回', returned: '零元商品已退回' } as Record<string, string>)[entry.status] || entry.status }
async function saveReturn() { if (!returnForm.note.trim() || (returnForm.action === 'approve' && !returnForm.returnAddress.trim())) { ElMessage.warning('请完整填写处理说明及退回信息'); return }; submitting.value = true; try { await serviceProgramApi.goodsReturnAction(returnForm.id, { action: returnForm.action, note: returnForm.note, returnAddress: returnForm.action === 'approve' ? returnForm.returnAddress : undefined, reusable: returnForm.action === 'inspect' ? returnForm.reusable : undefined }); returnVisible.value = false; await load() } finally { submitting.value = false } }
const loading = ref(false)
const error = ref(false)
const submitting = ref(false)
const shippingVisible = ref(false)
const shipping = reactive({ id: 0, expressCompany: '', trackingNo: '' })
let loadVersion = 0
async function load() { const version = ++loadVersion; loading.value = true; error.value = false; try { const [result, returnRows] = await Promise.all([serviceProgramApi.goods(props.planId), serviceProgramApi.goodsReturns(props.planId)]); if (version === loadVersion) { rows.value = result; returns.value = returnRows } } catch { if (version === loadVersion) error.value = true } finally { if (version === loadVersion) loading.value = false } }
function statusText(row: ServiceGoods) { return row.refundedQuantity === row.quantity ? '已退款' : ({ pending: row.method === 'pickup' ? '待准备' : '待寄送', ready: '待领取', shipped: '已寄送', delivered: '已交付' } as Record<string, string>)[row.status] || row.status }
async function ready(row: ServiceGoods) { try { await ElMessageBox.confirm('请确认商品已备妥，患者会收到领取提醒。', '登记可领取', { confirmButtonText: '确认', cancelButtonText: '返回' }) } catch { return }; submitting.value = true; try { await serviceProgramApi.goodsAction(row.id, { action: 'ready' }); await load() } finally { submitting.value = false } }
async function recover(row: ServiceGoods) { let evidence: string; try { const result = await ElMessageBox.prompt('仅在快递拦截成功且实物已取回后操作。填写取回依据，之后患者可申请未交付退款。', '撤回寄送', { inputType: 'textarea', inputValidator: value => !!value?.trim() && value.length <= 500 || '请填写取回依据', confirmButtonText: '确认已取回', cancelButtonText: '返回' }); evidence = result.value } catch { return }; submitting.value = true; try { await serviceProgramApi.goodsAction(row.id, { action: 'recover', evidence }); await load() } finally { submitting.value = false } }
function openShipping(row: ServiceGoods) { Object.assign(shipping, { id: row.id, expressCompany: '', trackingNo: '' }); shippingVisible.value = true }
async function ship() { if (!shipping.expressCompany.trim() || !shipping.trackingNo.trim()) { ElMessage.warning('请填写快递公司和单号'); return }; submitting.value = true; try { await serviceProgramApi.goodsAction(shipping.id, { action: 'ship', expressCompany: shipping.expressCompany, trackingNo: shipping.trackingNo }); shippingVisible.value = false; await load() } finally { submitting.value = false } }
async function receive(row: ServiceGoods) { let evidence: string; try { const result = await ElMessageBox.prompt('患者无法自行确认时，填写签收凭据或现场交付依据，操作会被审计。', '代确认交付', { inputType: 'textarea', inputValidator: value => !!value?.trim() && value.length <= 500 || '请填写 1 至 500 字', confirmButtonText: '确认已交付', cancelButtonText: '返回' }); evidence = result.value } catch { return }; submitting.value = true; try { await serviceProgramApi.goodsAction(row.id, { action: 'receive', evidence }); await load() } finally { submitting.value = false } }
watch(() => props.planId, () => { rows.value = []; void load() }, { immediate: true })
</script>
<style scoped>
.goods-panel { margin-top:18px; padding:18px; border:1px solid var(--el-border-color-lighter); border-radius:12px; } h4 { margin:0 0 12px; } article { padding:16px 0; border-bottom:1px solid var(--el-border-color-lighter); } article:last-child { border:0; } header { display:flex; justify-content:space-between; gap:12px; } p { color:var(--el-text-color-regular); font-size:13px; line-height:1.6; overflow-wrap:anywhere; } .muted { color:var(--el-text-color-secondary); } .actions { display:flex; flex-wrap:wrap; gap:8px; }
</style>
