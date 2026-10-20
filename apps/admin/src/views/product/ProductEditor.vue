<template>
  <div class="intro-editor">
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon><el-button link @click="loadOptions">重新加载</el-button></el-alert>
    <el-skeleton v-if="optionsLoading" :rows="8" animated />
    <template v-else>
      <div class="intro-grid">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="saving || !!loadError" :scroll-to-error="true" class="intro-form">
          <section class="editor-section">
            <div class="section-heading"><span>01</span><div><h3>基础资料</h3><p>帮助用户认识这项服务，实际价格与次数在套餐中配置。</p></div></div>
            <div class="field-grid">
              <el-form-item label="产品名称" prop="title"><el-input v-model="form.title" maxlength="100" placeholder="如 健康管理服务" /></el-form-item>
              <el-form-item label="所属分类" prop="moduleId"><el-select v-model="form.moduleId" placeholder="选择展示分类"><el-option v-for="item in availableModules" :key="item.id" :value="item.id" :label="item.name + (item.status === 1 ? '' : '（已停用）')" /></el-select></el-form-item>
            </div>
            <el-form-item label="一句话介绍"><el-input v-model="form.subtitle" maxlength="200" placeholder="说明服务特色，帮助用户快速理解" /></el-form-item>
            <el-form-item label="产品封面"><AdminCoverUpload v-model="form.coverUrl" tip="建议使用服务场景横图，支持 jpg/png/webp，最大 5MB" /></el-form-item>
            <el-form-item label="价格展示文案"><el-input v-model="form.priceText" maxlength="100" placeholder="如 免费体验 / 199元起" /><div class="field-note">只用于介绍展示；实际支付金额以用户选择的套餐为准。</div></el-form-item>
          </section>
          <section class="editor-section">
            <div class="section-heading"><span>02</span><div><h3>服务说明</h3><p>明确适合谁、提供什么，以及如何接受服务。</p></div></div>
            <el-form-item label="服务简介"><el-input v-model="form.summary" type="textarea" :rows="3" placeholder="简要介绍服务内容" /></el-form-item>
            <div class="field-grid"><el-form-item label="适合人群"><el-input v-model="form.targetUserText" type="textarea" :rows="3" /></el-form-item><el-form-item label="解决的问题"><el-input v-model="form.painPointText" type="textarea" :rows="3" /></el-form-item></div>
            <template v-if="isService">
              <div class="field-grid"><el-form-item label="服务方式"><el-select v-model="form.serviceMode" clearable><el-option label="线上服务" value="online" /><el-option label="到店服务" value="offline" /><el-option label="线上 + 到店" value="mixed" /></el-select></el-form-item><el-form-item label="服务周期说明"><el-input v-model="form.serviceDuration" placeholder="如 每次30分钟 / 30天方案" /></el-form-item></div>
              <el-form-item label="预约说明"><el-switch v-model="form.appointmentRequired" active-text="介绍中提示需要预约" /><div class="field-note">此项仅用于介绍；实际预约时段在“履约准备”中维护。</div></el-form-item>
              <el-form-item label="服务流程"><el-input v-model="form.serviceProcess" type="textarea" :rows="2" placeholder="如 选择套餐 → 预约 → 到店服务" /></el-form-item>
            </template>
            <template v-if="isLegacyGoods"><el-divider content-position="left">历史实物介绍</el-divider><el-form-item label="规格说明"><el-input v-model="form.specText" type="textarea" :rows="2" /></el-form-item><el-form-item label="配送说明"><el-input v-model="form.deliveryText" type="textarea" :rows="2" /></el-form-item><el-form-item label="售后说明"><el-input v-model="form.afterSaleText" type="textarea" :rows="2" /></el-form-item><el-form-item label="供应状态"><el-select v-model="form.stockStatus"><el-option label="正常供应" value="available" /><el-option label="库存紧张" value="limited" /><el-option label="暂不可售" value="sold_out" /></el-select></el-form-item></template>
          </section>
          <section class="editor-section"><div class="section-heading"><span>03</span><div><h3>详情内容</h3><p>展示服务细节、注意事项和保障说明。</p></div></div><el-form-item label="产品详情"><el-input v-model="form.detail" type="textarea" :rows="8" placeholder="填写用户购买前需要了解的内容" /></el-form-item></section>
          <el-collapse v-model="advanced" class="advanced-settings"><el-collapse-item title="高级设置 · 推荐标签与排序" name="recommendation"><div class="advanced-body"><p class="field-note">已有推荐规则会保留，按需调整。命中排除标签的用户不会获得该产品推荐。</p><el-form-item v-for="field in tagFields" :key="field.key" :label="field.label"><el-select v-model="form[field.key]" multiple filterable :placeholder="field.hint"><el-option-group v-for="group in groupedTags" :key="group.label" :label="group.label"><el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" /></el-option-group></el-select></el-form-item><div class="field-grid"><el-form-item label="推荐优先级"><el-input-number v-model="form.priority" :min="0" :precision="0" /></el-form-item><el-form-item label="展示排序"><el-input-number v-model="form.sortOrder" :min="0" :precision="0" /></el-form-item></div></div></el-collapse-item></el-collapse>
        </el-form>
        <aside class="intro-preview" aria-label="介绍内容预览">
          <div class="preview-heading">用户端内容预览 <span>示意</span></div>
          <img v-if="form.coverUrl" :src="form.coverUrl" alt="产品封面预览" class="preview-cover" />
          <div v-else class="preview-placeholder">添加封面后在这里预览</div>
          <div class="preview-body"><small>{{ modules.find(item => item.id === form.moduleId)?.name || '尚未选择分类' }}</small><h3>{{ form.title || '产品名称' }}</h3><p>{{ form.subtitle || form.summary || '一句话说明这项服务的价值' }}</p><strong class="preview-price">{{ form.priceText || '价格以套餐为准' }}</strong><div v-if="form.targetUserText" class="preview-section"><b>适合人群</b><p>{{ form.targetUserText }}</p></div><div v-if="form.serviceProcess && isService" class="preview-section"><b>服务流程</b><p>{{ form.serviceProcess }}</p></div><div class="preview-section"><b>服务套餐</b><p>保存介绍后，可继续配置价格、次数与履约规则。</p></div></div>
        </aside>
      </div>
      <div class="editor-footer"><div><strong>{{ dirty ? '有未保存的修改' : product ? '介绍已保存' : '先保存介绍，再配置套餐' }}</strong><span>保存介绍不会自动改变展示或套餐销售状态</span></div><div class="footer-actions"><el-button :disabled="saving || !dirty" @click="resetForm">还原修改</el-button><el-button :loading="saving" :disabled="!!loadError" @click="save(false)">保存介绍</el-button><el-button v-if="!product || product.productType === 'service'" type="primary" :loading="saving" :disabled="!!loadError" @click="save(true)">保存并配置套餐</el-button></div></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import AdminCoverUpload from '@/components/AdminCoverUpload.vue'
