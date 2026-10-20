<template>
  <div class="appointments-page">
    <AdminListToolbar>
      <div class="toolbar-filters">
        <el-date-picker v-model="filters.date" type="date" value-format="YYYY-MM-DD" placeholder="预约日期" clearable @change="load" />
        <el-select v-model="filters.institutionId" placeholder="履约机构" clearable style="width: 180px" @change="load">
          <el-option v-for="item in institutions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-button @click="today">今日接待</el-button><el-button @click="tomorrow">明日提醒</el-button><el-button icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" @click="openSlots">维护可约时段</el-button>
      </div>
    </AdminListToolbar>

    <el-tabs v-model="filters.status" class="status-tabs" @tab-change="load">
      <el-tab-pane v-for="tab in tabs" :key="tab.value" :label="tab.label" :name="tab.value" />
    </el-tabs>

    <AdminListTable :data="appointments" :loading="loading" :error="listError" row-key="id" @retry="load">
      <el-table-column label="预约时间" min-width="178">
        <template #default="{ row }"><div class="date-primary">{{ formatDateTime(row.confirmedStartAt || row.requestedStartAt) }}</div><div v-if="row.confirmedStartAt" class="date-secondary">原申请 {{ formatDateTime(row.requestedStartAt) }}</div></template>
      </el-table-column>
      <el-table-column label="患者" min-width="132"><template #default="{ row }"><div class="main-text">{{ row.user.nickname || '微信用户' }}</div><div class="sub-text">{{ row.user.phoneMasked }}</div></template></el-table-column>
      <el-table-column label="服务内容" min-width="210"><template #default="{ row }"><div class="main-text">{{ row.entitlement.orderItem.itemName }}</div><div class="sub-text">{{ row.plan.order.offering.name }}</div></template></el-table-column>
      <el-table-column label="履约机构" min-width="150"><template #default="{ row }"><div class="main-text">{{ row.institution.name }}</div><div v-if="row.assignedStaffName" class="sub-text">接待：{{ row.assignedStaffName }}</div></template></el-table-column>
      <el-table-column label="状态" width="110" align="center"><template #default="{ row }"><el-tag :type="statusMeta(row.status).type" effect="light">{{ statusMeta(row.status).text }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="92" fixed="right" align="center">
        <template #default="{ row }">
          <AdminListActions :show-more="['pending', 'confirmed'].includes(row.status)">
            <AdminListAction label="查看" icon="View" @click="openDetail(row)" />
            <AdminListAction v-if="row.status === 'pending'" label="确认预约" icon="Calendar" @click="openConfirm(row)" />
            <AdminListAction v-else-if="row.status === 'confirmed'" label="登记到场" icon="DocumentChecked" @click="markArrived(row)" />
            <AdminListAction v-else-if="row.status === 'arrived'" label="完成服务" icon="DocumentChecked" @click="markCompleted(row)" />
            <AdminListAction v-if="row.status === 'no_show' && row.entitlement.bookingBlocked" label="恢复预约资格" icon="Calendar" @click="restoreBooking(row)" />
            <template #more><el-dropdown-item @click="openReschedule(row)">提出改约</el-dropdown-item><el-dropdown-item @click="cancelInstitution(row)">机构取消接待</el-dropdown-item><el-dropdown-item v-if="row.status === 'confirmed'" @click="markNoShow(row)">登记未到场</el-dropdown-item></template>
          </AdminListActions>
        </template>
      </el-table-column>
    </AdminListTable>

    <el-dialog v-model="rescheduleVisible" title="提出改约建议" width="520px"><el-alert title="患者接受前保留原预约；候选时段不占用名额。" :closable="false" /><el-select v-model="rescheduleSlotId" placeholder="选择候选时段" style="width:100%;margin:20px 0"><el-option v-for="slot in slots.filter(item => item.enabled && item.available > 0 && new Date(item.startAt).getTime() > Date.now() + 3600000)" :key="slot.id" :label="formatDateTime(slot.startAt)" :value="slot.id" /></el-select><el-input v-model="rescheduleReason" type="textarea" maxlength="300" placeholder="填写改约原因" /><template #footer><el-button @click="rescheduleVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="sendReschedule">发送建议</el-button></template></el-dialog>
    <SlotManager v-model="slotsVisible" :institutions="institutions" :institution-id="slotForm.institutionId" />

    <el-dialog v-model="confirmVisible" title="确认预约安排" width="520px" destroy-on-close>
      <el-alert title="确认后患者将按此时间到场；如需改期，请先与患者沟通。" type="info" :closable="false" show-icon />
      <el-form label-position="top" class="confirm-form">
        <el-form-item label="确认到场时间" required><el-date-picker v-model="confirmForm.confirmedStartAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" disabled placeholder="选择到场时间" style="width: 100%" /></el-form-item>
        <el-form-item label="预计时长（分钟）"><el-input-number v-model="confirmForm.durationMinutes" disabled :min="15" :max="480" :step="15" controls-position="right" /></el-form-item>
        <el-form-item label="接待人员"><el-input v-model="confirmForm.assignedStaffName" maxlength="60" placeholder="填写患者可识别的姓名或岗位" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="confirmVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="confirmAppointment">确认安排</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="预约详情" size="520px">
      <div v-if="selected" class="detail">
        <div class="detail-hero"><el-tag :type="statusMeta(selected.status).type">{{ statusMeta(selected.status).text }}</el-tag><h3>{{ selected.entitlement.orderItem.itemName }}</h3><p>{{ selected.plan.order.offering.name }}</p></div>
        <dl><div><dt>期望时间</dt><dd>{{ formatDateTime(selected.requestedStartAt) }}</dd></div><div><dt>确认时间</dt><dd>{{ selected.confirmedStartAt ? formatDateTime(selected.confirmedStartAt) : '待确认' }}</dd></div><div><dt>患者</dt><dd>{{ selected.user.nickname || '微信用户' }} · {{ selected.user.phoneMasked }}</dd></div><div><dt>服务机构</dt><dd>{{ selected.institution.name }}</dd></div><div><dt>服务地址</dt><dd>{{ selected.institution.address || '-' }}</dd></div><div><dt>接待人员</dt><dd>{{ selected.assignedStaffName || '-' }}</dd></div><div><dt>患者说明</dt><dd>{{ selected.patientNote || '无' }}</dd></div><div v-if="selected.cancelReason"><dt>取消原因</dt><dd>{{ selected.cancelReason }}</dd></div></dl>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import SlotManager from './SlotManager.vue'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminListAction from '@/components/AdminListAction.vue'
