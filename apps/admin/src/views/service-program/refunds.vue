<template>
  <div class="refund-page">
    <el-tabs v-model="status" class="status-tabs" @tab-change="load">
      <el-tab-pane v-for="tab in tabs" :key="tab.value" :label="tab.label" :name="tab.value" />
    </el-tabs>
    <AdminListTable :data="refunds" :loading="loading" :error="listError" row-key="id" @retry="load">
      <el-table-column label="退款编号" min-width="205"><template #default="{ row }"><el-button type="primary" link class="identifier" @click="openDetail(row)">{{ row.refundNo }}</el-button><div class="sub-text">{{ row.order.orderNo }}</div></template></el-table-column>
      <el-table-column label="患者" min-width="135"><template #default="{ row }"><div class="main-text">{{ row.user.nickname || '微信用户' }}</div><div class="sub-text">{{ row.user.phoneMasked }}</div></template></el-table-column>
      <el-table-column label="服务方案" min-width="180"><template #default="{ row }"><div class="main-text">{{ row.order.offering.name }}</div><div class="sub-text">{{ row.order.institution.name }}</div></template></el-table-column>
      <el-table-column label="退款内容" min-width="170"><template #default="{ row }"><div v-for="item in row.items" :key="item.id" class="item-line">{{ item.entitlement.orderItem.itemName }} {{ item.compensation ? '· 例外资金补偿' : `× ${item.quantity}` }}</div></template></el-table-column>
      <el-table-column label="申请金额" width="120" align="right"><template #default="{ row }"><strong class="amount">¥{{ (row.requestedAmountFen / 100).toFixed(2) }}</strong></template></el-table-column>
      <el-table-column label="状态" width="115" align="center"><template #default="{ row }"><el-tag :type="statusMeta(row.status).type" effect="light">{{ statusMeta(row.status).text }}</el-tag></template></el-table-column>
      <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="88" fixed="right" align="center"><template #default="{ row }"><AdminListActions :show-more="row.status === 'processing'"><AdminListAction label="详情" icon="View" @click="openDetail(row)" /><AdminListAction v-if="row.status === 'pending'" label="审核" icon="DocumentChecked" @click="openReview(row)" /><template #more><el-dropdown-item v-if="row.status === 'processing'" :disabled="querying" @click="queryProvider(row)">查询微信结果</el-dropdown-item></template></AdminListActions></template></el-table-column>
    </AdminListTable>

    <el-drawer v-model="detailVisible" title="服务退款详情" size="600px">
      <div v-if="selected" class="detail">
        <section class="overview"><div><el-tag :type="statusMeta(selected.status).type">{{ statusMeta(selected.status).text }}</el-tag><h3>{{ selected.order.offering.name }}</h3><p>{{ selected.user.nickname || '微信用户' }} · {{ selected.user.phoneMasked }}</p></div><div><span>申请退款</span><strong>¥{{ (selected.requestedAmountFen / 100).toFixed(2) }}</strong></div></section>
        <section class="panel"><h4>退款内容</h4><div v-for="item in selected.items" :key="item.id" class="detail-row"><span>{{ item.entitlement.orderItem.itemName }} {{ item.compensation ? '· 例外资金补偿' : `× ${item.quantity}` }}</span><strong>¥{{ (item.amountFen / 100).toFixed(2) }}</strong></div></section>
        <section class="panel"><h4>申请与渠道</h4><dl><div><dt>退款编号</dt><dd>{{ selected.refundNo }}</dd></div><div><dt>申请原因</dt><dd>{{ selected.reason }}</dd></div><div><dt>微信状态</dt><dd>{{ selected.lastProviderStatus || '尚未提交' }}</dd></div><div v-if="selected.wechatRefundId"><dt>微信退款单号</dt><dd>{{ selected.wechatRefundId }}</dd></div><div v-if="selected.adminNote"><dt>审核说明</dt><dd>{{ selected.adminNote }}</dd></div></dl></section>
        <section v-if="selected.events.length" class="panel"><h4>处理记录</h4><el-timeline><el-timeline-item v-for="event in [...selected.events].reverse()" :key="event.id" :timestamp="formatDateTime(event.createdAt)" placement="top"><strong>{{ eventText(event.eventType) }}</strong><p>{{ event.detail }}</p></el-timeline-item></el-timeline></section>
      </div>
      <template #footer><div class="drawer-footer"><el-button @click="detailVisible = false">关闭</el-button><el-button v-if="selected?.status === 'processing' && selected.lastProviderStatus === 'CLOSED'" @click="resolveClosed">处理渠道关闭</el-button><el-button v-if="selected?.status === 'processing'" type="primary" :loading="querying" @click="queryProvider(selected)">查询微信结果</el-button><el-button v-if="selected?.status === 'pending'" type="primary" @click="detailVisible = false; openReview(selected)">审核退款</el-button></div></template>
    </el-drawer>

    <el-dialog v-model="reviewVisible" title="审核服务退款" width="520px" destroy-on-close>
      <el-alert :title="selected?.requestedAmountFen === 0 ? '零元商品仅终结权益，不向微信提交资金退款。' : '批准后将立即向微信提交退款。微信确认成功前，患者端保持“退款处理中”。'" type="warning" :closable="false" show-icon />
      <div v-if="selected" class="review-summary"><span>申请金额</span><strong>¥{{ (selected.requestedAmountFen / 100).toFixed(2) }}</strong><p>{{ selected.reason }}</p></div>
      <el-form label-position="top"><el-form-item label="审核说明"><el-input v-model="adminNote" type="textarea" :rows="3" maxlength="500" placeholder="拒绝时必须填写原因；批准时可填写处理说明" /></el-form-item></el-form>
      <template #footer><el-button :loading="submitting" @click="review(false)">拒绝申请</el-button><el-button type="primary" :loading="submitting" @click="review(true)">{{ selected?.requestedAmountFen === 0 ? '批准终结零元权益' : '批准并提交微信' }}</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminListAction from '@/components/AdminListAction.vue'