import { productApi, type Product, type ProductPayload, type ProductModule, type TagDictionary } from '@/api/product'
import { buildTagOptionGroups, mapTagNamesToIds, tagOptionLabel } from '@/utils/tags'

const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{ saved: [product: Product, continueToPackages: boolean]; dirty: [value: boolean] }>()
const modules = ref<ProductModule[]>([])
const tags = ref<TagDictionary[]>([])
const loadError = ref('')
const optionsLoading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const advanced = ref<string[]>([])
const blank = (): ProductPayload => ({ moduleId: 0, productType: 'service', title: '', subtitle: '', coverUrl: '', priceText: '', summary: '', detail: '', targetUserText: '', painPointText: '', serviceProcess: '', serviceMode: '', serviceDuration: '', appointmentRequired: false, specText: '', deliveryText: '', afterSaleText: '', stockStatus: 'available', tags: [], tagIds: [], primaryTagIds: [], secondaryTagIds: [], excludeTagIds: [], priority: 0, sortOrder: 0 })
const form = reactive<ProductPayload>(blank())
const snapshot = ref('')
const dirty = computed(() => !!snapshot.value && JSON.stringify(form) !== snapshot.value)
const isService = computed(() => form.productType === 'service' || form.productType === 'package')
const isLegacyGoods = computed(() => form.productType === 'physical' || form.productType === 'package')
const availableModules = computed(() => modules.value.filter(item => item.status === 1 || item.id === form.moduleId))
const groupedTags = computed(() => buildTagOptionGroups(tags.value.filter(item => item.status === 1 && (!item.moduleId || item.moduleId === form.moduleId))))
const rules = { title: [{ required: true, whitespace: true, message: '请输入产品名称', trigger: 'blur' }], moduleId: [{ required: true, type: 'number', min: 1, message: '请选择所属分类', trigger: 'change' }] }
const tagFields = [
  { key: 'tagIds' as const, label: '通用推荐标签', hint: '选择推荐标签' },
  { key: 'primaryTagIds' as const, label: '强相关标签', hint: '命中时优先推荐' },
  { key: 'secondaryTagIds' as const, label: '弱相关标签', hint: '补充覆盖人群' },
  { key: 'excludeTagIds' as const, label: '排除标签', hint: '命中时不推荐' },
]
function resetForm() {
  const data = blank()
  if (props.product) {
    for (const key of Object.keys(data) as Array<keyof ProductPayload>) {
      if (key === 'moduleId') continue
      const value = props.product[key as keyof Product]
      if (value !== undefined) Object.assign(data, { [key]: Array.isArray(value) ? [...value] : value })
    }
    data.moduleId = props.product.module.id
    // 兼容尚未保存标签编号的历史介绍。
    if (!data.tagIds?.length) data.tagIds = mapTagNamesToIds(props.product.tags, tags.value)
    if (!props.product.primaryTagIds) data.primaryTagIds = [...(data.tagIds || [])]
  } else data.moduleId = modules.value.find(item => item.status === 1)?.id || 0
  Object.assign(form, data)
  snapshot.value = JSON.stringify(form)
  formRef.value?.clearValidate()
}
async function loadOptions() {
  optionsLoading.value = true; loadError.value = ''
  try { const result = await Promise.all([productApi.listModules(), productApi.listTags({ status: 1 })]); modules.value = result[0]; tags.value = result[1]; if (!snapshot.value) resetForm() }
  catch { loadError.value = '分类与推荐标签加载失败，请重试后保存' }
  finally { optionsLoading.value = false }
}
async function save(continueToPackages: boolean) {
  if (saving.value || loadError.value || !formRef.value) return
  if (!await formRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    const payload: ProductPayload = JSON.parse(JSON.stringify(form))
    payload.title = payload.title.trim()
    payload.productType = props.product?.productType || 'service'
    const saved = props.product ? await productApi.updateProduct(props.product.id, payload) : await productApi.createProduct(payload)
    snapshot.value = JSON.stringify(form)
    emit('saved', saved, continueToPackages)
    ElMessage.success(props.product ? '产品介绍已保存' : '产品已创建，可以继续配置套餐')
  } finally { saving.value = false }
}
async function confirmLeave() {
  if (saving.value) return false
  if (!dirty.value) return true
  try { await ElMessageBox.confirm('产品介绍有未保存的修改，离开后不会保留。', '离开工作区？', { confirmButtonText: '放弃修改并离开', cancelButtonText: '继续编辑', type: 'warning' }); return true } catch { return false }
}
watch(() => props.product, () => { if (snapshot.value) resetForm() })
watch(dirty, value => emit('dirty', value))
onMounted(loadOptions)
defineExpose({ dirty, saving, confirmLeave })
</script>

