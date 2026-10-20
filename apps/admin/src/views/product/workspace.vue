<template>
  <div class="product-workspace">
    <div class="workspace-back"><el-button link @click="router.push('/products')">← 返回产品列表</el-button><span>服务产品工作区</span></div>
    <el-skeleton v-if="loading" :rows="8" animated class="workspace-skeleton" />
    <el-result v-else-if="error" icon="warning" title="暂时无法打开产品" :sub-title="error"><template #extra><el-button @click="router.push('/products')">返回列表</el-button><el-button type="primary" @click="load">重新加载</el-button></template></el-result>
    <template v-else>
      <header class="workspace-header">
        <div class="workspace-identity"><img v-if="product?.coverUrl" :src="product.coverUrl" alt="产品封面" /><div v-else class="identity-placeholder"><el-icon><Goods /></el-icon></div><div><div class="identity-meta"><span>{{ product?.module.name || '新建服务产品' }}</span><span v-if="product">产品 #{{ product.id }}</span></div><h2>{{ product?.title || '创建你的服务产品' }}</h2><p>{{ product?.subtitle || '在这里完成内容介绍、套餐配置和履约准备' }}</p></div></div>
        <div class="workspace-status"><div><span>介绍展示</span><el-tag :type="product?.status === 1 ? 'success' : 'info'">{{ !product ? '未创建' : product.status === 1 ? (product.module.status === 1 ? '已展示' : '分类已停用') : product.status === 2 ? '已隐藏' : '草稿' }}</el-tag></div><div><span>套餐销售</span><strong v-if="!product || product.productType !== 'service'">{{ !product ? '保存后配置' : '历史介绍，无套餐' }}</strong><strong v-else-if="offeringsLoading">加载中…</strong><el-button v-else-if="offeringsError" link type="danger" @click="loadOfferings">加载失败 · 重试</el-button><strong v-else>{{ publishedCount }} / {{ offerings.length }} 个已上架</strong></div></div>
      </header>
      <div v-if="product?.productType !== 'service' && product" class="workspace-notice">这是历史{{ product.productType === 'physical' ? '实物' : '组合' }}介绍，可继续维护原内容。独立实物售卖请使用商城商品；新增服务使用服务产品。</div>
      <div v-else-if="product && !offeringsLoading && !offeringsError" class="workspace-notice" :class="{ 'workspace-notice--ready': publishedCount > 0 && product.status === 1 && product.module.status === 1 }"><span>{{ nextHint }}</span><el-button link type="primary" @click="selectTab(nextTab)">{{ nextAction }} →</el-button></div>
      <nav class="workspace-steps" aria-label="产品维护步骤" role="tablist">
        <button v-for="(step, index) in steps" :id="`workspace-tab-${step.key}`" :key="step.key" type="button" role="tab" :aria-selected="tab === step.key" :aria-controls="`workspace-panel-${step.key}`" :disabled="step.key !== 'introduction' && (!product || product.productType !== 'service')" :class="{ active: tab === step.key }" @click="selectTab(step.key)"><span class="step-index">{{ String(index + 1).padStart(2, '0') }}</span><span><strong>{{ step.title }}</strong><small>{{ step.description }}{{ step.key === 'introduction' && introDirty ? ' · 未保存' : '' }}</small></span></button>
      </nav>
      <section v-show="tab === 'introduction'" id="workspace-panel-introduction" role="tabpanel" aria-labelledby="workspace-tab-introduction">
        <ProductEditor :key="product?.id || 'new'" ref="introRef" :product="product" @saved="onSaved" @dirty="introDirty = $event" />
      </section>
      <section v-if="product?.productType === 'service'" v-show="tab !== 'introduction'" :id="`workspace-panel-${tab}`" role="tabpanel" :aria-labelledby="`workspace-tab-${tab}`">
        <section v-if="tab === 'checks'" class="visibility-card"><div><h3>介绍展示状态</h3><p>{{ product.status === 1 ? '产品介绍已上架；分类启用后可从公开入口浏览。' : '介绍尚未展示，用户无法从公开产品列表浏览。' }}</p><p v-if="product.module.status !== 1" class="visibility-warning">所属分类已停用。<el-button link type="primary" @click="router.push({ path: '/products', query: { tab: 'modules' } })">前往启用分类</el-button></p><p v-if="introDirty" class="visibility-warning">介绍有未保存的修改，请先保存后再调整展示状态。</p></div><el-button :loading="visibilitySaving" :disabled="introDirty" :type="product.status === 1 ? 'default' : 'primary'" @click="toggleVisibility">{{ product.status === 1 ? '隐藏介绍' : '展示介绍' }}</el-button></section>
        <ServiceOperations ref="operationsRef" embedded :product="product" :workspace-section="tab" :workspace-offerings="offerings" :workspace-loading="offeringsLoading" :workspace-error="offeringsError" @navigate="selectTab" @changed="loadOfferings" @refresh="loadOfferings" />
      </section>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { Goods } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi, type Product } from '@/api/product'