import AdminListActions from '@/components/AdminListActions.vue'
import AdminListTable from '@/components/AdminListTable.vue'
import { serviceProgramApi, type ServiceRefund } from '@/api/service-program'

const route = useRoute()
const status = ref('pending')
const tabs = [{ label: '待审核', value: 'pending' }, { label: '退款处理中', value: 'processing' }, { label: '退款成功', value: 'success' }, { label: '未通过', value: 'rejected' }, { label: '全部', value: '' }]
const refunds = ref<ServiceRefund[]>([])
const selected = ref<ServiceRefund | null>(null)
const loading = ref(false)
const submitting = ref(false)
const querying = ref(false)
const listError = ref('')
const detailVisible = ref(false)
const reviewVisible = ref(false)
const adminNote = ref('')
async function load() { loading.value = true; listError.value = ''; try { refunds.value = await serviceProgramApi.listRefunds(status.value) } catch { listError.value = '服务退款列表加载失败，请重试' } finally { loading.value = false } }
async function openDetail(row: ServiceRefund) { try { selected.value = await serviceProgramApi.getRefund(row.id); detailVisible.value = true } catch { /* 请求层已提示 */ } }
function openReview(row: ServiceRefund) { selected.value = row; adminNote.value = ''; reviewVisible.value = true }
async function review(approved: boolean) {
  if (!selected.value || submitting.value) return
  if (!approved && !adminNote.value.trim()) { ElMessage.warning('拒绝退款必须填写原因'); return }
  const message = approved ? (selected.value.requestedAmountFen === 0 ? '批准后终结零元商品权益，无资金退回，确认继续？' : '批准后会立即提交微信退款，确认继续？') : '确认拒绝本次退款申请并恢复被冻结权益？'
  await ElMessageBox.confirm(message, approved ? '批准退款' : '拒绝退款', { type: 'warning', confirmButtonText: '确认处理' })
  submitting.value = true
  try { const result = await serviceProgramApi.reviewRefund(selected.value.id, { approved, adminNote: adminNote.value.trim() }); ElMessage.success(approved ? (result.status === 'success' ? '退款成功' : '已提交微信退款') : '申请已拒绝'); reviewVisible.value = false; await load() } finally { submitting.value = false }
}
async function resolveClosed() {
  if (!selected.value) return
  await ElMessageBox.confirm('系统会再次核对微信关闭结果，确认未退款后释放权益冻结。患者可重新申请退款。', '处理渠道关闭', { type: 'warning' })
  querying.value = true
  try { selected.value = await serviceProgramApi.resolveClosedRefund(selected.value.id); ElMessage.success('渠道结果已核对，冻结已释放'); await load() } finally { querying.value = false }
}
async function queryProvider(row: ServiceRefund) { querying.value = true; try { const result = await serviceProgramApi.queryRefundProvider(row.id); selected.value = result; ElMessage.success(result.status === 'success' ? '微信已确认退款成功' : '渠道状态已更新'); await load() } finally { querying.value = false } }
function formatDateTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
function eventText(type: string) { return ({ request_submitted: '患者提交申请', approved: '管理员批准', rejected: '管理员拒绝', withdrawn: '患者撤回', provider_result_unknown: '提交结果待确认', provider_query: '查询微信结果', provider_success: '微信退款成功', dispute_compensation: '已接受异议方案，待退费审核', zero_amount_completed: '零元商品权益已终结' } as Record<string, string>)[type] || '状态更新' }
function statusMeta(value: string): { text: string; type: 'warning' | 'primary' | 'success' | 'danger' | 'info' } { const map: Record<string, { text: string; type: 'warning' | 'primary' | 'success' | 'danger' | 'info' }> = { pending: { text: '待审核', type: 'warning' }, processing: { text: '退款处理中', type: 'primary' }, success: { text: '退款成功', type: 'success' }, rejected: { text: '未通过', type: 'danger' }, withdrawn: { text: '已撤回', type: 'info' } }; return map[value] || { text: value, type: 'info' } }
function applyQuery() { const value = String(route.query.status ?? 'pending'); status.value = tabs.some(tab => tab.value === value) ? value : 'pending' }
watch(() => route.query.status, () => { applyQuery(); void load() })
onMounted(() => { applyQuery(); void load() })
</script>

