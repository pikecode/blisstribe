<template>
  <div class="orders-page">
    <AdminListToolbar>
      <div class="toolbar-filters">
        <el-input v-model="filters.keyword" placeholder="订单号 / 患者昵称 / 手机号" clearable style="width: 260px" @keyup.enter="search" />
        <el-button type="primary" @click="search">搜索</el-button>
        <el-select v-model="filters.institutionId" placeholder="履约机构" clearable style="width: 180px" @change="search"><el-option v-for="item in institutions" :key="item.id" :label="item.name" :value="item.id" /></el-select>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </div>
    </AdminListToolbar>
    <el-tabs v-model="filters.status" class="status-tabs" @tab-change="search"><el-tab-pane v-for="tab in tabs" :key="tab.value" :label="tab.label" :name="tab.value" /></el-tabs>
    <AdminListTable :data="orders" :loading="loading" :error="listError" row-key="id" @retry="load">
      <el-table-column label="订单号" min-width="235"><template #default="{ row }"><el-button type="primary" link class="identifier" @click="openDetail(row)">{{ row.orderNo }}</el-button><div class="sub-text">{{ formatDateTime(row.createdAt) }}</div></template></el-table-column>
      <el-table-column label="患者" min-width="130"><template #default="{ row }"><div class="main-text">{{ row.user.nickname || '微信用户' }}</div><div class="sub-text">{{ row.user.phoneMasked }}</div></template></el-table-column>
      <el-table-column label="服务方案" min-width="190"><template #default="{ row }"><div class="main-text">{{ row.offering.name }}</div><div class="sub-text">{{ row.institution.name }}</div></template></el-table-column>
      <el-table-column label="实付金额" width="115" align="right"><template #default="{ row }"><strong class="amount">¥{{ (row.paymentAmountFen / 100).toFixed(2) }}</strong><div v-if="row.refundedAmountFen" class="sub-text">已退 ¥{{ (row.refundedAmountFen / 100).toFixed(2) }}</div></template></el-table-column>
      <el-table-column label="支付" width="105" align="center"><template #default="{ row }"><el-tag :type="paymentMeta(row.paymentStatus).type" effect="light">{{ paymentMeta(row.paymentStatus).text }}</el-tag></template></el-table-column>
      <el-table-column label="服务状态" width="115" align="center"><template #default="{ row }"><el-tag :type="orderMeta(row.status).type" effect="light">{{ planText(row) }}</el-tag></template></el-table-column>
      <el-table-column label="权益进度" min-width="140"><template #default="{ row }"><div v-if="row.plan" class="rights"><span>可用 {{ sumRight(row, 'availableQuantity') }}</span><span>预约 {{ sumRight(row, 'reservedQuantity') }}</span><span>完成 {{ sumRight(row, 'usedQuantity') }}</span></div><span v-else class="sub-text">尚未发放</span></template></el-table-column>
      <el-table-column label="操作" width="58" fixed="right" align="center"><template #default="{ row }"><AdminListAction label="查看详情" icon="View" @click="openDetail(row)" /></template></el-table-column>
    </AdminListTable>
    <AdminListPagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :disabled="loading" @change="load" />

    <el-drawer v-model="detailVisible" title="服务订单详情" size="680px">
      <div v-if="selected" class="detail">
        <section class="overview"><div><el-tag :type="orderMeta(selected.status).type">{{ planText(selected) }}</el-tag><h3>{{ selected.offering.name }}</h3><p>{{ selected.institution.name }}</p></div><div><span>实付金额</span><strong>¥{{ (selected.paymentAmountFen / 100).toFixed(2) }}</strong></div></section>
        <section class="panel"><h4>订单信息</h4><dl><div><dt>订单编号</dt><dd>{{ selected.orderNo }}</dd></div><div><dt>患者</dt><dd>{{ selected.user.nickname || '微信用户' }} · {{ selected.user.phoneMasked }}</dd></div><div><dt>支付状态</dt><dd>{{ paymentMeta(selected.paymentStatus).text }}</dd></div><div><dt>支付时间</dt><dd>{{ selected.paidAt ? formatDateTime(selected.paidAt) : '-' }}</dd></div><div><dt>已退款</dt><dd>¥{{ (selected.refundedAmountFen / 100).toFixed(2) }}</dd></div></dl></section>
        <section v-if="selected.plan" class="panel"><h4>权益明细</h4><div v-for="item in selected.plan.entitlements.filter(item => item.orderItem.kind !== 'goods')" :key="item.id" class="right-row"><div><strong>{{ item.orderItem.itemName }}</strong><span>总计 {{ item.totalQuantity }} 次</span></div><div class="right-counts"><span>可用 {{ item.availableQuantity }}</span><span>已预约 {{ item.reservedQuantity }}</span><span>已完成 {{ item.usedQuantity }}</span><span v-if="item.refundFrozen">退款冻结 {{ item.refundFrozen }}</span><span v-if="item.refundedQuantity">已退款 {{ item.refundedQuantity }}</span></div></div></section>
        <section v-if="selected.plan?.appointments.length" class="panel"><h4>预约记录</h4><div v-for="item in selected.plan.appointments" :key="item.id" class="detail-row"><span>{{ formatDateTime(item.confirmedStartAt || item.requestedStartAt) }}</span><el-tag size="small" effect="plain">{{ appointmentText(item.status) }}</el-tag></div></section>
        <section v-if="selected.refunds.length" class="panel"><h4>退款记录</h4><div v-for="item in selected.refunds" :key="item.id" class="detail-row"><span>{{ item.refundNo }} · ¥{{ (item.requestedAmountFen / 100).toFixed(2) }}</span><el-tag size="small" effect="plain">{{ refundText(item.status) }}</el-tag></div></section>
        <GoodsPanel v-if="selected.plan" :key="`goods-${selected.plan.id}`" :plan-id="selected.plan.id" />
        <FollowUpPanel v-if="selected.plan" :key="selected.plan.id" :plan-id="selected.plan.id" />
      </div>
      <template #footer><el-button v-if="selected?.plan && ['active', 'expired'].includes(selected.plan.status)" type="primary" @click="extensionVisible = true">登记机构等待与延期</el-button></template>
    </el-drawer>
    <el-dialog v-model="extensionVisible" title="登记机构原因等待" width="560px"><el-alert title="填写已发生的等待起止时间；重叠等待不重复延期。患者主动推迟或未到场不适用。" :closable="false" /><el-form label-position="top" style="margin-top:20px"><el-form-item label="受影响服务项目"><el-select v-model="extension.entitlementId"><el-option v-for="item in selected?.plan?.entitlements.filter(item => item.orderItem.kind !== 'goods') || []" :key="item.id" :value="item.id" :label="item.orderItem.itemName" /></el-select></el-form-item><el-form-item label="等待起止时间"><el-date-picker v-model="extensionRange" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" /></el-form-item><el-form-item label="机构原因"><el-input v-model="extension.reason" type="textarea" maxlength="300" /></el-form-item></el-form><template #footer><el-button @click="extensionVisible = false">取消</el-button><el-button type="primary" :loading="extending" @click="extendPlan">登记并顺延</el-button></template></el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import GoodsPanel from './GoodsPanel.vue'