<style scoped lang="scss">
.intro-grid { display:grid; grid-template-columns:minmax(0,1fr) 280px; gap:24px; align-items:start; }
.intro-form { min-width:0; }
.editor-section { background:#fff; border:1px solid #e3e8eb; border-radius:12px; padding:24px; margin-bottom:18px; }
.section-heading { display:flex; gap:12px; align-items:flex-start; margin-bottom:24px; }
.section-heading > span { font-size:12px; font-weight:600; color:#0f766e; background:#ecf7f4; padding:6px 8px; border-radius:6px; }
.section-heading h3 { font-size:16px; margin:0 0 6px; color:#243b38; }
.section-heading p,.field-note { color:#677787; font-size:12px; line-height:1.7; margin:0; }
.field-note { margin-top:6px; width:100%; }
.field-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 20px; }
.intro-form :deep(.el-form-item__label) { font-weight:500; color:#40535c; }
.intro-form :deep(.el-select),.intro-form :deep(.el-input-number) { width:100%; }
.advanced-settings { border:1px solid #e3e8eb; border-radius:12px; background:#fff; padding:0 24px; }
.advanced-settings :deep(.el-collapse-item__header) { height:58px; color:#40535c; }
.advanced-body { padding-top:12px; }
.advanced-body > p { margin-bottom:16px; }
.intro-preview { position:sticky; top:20px; overflow:hidden; border:1px solid #e3e8eb; border-radius:12px; background:#fff; }
.preview-heading { padding:16px; display:flex; justify-content:space-between; color:#40535c; font-size:12px; }
.preview-heading span { color:#87949b; }
.preview-cover { width:100%; aspect-ratio:1.7; object-fit:cover; display:block; }
.preview-placeholder { background:#edf3f1; color:#6c8981; height:150px; display:grid; place-items:center; font-size:12px; }
.preview-body { padding:20px; }
.preview-body small { color:#0f766e; font-size:11px; }
.preview-body h3 { font-size:19px; line-height:1.5; margin:12px 0 8px; overflow-wrap:anywhere; }
.preview-body p { font-size:12px; color:#6b7a84; line-height:1.8; white-space:pre-wrap; overflow-wrap:anywhere; }
.preview-price { display:block; font-size:16px; color:#0f766e; margin:16px 0; }
.preview-section { border-top:1px solid #edf0f2; padding-top:16px; margin-top:16px; }
.preview-section b { font-size:12px; }
.editor-footer { position:sticky; bottom:0; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 20px; margin-top:20px; border:1px solid #e3e8eb; border-radius:12px; background:rgba(255,255,255,.97); box-shadow:0 -4px 18px #183d3808; z-index:5; }
.editor-footer > div:first-child { display:grid; gap:5px; font-size:12px; color:#667680; }
.editor-footer strong { font-weight:500; color:#344c47; }
.footer-actions { display:flex; flex-wrap:wrap; gap:8px; }
.footer-actions :deep(.el-button + .el-button) { margin-left:0; }
@media(max-width:1150px) { .intro-grid { grid-template-columns:minmax(0,1fr) 240px; gap:16px; } }
@media(max-width:950px) { .intro-grid { grid-template-columns:1fr; } .intro-preview { position:static; max-width:420px; } }
@media(max-width:600px) { .field-grid { grid-template-columns:1fr; } .editor-section { padding:18px; } .editor-footer { align-items:stretch; flex-direction:column; } }
</style>
