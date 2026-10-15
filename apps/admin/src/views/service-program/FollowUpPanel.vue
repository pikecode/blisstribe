<template>
  <section class="followup-panel">
    <header><h4>服务随访</h4><el-button type="primary" link @click="openCreate">安排随访</el-button></header>
    <el-alert v-if="error" title="随访加载失败" type="error" :closable="false"><el-button link @click="load">重新加载</el-button></el-alert>
    <div v-loading="loading">
      <p v-if="!rows.length && !error" class="muted">暂无随访安排</p>
      <article v-for="row in rows" :key="row.id">
        <div class="row-head"><strong>{{ formatTime(row.scheduledAt) }}</strong><el-tag :type="row.status === 'scheduled' ? 'warning' : row.status === 'completed' ? 'success' : 'info'">{{ statusText(row.status) }}</el-tag></div>
        <p>{{ row.contactName }} · {{ row.purpose }}</p>
        <p v-if="row.outcome">{{ row.status === 'cancelled' ? '取消原因' : '联系结果' }}：{{ row.outcome }}</p>
        <p v-if="row.patientFeedback" class="feedback">患者反馈：{{ row.patientFeedback }}</p>
        <div v-if="row.status === 'scheduled'" class="actions"><el-button size="small" :disabled="submitting" @click="resolve(row, 'completed')">登记联系结果</el-button><el-button size="small" text type="danger" :disabled="submitting" @click="resolve(row, 'cancelled')">取消安排</el-button></div>
      </article>
    </div>
    <el-dialog v-model="visible" title="安排服务随访" width="480px" append-to-body>
      <el-form label-position="top">
        <el-form-item label="计划联系时间"><el-date-picker v-model="form.scheduledAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" placeholder="选择未来的联系时间" style="width: 100%" /></el-form-item>
        <el-form-item label="联系负责人"><el-input v-model="form.contactName" maxlength="60" placeholder="机构运营人员姓名" /></el-form-item>
        <el-form-item label="随访目的"><el-input v-model="form.purpose" type="textarea" :rows="3" maxlength="500" placeholder="如了解服务体验、确认后续安排，请勿填写专业诊疗资料" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="create">保存并通知患者</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { serviceProgramApi, type ServiceFollowUp } from '@/api/service-program'

const props = defineProps<{ planId: number }>()
const rows = ref<ServiceFollowUp[]>([])
const loading = ref(false)
const error = ref(false)
const visible = ref(false)
const submitting = ref(false)
const form = reactive({ clientRequestId: '', scheduledAt: '', contactName: '', purpose: '' })
let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true; error.value = false
  try { const result = await serviceProgramApi.followUps(props.planId); if (version === loadVersion) rows.value = result }
  catch { if (version === loadVersion) error.value = true }
  finally { if (version === loadVersion) loading.value = false }
}
function openCreate() { Object.assign(form, { clientRequestId: `followup-${Date.now()}-${Math.random().toString(36).slice(2)}`, scheduledAt: '', contactName: '', purpose: '' }); visible.value = true }
async function create() {
  if (!form.scheduledAt || !form.contactName.trim() || !form.purpose.trim()) { ElMessage.warning('请完整填写联系时间、负责人和目的'); return }
  submitting.value = true
  try { await serviceProgramApi.createFollowUp(props.planId, form); visible.value = false; ElMessage.success('随访已安排'); await load() } finally { submitting.value = false }
}
async function resolve(row: ServiceFollowUp, status: 'completed' | 'cancelled') {
  let outcome: string
  try { const result = await ElMessageBox.prompt(status === 'completed' ? '填写联系结果，保存后患者可见。请勿填写专业诊疗资料。' : '填写取消原因，保存后会通知患者。', status === 'completed' ? '登记随访结果' : '取消随访', { inputType: 'textarea', inputValidator: value => !!value?.trim() && value.length <= 1000 || '请填写 1 至 1000 字', confirmButtonText: '确认保存', cancelButtonText: '返回' }); outcome = result.value } catch { return }
  submitting.value = true
  try { await serviceProgramApi.resolveFollowUp(row.id, { status, outcome }); ElMessage.success('随访已更新'); await load() } finally { submitting.value = false }
}
function formatTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
function statusText(status: string) { return ({ scheduled: '待联系', completed: '已完成', cancelled: '已取消' } as Record<string, string>)[status] }
watch(() => props.planId, () => { rows.value = []; void load() }, { immediate: true })
</script>

<style scoped>
.followup-panel { margin-top: 18px; padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 12px; }
header, .row-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h4 { margin: 0; } article { padding: 16px 0; border-bottom: 1px solid var(--el-border-color-lighter); } article:last-child { border: 0; }
p { color: var(--el-text-color-regular); font-size: 13px; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }.muted { color: var(--el-text-color-secondary); }.feedback { padding: 10px 12px; border-radius: 8px; background: var(--el-fill-color-light); }
.actions { display: flex; gap: 8px; }
</style>