import FollowUpPanel from './FollowUpPanel.vue'
import AdminListAction from '@/components/AdminListAction.vue'
import AdminListPagination from '@/components/AdminListPagination.vue'
import AdminListTable from '@/components/AdminListTable.vue'
import AdminListToolbar from '@/components/AdminListToolbar.vue'
import { serviceProgramApi, type ServiceInstitution, type ServiceOrder } from '@/api/service-program'

const tabs = [{ label: '全部', value: '' }, { label: '待支付', value: 'pending_payment' }, { label: '进行中', value: 'active' }, { label: '售后中', value: 'aftercare' }, { label: '已完成', value: 'completed' }, { label: '已到期', value: 'expired' }, { label: '部分退款', value: 'partially_refunded' }, { label: '已退款', value: 'refunded' }, { label: '已关闭', value: 'closed' }]
const filters = reactive<{ keyword: string; status: string; institutionId: number | '' }>({ keyword: '', status: '', institutionId: '' })
const orders = ref<ServiceOrder[]>([])
const institutions = ref<ServiceInstitution[]>([])
const selected = ref<ServiceOrder | null>(null)
const detailVisible = ref(false)
const extensionVisible = ref(false)
const extending = ref(false)
const extensionRange = ref<string[]>([])
const extension = reactive({ entitlementId: 0, reason: '' })
async function extendPlan() {
  if (!selected.value || !extension.entitlementId || extensionRange.value.length !== 2 || !extension.reason.trim()) { ElMessage.warning('请完整填写服务项目、等待区间和原因'); return }
  extending.value = true
  try { selected.value = await serviceProgramApi.extendPlan(selected.value.id, { ...extension, startAt: extensionRange.value[0], endAt: extensionRange.value[1] }); extensionVisible.value = false; ElMessage.success('等待已登记，有效期已更新'); await load() } finally { extending.value = false }
}
const loading = ref(false)
const listError = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
async function load() { loading.value = true; listError.value = ''; try { const result = await serviceProgramApi.listOrders({ ...filters, page: page.value, pageSize: pageSize.value }); orders.value = result.list; total.value = result.total } catch { listError.value = '服务订单加载失败，请重试' } finally { loading.value = false } }
function search() { page.value = 1; void load() }
function reset() { Object.assign(filters, { keyword: '', status: '', institutionId: '' }); search() }
async function openDetail(row: ServiceOrder) { try { selected.value = await serviceProgramApi.getOrder(row.id); detailVisible.value = true } catch { /* 请求层已提示 */ } }
function sumRight(row: ServiceOrder, key: 'availableQuantity' | 'reservedQuantity' | 'usedQuantity') { return row.plan?.entitlements.filter(item => item.orderItem.kind !== 'goods').reduce((sum, item) => sum + item[key], 0) || 0 }
function formatDateTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
function orderMeta(value: string): { text: string; type: 'warning' | 'success' | 'info' | 'primary' } { const map: Record<string, { text: string; type: 'warning' | 'success' | 'info' | 'primary' }> = { pending_payment: { text: '待支付', type: 'warning' }, paid: { text: '服务中', type: 'success' }, partially_refunded: { text: '部分退款', type: 'primary' }, refunded: { text: '已退款', type: 'info' }, closed: { text: '已关闭', type: 'info' } }; return map[value] || { text: value, type: 'info' } }
function planText(row: ServiceOrder) { return row.plan ? ({ active: '进行中', aftercare: '售后中', completed: '已完成', expired: '已到期', refunded: '已退款' } as Record<string, string>)[row.plan.status] || row.plan.status : orderMeta(row.status).text }
function paymentMeta(value: string): { text: string; type: 'warning' | 'success' | 'info' | 'primary' } { const map: Record<string, { text: string; type: 'warning' | 'success' | 'info' | 'primary' }> = { unpaid: { text: '未支付', type: 'warning' }, paid: { text: '已支付', type: 'success' }, partially_refunded: { text: '部分退款', type: 'primary' }, refunded: { text: '已退款', type: 'info' } }; return map[value] || { text: value, type: 'info' } }
function appointmentText(value: string) { return ({ pending: '待确认', confirmed: '已确认', arrived: '已到场', completed: '已完成', refund_pending: '取消待处理', cancelled: '已取消', no_show: '未到场' } as Record<string, string>)[value] || value }
function refundText(value: string) { return ({ pending: '待审核', processing: '处理中', success: '退款成功', rejected: '未通过', withdrawn: '已撤回' } as Record<string, string>)[value] || value }
onMounted(async () => { const [, rows] = await Promise.all([load(), serviceProgramApi.listInstitutions()]); institutions.value = rows })
</script>