<style scoped>
.refund-page { display: flex; flex-direction: column; gap: 16px; }
.status-tabs { padding: 0 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); }
.status-tabs :deep(.el-tabs__header) { margin: 0; }
.identifier { padding: 0; font-weight: 650; }
.main-text, .item-line { color: var(--el-text-color-primary); font-weight: 600; }
.sub-text { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.item-line + .item-line { margin-top: 4px; }
.amount { color: var(--el-color-danger); }
.overview { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 20px; border-radius: 14px; background: var(--el-fill-color-light); }
.overview h3 { margin: 13px 0 5px; font-size: 20px; }
.overview p { margin: 0; color: var(--el-text-color-secondary); }
.overview > div:last-child { text-align: right; }
.overview > div:last-child span { display: block; color: var(--el-text-color-secondary); font-size: 12px; }
.overview > div:last-child strong { display: block; margin-top: 6px; color: var(--el-color-danger); font-size: 26px; }
.panel { margin-top: 18px; padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; }
.panel h4 { margin: 0 0 14px; }
.detail-row, dl > div { display: flex; justify-content: space-between; gap: 20px; padding: 11px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.detail-row:last-child, dl > div:last-child { border-bottom: 0; }
dl { margin: 0; } dt { flex: 0 0 96px; color: var(--el-text-color-secondary); } dd { margin: 0; text-align: right; word-break: break-all; }
.panel :deep(.el-timeline) { padding-left: 4px; }
.panel :deep(.el-timeline-item__content) p { margin: 5px 0 0; color: var(--el-text-color-secondary); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; }
.review-summary { margin: 18px 0; padding: 16px; border-radius: 10px; background: var(--el-fill-color-light); }
.review-summary span { color: var(--el-text-color-secondary); }
.review-summary strong { float: right; color: var(--el-color-danger); font-size: 20px; }
.review-summary p { clear: both; margin: 14px 0 0; color: var(--el-text-color-regular); }
</style>