import AdminListActions from '@/components/AdminListActions.vue'
import AdminListTable from '@/components/AdminListTable.vue'
import AdminListToolbar from '@/components/AdminListToolbar.vue'
import { serviceProgramApi, type ServiceAppointment, type ServiceInstitution } from '@/api/service-program'

const route = useRoute()
const loading = ref(false)
const submitting = ref(false)
const listError = ref('')
const appointments = ref<ServiceAppointment[]>([])
const institutions = ref<ServiceInstitution[]>([])
const filters = reactive<{ status: string; institutionId: number | ''; date: string }>({ status: 'pending', institutionId: '', date: '' })
const tabs = [{ label: '待确认', value: 'pending' }, { label: '已确认', value: 'confirmed' }, { label: '已到场', value: 'arrived' }, { label: '售后处理中', value: 'refund_pending' }, { label: '已完成', value: 'completed' }, { label: '已取消', value: 'cancelled' }, { label: '全部', value: '' }]
const selected = ref<ServiceAppointment | null>(null)
const detailVisible = ref(false)
const confirmVisible = ref(false)
const confirmForm = reactive({ confirmedStartAt: '', durationMinutes: 60, assignedStaffName: '' })
const rescheduleVisible = ref(false)
const rescheduleSlotId = ref(0)
const rescheduleReason = ref('')
async function openReschedule(row: ServiceAppointment) { selected.value = row; slotForm.institutionId = row.institution.id; await loadSlots(); rescheduleSlotId.value = 0; rescheduleReason.value = ''; rescheduleVisible.value = true }
async function sendReschedule() {
  if (!selected.value || !rescheduleSlotId.value || !rescheduleReason.value.trim()) { ElMessage.warning('请选择时段并填写原因'); return }
  submitting.value = true
  try { await serviceProgramApi.proposeReschedule(selected.value.id, rescheduleSlotId.value, rescheduleReason.value.trim()); rescheduleVisible.value = false; ElMessage.success('改约建议已发送，等待患者确认'); await load() } finally { submitting.value = false }
}
const slotsVisible = ref(false)
const slotForm = reactive({ institutionId: 0, capacity: 1 })
const slots = ref<Array<{ id: number; startAt: string; endAt: string; capacity: number; available: number; enabled: boolean }>>([])
function openSlots() { slotForm.institutionId = Number(filters.institutionId) || institutions.value[0]?.id || 0; slotsVisible.value = true }
async function loadSlots() { if (slotForm.institutionId) slots.value = await serviceProgramApi.listSlots(slotForm.institutionId) }

