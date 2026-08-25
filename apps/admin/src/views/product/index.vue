<template>
  <div class="product-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>产品管理</span>
          <div>
            <el-button @click="openModuleDialog()">新增模块</el-button>
            <el-button type="primary" @click="openProductDialog()">新增产品</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="产品列表" name="products">
          <div class="page-toolbar">
            <el-input v-model="keyword" placeholder="搜索标题/简介" clearable style="width: 240px" @keyup.enter="handleSearch" />
            <el-select v-model="moduleId" placeholder="全部模块" clearable style="width: 160px">
              <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
            <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="草稿" :value="0" />
              <el-option label="上架" :value="1" />
              <el-option label="下架" :value="2" />
            </el-select>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </div>

          <el-table :data="products" v-loading="loading" stripe>
            <el-table-column label="产品" min-width="240">
              <template #default="{ row }">
                <div class="product-info">
                  <el-image v-if="row.coverUrl" :src="row.coverUrl" class="product-cover" fit="cover" />
                  <div>
                    <div class="product-title">{{ row.title }}</div>
                    <div class="product-subtitle">{{ row.subtitle || row.summary || '-' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="模块" width="110">
              <template #default="{ row }">{{ row.module?.name || '-' }}</template>
            </el-table-column>
            <el-table-column prop="priceText" label="价格" width="120" />
            <el-table-column label="标签" min-width="180">
              <template #default="{ row }">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="优先级" width="90">
              <template #default="{ row }">{{ row.priority }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="productStatusType(row.status)">{{ productStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openProductDialog(row)">编辑</el-button>
                <el-button v-if="row.status !== 1" size="small" type="success" @click="publish(row)">上架</el-button>
                <el-button v-else size="small" type="warning" @click="unpublish(row)">下架</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            class="page-pager"
            @current-change="loadProducts"
            @size-change="loadProducts"
          />
        </el-tab-pane>

        <el-tab-pane label="产品模块" name="modules">
          <el-table :data="modules" stripe>
            <el-table-column prop="code" label="编码" width="140" />
            <el-table-column prop="name" label="名称" width="140" />
            <el-table-column prop="icon" label="图标文案" width="100" />
            <el-table-column prop="description" label="说明" />
            <el-table-column label="首页展示" width="100">
              <template #default="{ row }">
                <el-tag :type="row.showOnHome ? 'success' : 'info'">{{ row.showOnHome ? '展示' : '隐藏' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="评估" width="110">
              <template #default="{ row }">
                <el-tag :type="row.assessmentEnabled ? 'success' : 'info'">{{ row.assessmentEnabled ? (row.assessmentType || '已开启') : '未开启' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="90" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-switch :model-value="row.status === 1" @change="toggleModule(row)" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openModuleDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="productDialogVisible" :title="editingProductId ? '编辑产品' : '新增产品'" width="760px">
      <el-form ref="productFormRef" :model="productForm" :rules="productRules" label-width="110px">
        <el-form-item label="所属模块" prop="moduleId">
          <el-select v-model="productForm.moduleId" placeholder="请选择模块" style="width: 100%">
            <el-option v-for="item in activeModules" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="productForm.title" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="productForm.subtitle" />
        </el-form-item>
        <el-form-item label="封面地址">
          <el-input v-model="productForm.coverUrl" placeholder="可填图片 URL" />
        </el-form-item>
        <el-form-item label="价格文案">
          <el-input v-model="productForm.priceText" placeholder="例如：199元起 / 到店咨询" />
        </el-form-item>
        <el-form-item label="推荐标签">
          <el-select
            v-model="productForm.tagIds"
            multiple
            filterable
            placeholder="从标签字典选择"
            style="width: 100%"
          >
            <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
              <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="强相关标签">
          <el-select v-model="productForm.primaryTagIds" multiple filterable placeholder="核心命中标签，默认可与推荐标签一致" style="width: 100%">
            <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
              <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="弱相关标签">
          <el-select v-model="productForm.secondaryTagIds" multiple filterable placeholder="可覆盖但不是核心的标签" style="width: 100%">
            <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
              <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="排除标签">
          <el-select v-model="productForm.excludeTagIds" multiple filterable placeholder="命中这些标签时不推荐该产品" style="width: 100%">
            <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
              <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="优先级/排序">
          <el-input-number v-model="productForm.priority" :min="0" />
          <el-input-number v-model="productForm.sortOrder" :min="0" class="sort-input" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="productForm.summary" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="适合人群">
          <el-input v-model="productForm.targetUserText" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="解决痛点">
          <el-input v-model="productForm.painPointText" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="服务流程">
          <el-input v-model="productForm.serviceProcess" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="详情">
          <el-input v-model="productForm.detail" type="textarea" :rows="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProduct">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="moduleDialogVisible" :title="editingModuleId ? '编辑模块' : '新增模块'" width="620px">
      <el-form :model="moduleForm" label-width="90px">
        <el-form-item label="编码">
          <el-input v-model="moduleForm.code" placeholder="如 health" :disabled="!!editingModuleId" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="moduleForm.name" />
        </el-form-item>
        <el-form-item label="图标文案">
          <el-input v-model="moduleForm.icon" maxlength="20" placeholder="如 健康 / 美学 / 亲子" />
        </el-form-item>
        <el-form-item label="封面地址">
          <el-input v-model="moduleForm.coverUrl" placeholder="可填图片 URL，暂用于后续展示扩展" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="moduleForm.description" />
        </el-form-item>
        <el-form-item label="首页展示">
          <el-switch v-model="moduleForm.showOnHome" active-text="展示" inactive-text="隐藏" />
        </el-form-item>
        <el-form-item label="需求评估">
          <el-switch v-model="moduleForm.assessmentEnabled" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item v-if="moduleForm.assessmentEnabled" label="评估类型">
          <el-select v-model="moduleForm.assessmentType" placeholder="请选择评估类型" style="width: 100%">
            <el-option label="健康评估" value="health" />
            <el-option label="美学评估" value="beauty" />
            <el-option label="家庭评估" value="family" />
            <el-option label="情绪评估" value="emotion" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="moduleForm.status">
            <el-radio-button :label="1">启用</el-radio-button>
            <el-radio-button :label="0">停用</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="moduleForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitModule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { productApi, type Product, type ProductModule, type ProductModulePayload, type ProductPayload, type TagDictionary } from '@/api/product'
import { buildTagOptionGroups, mapTagNamesToIds, tagOptionLabel } from '@/utils/tags'

const activeTab = ref('products')
const modules = ref<ProductModule[]>([])
const products = ref<Product[]>([])
const tags = ref<TagDictionary[]>([])
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const moduleId = ref<number | ''>('')
const status = ref<number | ''>('')

const productDialogVisible = ref(false)
const moduleDialogVisible = ref(false)
const editingProductId = ref<number | null>(null)
const editingModuleId = ref<number | null>(null)
const productFormRef = ref<FormInstance>()

const defaultProductForm = (): ProductPayload => ({
  moduleId: modules.value[0]?.id ?? 0,
  title: '',
  subtitle: '',
  coverUrl: '',
  priceText: '',
  summary: '',
  detail: '',
  targetUserText: '',
  painPointText: '',
  serviceProcess: '',
  tags: [],
  tagIds: [],
  primaryTagIds: [],
  secondaryTagIds: [],
  excludeTagIds: [],
  priority: 0,
  sortOrder: 0,
})
const productForm = reactive<ProductPayload>(defaultProductForm())
const defaultModuleForm = (): ProductModulePayload => ({
  code: '',
  name: '',
  description: '',
  icon: '',
  coverUrl: '',
  showOnHome: false,
  assessmentEnabled: false,
  assessmentType: '',
  sortOrder: 0,
  status: 1,
})
const moduleForm = reactive<ProductModulePayload>(defaultModuleForm())

const productRules = {
  moduleId: [{ required: true, message: '请选择模块', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const activeModules = computed(() => modules.value.filter((item) => item.status === 1))
const selectableTags = computed(() => tags.value.filter((item) => (
  item.status === 1 && (!item.moduleId || item.moduleId === productForm.moduleId)
)))
const groupedSelectableTags = computed(() => buildTagOptionGroups(selectableTags.value))

function cleanTags(values: string[] = []) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].slice(0, 20)
}

function productStatusText(value: number) {
  return value === 1 ? '上架' : value === 2 ? '下架' : '草稿'
}

function productStatusType(value: number) {
  return value === 1 ? 'success' : value === 2 ? 'warning' : 'info'
}

async function loadModules() {
  modules.value = await productApi.listModules()
}

async function loadTags() {
  tags.value = await productApi.listTags({ status: 1 })
}

async function loadProducts() {
  loading.value = true
  try {
    const res = await productApi.listProducts({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      moduleId: moduleId.value,
      status: status.value,
    })
    products.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadProducts()
}

function resetSearch() {
  keyword.value = ''
  moduleId.value = ''
  status.value = ''
  handleSearch()
}

function assignProductForm(data: ProductPayload) {
  Object.assign(productForm, data)
}

function openProductDialog(row?: Product) {
  editingProductId.value = row?.id ?? null
  assignProductForm(row
    ? {
        moduleId: row.module.id,
        title: row.title,
        subtitle: row.subtitle,
        coverUrl: row.coverUrl,
        priceText: row.priceText,
        summary: row.summary,
        detail: row.detail,
        targetUserText: row.targetUserText,
        painPointText: row.painPointText,
        serviceProcess: row.serviceProcess,
        tags: row.tags,
        tagIds: row.tagIds?.length ? row.tagIds : mapTagNamesToIds(row.tags, tags.value),
        primaryTagIds: row.primaryTagIds?.length ? row.primaryTagIds : (row.tagIds?.length ? row.tagIds : mapTagNamesToIds(row.tags, tags.value)),
        secondaryTagIds: row.secondaryTagIds || [],
        excludeTagIds: row.excludeTagIds || [],
        priority: row.priority,
        sortOrder: row.sortOrder,
      }
    : defaultProductForm())
  productDialogVisible.value = true
  productFormRef.value?.clearValidate()
}

async function submitProduct() {
  await productFormRef.value?.validate()
  submitting.value = true
  try {
    const data = { ...productForm, tags: cleanTags(productForm.tags), tagIds: productForm.tagIds }
    if (editingProductId.value) {
      await productApi.updateProduct(editingProductId.value, data)
      ElMessage.success('产品已更新')
    } else {
      await productApi.createProduct(data)
      ElMessage.success('产品已创建')
    }
    productDialogVisible.value = false
    await loadProducts()
  } finally {
    submitting.value = false
  }
}

function openModuleDialog(row?: ProductModule) {
  editingModuleId.value = row?.id ?? null
  Object.assign(moduleForm, row
    ? {
        code: row.code,
        name: row.name,
        description: row.description,
        icon: row.icon,
        coverUrl: row.coverUrl,
        showOnHome: row.showOnHome,
        assessmentEnabled: row.assessmentEnabled,
        assessmentType: row.assessmentType,
        sortOrder: row.sortOrder,
        status: row.status,
      }
    : defaultModuleForm())
  moduleDialogVisible.value = true
}

async function submitModule() {
  if (!moduleForm.code || !moduleForm.name) {
    ElMessage.error('请填写模块编码和名称')
    return
  }
  const data = {
    ...moduleForm,
    assessmentType: moduleForm.assessmentEnabled ? moduleForm.assessmentType || '' : '',
  }
  if (editingModuleId.value) {
    await productApi.updateModule(editingModuleId.value, data)
    ElMessage.success('模块已更新')
  } else {
    await productApi.createModule(data)
    ElMessage.success('模块已创建')
  }
  Object.assign(moduleForm, defaultModuleForm())
  editingModuleId.value = null
  moduleDialogVisible.value = false
  await loadModules()
}

async function toggleModule(row: ProductModule) {
  await productApi.updateModule(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '模块已停用' : '模块已启用')
  await loadModules()
}

async function publish(row: Product) {
  await productApi.publishProduct(row.id)
  ElMessage.success('产品已上架')
  await loadProducts()
}

async function unpublish(row: Product) {
  await productApi.unpublishProduct(row.id)
  ElMessage.success('产品已下架')
  await loadProducts()
}

onMounted(async () => {
  await loadModules()
  await loadTags()
  await loadProducts()
})
</script>

<style scoped>
.card-header,
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.page-toolbar {
  justify-content: flex-start;
  margin-bottom: 16px;
}
.page-pager {
  margin-top: 16px;
}
.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.product-cover {
  width: 72px;
  height: 48px;
  border-radius: 4px;
  flex-shrink: 0;
}
.product-title {
  font-weight: 600;
  color: #1f2937;
}
.product-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.tag-item {
  margin: 2px 4px 2px 0;
}
.sort-input {
  margin-left: 12px;
}
</style>