import { serviceProgramApi, type ServiceOffering } from '@/api/service-program'
import ProductEditor from './ProductEditor.vue'
import ServiceOperations from '@/views/service-program/index.vue'

const route = useRoute()
const router = useRouter()
const product = ref<Product | null>(null)
const loading = ref(false)
const error = ref('')
const offerings = ref<ServiceOffering[]>([])
const offeringsLoading = ref(false)
const offeringsError = ref('')
const introRef = ref<InstanceType<typeof ProductEditor>>()
const operationsRef = ref<InstanceType<typeof ServiceOperations>>()
const introDirty = ref(false)
const visibilitySaving = ref(false)
let requestId = 0
let offeringRequestId = 0
let createdNavigation = false
const steps = [
  { key:'introduction', title:'产品介绍', description:'用户看见的内容' },
  { key:'packages', title:'服务套餐', description:'服务内容与价格' },
  { key:'fulfilment', title:'履约准备', description:'机构与可约时段' },
  { key:'checks', title:'上线检查', description:'检查条件并上架' },
]
const tab = computed(() => { const value = String(route.query.tab || 'introduction'); return product.value?.productType === 'service' && steps.some(step => step.key === value) ? value : 'introduction' })
const publishedCount = computed(() => offerings.value.filter(item => item.status === 1).length)
const nextHint = computed(() => !offerings.value.length ? '介绍已保存，还需要配置一个服务套餐。' : !publishedCount.value ? '已有套餐，完成履约准备和上线检查后即可上架。' : product.value?.status !== 1 || product.value?.module.status !== 1 ? '套餐已上架，请确认介绍与所属分类已展示。' : '介绍已展示，套餐已上架；可继续检查时段、库存与购买条件。')
const nextTab = computed(() => !offerings.value.length ? 'packages' : 'checks')
const nextAction = computed(() => !offerings.value.length ? '配置第一个套餐' : '查看上线检查')
function selectTab(value: string) {
  if (!steps.some(step => step.key === value)) return
  if (value !== 'introduction' && (!product.value || product.value.productType !== 'service')) return
  void router.push({ path:route.path, query:{ ...route.query, tab:value } })
}
async function loadOfferings() {
  const id = product.value?.id
  const request = ++offeringRequestId
  if (!id || product.value?.productType !== 'service') { offerings.value = []; offeringsLoading.value = false; offeringsError.value = ''; return }
  offeringsLoading.value = true; offeringsError.value = ''
  try {
    const first = await serviceProgramApi.listOfferings({ productId:id, page:1, pageSize:100 })
    const rows = [...first.list]
    for (let page = 2; page <= Math.ceil(first.total / first.pageSize); page++) {
      if (request !== offeringRequestId) return
      const result = await serviceProgramApi.listOfferings({ productId:id, page, pageSize:100 })
      rows.push(...result.list)
    }
    if (request === offeringRequestId) offerings.value = rows
  } catch { if (request === offeringRequestId) { offerings.value = []; offeringsError.value = '套餐配置加载失败，请重试' } }
  finally { if (request === offeringRequestId) offeringsLoading.value = false }
}
async function load() {
  const request = ++requestId
  ++offeringRequestId
  loading.value = true; error.value = ''; introDirty.value = false; product.value = null; offerings.value = []
  try {
    if (route.name !== 'ProductCreate') {
      const id = Number(route.params.id)
      if (!Number.isSafeInteger(id) || id < 1) throw new Error('产品编号无效，请从产品列表重新进入')
      const result = await productApi.detailProduct(id)
      if (request !== requestId) return
      product.value = result
    }
  } catch (failure) { if (request === requestId) error.value = failure instanceof Error ? failure.message : '产品不存在或加载失败，请重试' }
  finally { if (request === requestId) { loading.value = false; if (product.value) void loadOfferings() } }
}
async function onSaved(saved: Product, continueToPackages: boolean) {
  const wasNew = !product.value
  product.value = saved; introDirty.value = false
  if (wasNew) {
    createdNavigation = true
    try { await router.replace({ name:'ProductWorkspace', params:{ id:saved.id }, query:{ tab:continueToPackages ? 'packages' : 'introduction' } }) } finally { createdNavigation = false }
  } else { void loadOfferings(); if (continueToPackages) selectTab('packages') }
}
async function toggleVisibility() {
  if (!product.value || visibilitySaving.value || introDirty.value) return
  const current = product.value
  try { await ElMessageBox.confirm(current.status === 1 ? '隐藏介绍后将退出公开浏览入口，已购订单仍保留。' : '展示后用户可浏览产品介绍；实际购买仍取决于套餐与购买条件。', current.status === 1 ? '隐藏产品介绍' : '展示产品介绍', { confirmButtonText:'确认', cancelButtonText:'取消', type:'warning' }) } catch { return }
  visibilitySaving.value = true
  try { product.value = current.status === 1 ? await productApi.unpublishProduct(current.id) : await productApi.publishProduct(current.id); ElMessage.success(current.status === 1 ? '介绍已隐藏' : '介绍已展示'); await loadOfferings() } finally { visibilitySaving.value = false }
}
async function confirmLeave() {
  if (visibilitySaving.value) return false
  if (operationsRef.value && !await operationsRef.value.confirmLeave()) return false
  return introRef.value ? introRef.value.confirmLeave() : true
}
onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(async (to, from) => {
  if (createdNavigation || (to.params.id === from.params.id && to.name === from.name)) return true
  return confirmLeave()
})
function beforeUnload(event: BeforeUnloadEvent) { if (introDirty.value || introRef.value?.saving || operationsRef.value?.hasUnsavedChanges) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { ++requestId; ++offeringRequestId; window.removeEventListener('beforeunload', beforeUnload) })
watch([() => route.name, () => route.params.id], load, { immediate:true })
</script>
<style scoped>
.product-workspace { max-width:1500px; margin:0 auto; }
.workspace-back { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
.workspace-back > span { font-size:12px; color:#7a8b95; }
.workspace-header { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:26px; background:#fff; border:1px solid #e1e8e9; border-radius:12px; }
.workspace-identity { display:flex; align-items:center; gap:20px; min-width:0; }
.workspace-identity img,.identity-placeholder { width:88px; height:88px; flex-shrink:0; object-fit:cover; border-radius:10px; }
.identity-placeholder { display:grid; place-items:center; background:#eaf4f0; color:#0f766e; font-size:28px; }
.identity-meta { display:flex; flex-wrap:wrap; gap:12px; color:#6e8186; font-size:12px; }
.workspace-identity h2 { margin:8px 0; font-size:23px; line-height:1.4; color:#203b35; overflow-wrap:anywhere; }
.workspace-identity p { margin:0; font-size:13px; color:#78868e; line-height:1.6; }
.workspace-status { display:grid; gap:16px; flex-shrink:0; padding-left:24px; border-left:1px solid #e5ebed; }
.workspace-status > div { display:flex; align-items:center; justify-content:space-between; gap:24px; }
.workspace-status span { font-size:12px; color:#78868e; }
.workspace-status strong { font-size:13px; font-weight:500; color:#3a534e; }
.workspace-notice { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 18px; margin-top:12px; background:#f5f1e8; border:1px solid #ece3d0; border-radius:8px; color:#806221; font-size:12px; line-height:1.8; }
.workspace-notice--ready { background:#edf7f3; border-color:#d9eae3; color:#31675b; }
.workspace-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:0; padding:6px; margin:24px 0; border:1px solid #e1e8e9; border-radius:12px; background:#fff; }
.workspace-steps button { display:flex; align-items:center; gap:14px; text-align:left; padding:16px; border:0; background:transparent; border-radius:8px; cursor:pointer; font:inherit; color:#677b81; transition:background .15s; }
.workspace-steps button:hover:not(:disabled) { background:#f2f7f5; }
.workspace-steps button:focus-visible { outline:2px solid #0f766e; outline-offset:2px; }
.workspace-steps button.active { background:#e9f4f0; color:#0f766e; }
.workspace-steps button:disabled { cursor:default; opacity:.45; }
.step-index { font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; }
.workspace-steps button > span:last-child { display:grid; gap:6px; }
.workspace-steps strong { font-size:14px; font-weight:600; }
.workspace-steps small { font-size:11px; color:#7f8b92; }
.workspace-skeleton { padding:30px; }
.visibility-card { display:flex; justify-content:space-between; align-items:center; gap:20px; padding:24px; margin-bottom:24px; border:1px solid #dce8e3; border-radius:12px; background:#f7fbf9; }
.visibility-card h3 { margin:0 0 10px; font-size:16px; color:#294a40; }
.visibility-card p { margin:6px 0 0; font-size:12px; color:#6b7e7b; line-height:1.7; }
.visibility-card .visibility-warning { color:#a16b17; }
@media(max-width:1100px) { .workspace-header { align-items:flex-start; } .workspace-steps button { padding:14px 12px; gap:10px; } .workspace-status { padding-left:18px; } }
@media(max-width:800px) { .workspace-header { flex-direction:column; padding:20px; } .workspace-status { grid-template-columns:1fr 1fr; width:100%; border-left:0; border-top:1px solid #e5ebed; padding:18px 0 0; } .workspace-steps { grid-template-columns:1fr 1fr; } .workspace-identity h2 { font-size:20px; } }
@media(max-width:520px) { .workspace-identity img,.identity-placeholder { width:60px; height:60px; } .workspace-status { grid-template-columns:1fr; } .workspace-notice,.visibility-card { flex-direction:column; align-items:flex-start; } .workspace-steps small { display:none; } .workspace-steps button { padding:12px 8px; } }
</style>