async function load() { loading.value = true; listError.value = ''; try { appointments.value = await serviceProgramApi.listAppointments(filters) } catch { listError.value = '预约列表加载失败，请重试' } finally { loading.value = false } }
function receptionDay(offset: number) { const d = new Date(Date.now() + offset * 86400000 + 8 * 3600000); filters.date = d.toISOString().slice(0,10); filters.status = 'confirmed'; void load() }
function today() { receptionDay(0) }
function tomorrow() { receptionDay(1) }
function reset() { Object.assign(filters, { status: 'pending', institutionId: '', date: '' }); void load() }
function openDetail(row: ServiceAppointment) { selected.value = row; detailVisible.value = true }
function openConfirm(row: ServiceAppointment) { selected.value = row; Object.assign(confirmForm, { confirmedStartAt: row.requestedStartAt, durationMinutes: row.durationMinutes, assignedStaffName: row.assignedStaffName }); confirmVisible.value = true }
async function confirmAppointment() {
  if (!selected.value || !confirmForm.confirmedStartAt) { ElMessage.warning('请选择确认到场时间'); return }
  submitting.value = true
  try { await serviceProgramApi.confirmAppointment(selected.value.id, confirmForm); ElMessage.success('预约已确认'); confirmVisible.value = false; await load() } finally { submitting.value = false }
}
async function markArrived(row: ServiceAppointment) { await ElMessageBox.confirm('确认患者已经到达服务机构？', '登记到场', { type: 'warning' }); await serviceProgramApi.arriveAppointment(row.id); ElMessage.success('已登记到场'); await load() }
async function markCompleted(row: ServiceAppointment) {
  try {
    const { value } = await ElMessageBox.prompt('确认服务已经实际完成。填写实际执行人员后核销 1 次权益。', '完成服务', { inputValue: row.assignedStaffName, inputPlaceholder: '实际执行人员姓名', inputValidator: (value) => !!value?.trim() || '请填写实际执行人员' })
    await serviceProgramApi.completeAppointment(row.id, value.trim())
    ElMessage.success('服务已完成并核销权益')
    await load()
  } catch { /* 取消或请求错误由现有交互处理 */ }
}

async function restoreBooking(row: ServiceAppointment) {
  try {
    const { value } = await ElMessageBox.prompt('恢复后患者可重新预约该项目。', '恢复预约资格', { inputPlaceholder: '填写恢复说明', inputValidator: (value) => !!value?.trim() || '请填写说明' })
    await serviceProgramApi.restoreBooking(row.id, value.trim())
    ElMessage.success('预约资格已恢复')
    await load()
  } catch { /* 请求层已提示，关闭弹窗无需处理 */ }
}
async function cancelInstitution(row: ServiceAppointment) {
  try { const { value } = await ElMessageBox.prompt('取消后释放时段与服务次数，请与患者协调替代时间或退款。', '机构取消接待', { inputPlaceholder: '填写机构取消原因', inputValidator: (value) => !!value?.trim() || '请填写原因' }); await serviceProgramApi.cancelAppointment(row.id, value.trim()); ElMessage.success('原预约已取消'); await load() } catch { /* 请求层提示失败 */ }
}
async function markNoShow(row: ServiceAppointment) {
  try {
    const { value } = await ElMessageBox.prompt('登记后释放预约占用，服务次数不会记为已使用。', '登记未到场', { inputPlaceholder: '填写未到场说明', inputValidator: (value) => !!value?.trim() || '请填写说明' })
    await serviceProgramApi.noShowAppointment(row.id, value.trim())
    ElMessage.success('已登记未到场并释放占用')
    await load()
  } catch { /* 取消或请求错误由现有交互处理 */ }
}
function formatDateTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
function statusMeta(status: string): { text: string; type: 'success' | 'warning' | 'info' | 'primary' | 'danger' } { const map: Record<string, { text: string; type: 'success' | 'warning' | 'info' | 'primary' | 'danger' }> = { pending: { text: '待确认', type: 'warning' }, confirmed: { text: '已确认', type: 'primary' }, arrived: { text: '已到场', type: 'primary' }, refund_pending: { text: '取消待处理', type: 'warning' }, completed: { text: '已完成', type: 'success' }, cancelled: { text: '已取消', type: 'info' }, no_show: { text: '未到场', type: 'danger' } }; return map[status] || { text: status, type: 'info' } }
function applyQuery() {
  const state = typeof route.query.status === 'string' ? route.query.status : 'pending'
  filters.status = tabs.some(tab => tab.value === state) ? state : 'pending'
  const id = Number(route.query.institutionId)
  filters.institutionId = Number.isSafeInteger(id) && id > 0 ? id : ''
  filters.date = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) ? route.query.date : ''
}
watch(() => route.query, () => { applyQuery(); void load() })
onMounted(async () => { applyQuery(); const [, rows] = await Promise.all([load(), serviceProgramApi.listInstitutions()]); institutions.value = rows; if (route.query.openSlots === '1') openSlots() })
</script>

<style scoped>
.appointments-page { display: flex; flex-direction: column; gap: 16px; }
.toolbar-filters { display: flex; flex-wrap: wrap; gap: 12px; }
.status-tabs { padding: 0 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; background: var(--el-bg-color); }
.status-tabs :deep(.el-tabs__header) { margin: 0; }
.date-primary, .main-text { color: var(--el-text-color-primary); font-weight: 600; }
.date-secondary, .sub-text { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.confirm-form { margin-top: 20px; }
.detail-hero { padding: 20px; border-radius: 14px; background: var(--el-fill-color-light); }
.detail-hero h3 { margin: 14px 0 6px; font-size: 20px; }
.detail-hero p { margin: 0; color: var(--el-text-color-secondary); }
.detail dl { margin: 18px 0 0; }
.detail dl > div { display: grid; grid-template-columns: 96px 1fr; gap: 16px; padding: 14px 4px; border-bottom: 1px solid var(--el-border-color-lighter); }
.detail dt { color: var(--el-text-color-secondary); }
.detail dd { margin: 0; color: var(--el-text-color-primary); word-break: break-word; }
</style>
