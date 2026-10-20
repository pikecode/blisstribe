<template>
  <el-dialog :model-value="modelValue" title="维护可约时段" width="min(840px, 94vw)" append-to-body destroy-on-close :before-close="beforeClose" @update:model-value="emit('update:modelValue', $event)">
    <p class="slot-note">时段属于履约机构，同机构的套餐共享接待容量。所有时间均为北京时间。</p>
    <el-form label-position="top" :disabled="saving">
      <el-form-item label="履约机构"><el-select v-model="selectedId" placeholder="选择机构" style="width:100%"><el-option v-for="institution in institutions" :key="institution.id" :value="institution.id" :label="institution.name" /></el-select></el-form-item>
      <div class="slot-fields"><el-form-item label="开始与结束时间"><el-date-picker v-model="range" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" start-placeholder="开始时间" end-placeholder="结束时间" style="width:100%" /></el-form-item><el-form-item label="接待容量"><el-input-number v-model="capacity" :min="1" :max="1000" :precision="0" controls-position="right" /></el-form-item></div>
      <div class="slot-create"><span>请在机构接待时间内开放时段，至少提前一小时。</span><el-button type="primary" :loading="saving" :disabled="!selectedId || loading || !!error" @click="create">开放时段</el-button></div>
    </el-form>
    <AdminListTable :data="slots" :loading="loading" :error="error" empty-text="该机构暂无时段，请先开放可预约时间" @retry="load">
      <el-table-column label="预约时间" min-width="230"><template #default="{ row }"><div>{{ formatTime(row.startAt) }}</div><small class="slot-note">至 {{ formatTime(row.endAt) }}</small></template></el-table-column>
      <el-table-column label="剩余 / 容量" width="115"><template #default="{ row }">{{ row.available }} / {{ row.capacity }}</template></el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '已开放' : '已关闭' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="72" align="center"><template #default="{ row }"><el-button v-if="row.enabled" link type="danger" :disabled="saving" @click="close(row.id)">关闭</el-button><span v-else>—</span></template></el-table-column>
    </AdminListTable>
    <template #footer><el-button :disabled="saving" @click="beforeClose(() => emit('update:modelValue', false))">完成</el-button></template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminListTable from '@/components/AdminListTable.vue'
import { serviceProgramApi, type ServiceInstitution } from '@/api/service-program'
const props = defineProps<{ modelValue: boolean; institutions: ServiceInstitution[]; institutionId?: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; changed: [] }>()
const selectedId = ref<number>()
const range = ref<string[]>([])
const capacity = ref(1)
const slots = ref<Awaited<ReturnType<typeof serviceProgramApi.listSlots>>>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let requestId = 0
const formatter = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
function formatTime(value: string) { return formatter.format(new Date(value)) }
async function load() {
  const id = ++requestId
  slots.value = []; error.value = ''
  if (!selectedId.value) { loading.value = false; return }
  loading.value = true
  try { const rows = await serviceProgramApi.listSlots(selectedId.value); if (id === requestId) slots.value = rows }
  catch { if (id === requestId) error.value = '时段加载失败，请重试' }
  finally { if (id === requestId) loading.value = false }
}
async function create() {
  if (saving.value || !selectedId.value || range.value.length !== 2) { ElMessage.warning('请选择机构及完整的起止时间'); return }
  const [start, end] = range.value.map(value => new Date(value).getTime())
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= Date.now() + 3600000 || end <= start) { ElMessage.warning('开始时间需至少提前一小时，结束时间须晚于开始时间'); return }
  saving.value = true
  try { await serviceProgramApi.createSlot({ institutionId: selectedId.value, startAt: range.value[0], endAt: range.value[1], capacity: capacity.value }); range.value = []; ElMessage.success('时段已开放'); await load(); emit('changed') } finally { saving.value = false }
}
async function close(id: number) {
  if (saving.value) return
  try { await ElMessageBox.confirm('关闭后不再接受新预约；已有预约需先协调处理。', '关闭时段', { type: 'warning', confirmButtonText:'确认关闭', cancelButtonText:'取消' }) } catch { return }
  saving.value = true
  try { await serviceProgramApi.closeSlot(id); await load(); emit('changed') } finally { saving.value = false }
}
async function beforeClose(done: () => void) {
  if (saving.value) return
  if (range.value.length) { try { await ElMessageBox.confirm('当前选择的时段尚未开放，关闭后将清除。', '关闭时段维护？', { confirmButtonText:'关闭', cancelButtonText:'继续维护' }) } catch { return } }
  range.value = []; done()
}
watch(selectedId, () => { range.value = []; void load() })
watch(() => props.modelValue, value => { if (value) { range.value = []; const next = props.institutionId || props.institutions[0]?.id; if (selectedId.value === next) void load(); else selectedId.value = next } else { ++requestId; loading.value = false } })
</script>
<style scoped>
.slot-note { color:#687986; font-size:12px; line-height:1.8; }
.slot-fields { display:grid; grid-template-columns:minmax(0,1fr) 150px; gap:20px; }
.slot-create { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-bottom:22px; }
.slot-create > span { color:#687986; font-size:12px; }
@media(max-width:600px) { .slot-fields { grid-template-columns:1fr; gap:0; } .slot-create { align-items:flex-start; flex-direction:column; } }
</style>