<style scoped>
.orders-page { display: flex; flex-direction: column; gap: 16px; }
.toolbar-filters { display: flex; flex-wrap: wrap; gap: 12px; }
.status-tabs { padding: 0 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); }
.status-tabs :deep(.el-tabs__header) { margin: 0; }
.identifier { padding: 0; font-weight: 650; }
.main-text { color: var(--el-text-color-primary); font-weight: 600; }
.sub-text { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.amount { color: var(--el-color-danger); }
.rights { display: flex; flex-wrap: wrap; gap: 4px 10px; color: var(--el-text-color-regular); font-size: 12px; }
.overview { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 20px; border-radius: 14px; background: var(--el-fill-color-light); }
.overview h3 { margin: 13px 0 5px; font-size: 20px; }.overview p { margin: 0; color: var(--el-text-color-secondary); }
.overview > div:last-child { text-align: right; }.overview > div:last-child span { display: block; color: var(--el-text-color-secondary); font-size: 12px; }.overview > div:last-child strong { display: block; margin-top: 6px; color: var(--el-color-danger); font-size: 26px; }
.panel { margin-top: 18px; padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; }.panel h4 { margin: 0 0 14px; }
dl { margin: 0; } dl > div, .detail-row { display: flex; justify-content: space-between; gap: 20px; padding: 11px 0; border-bottom: 1px solid var(--el-border-color-lighter); } dl > div:last-child, .detail-row:last-child { border-bottom: 0; } dt { color: var(--el-text-color-secondary); } dd { margin: 0; text-align: right; }
.right-row { display: flex; justify-content: space-between; gap: 20px; padding: 14px 0; border-bottom: 1px solid var(--el-border-color-lighter); }.right-row:last-child { border-bottom: 0; }.right-row > div:first-child span { display: block; margin-top: 5px; color: var(--el-text-color-secondary); font-size: 12px; }.right-counts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px 12px; color: var(--el-text-color-regular); font-size: 12px; }
</style>
