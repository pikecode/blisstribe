<template>
  <div class="product-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">产品管理</div>
            <div class="card-header__desc">维护服务模块、产品标签、推荐优先级和上下架状态</div>
          </div>
          <div>
            <el-button @click="openModuleDialog()">新增模块</el-button>
            <el-button type="primary" @click="openProductDialog()">新增产品</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="产品列表" name="products">
          <!-- 搜索栏 -->
          <div class="search-bar">
            <div class="search-box">
              <el-input
                v-model="keyword"
                placeholder="搜索产品标题或简介..."
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <i class="el-icon-search"></i>
                </template>
              </el-input>
              <el-button type="primary" @click="handleSearch" class="search-btn">搜索</el-button>
              <el-button @click="showFilters = !showFilters" :class="{ active: showFilters }">
                🔽 高级筛选
              </el-button>
            </div>

            <!-- 筛选面板 -->
            <el-collapse-transition>
              <div v-if="showFilters" class="filters-panel">
                <div class="filters-row">
                  <div class="filter-item">
                    <label>模块</label>
                    <el-select v-model="moduleId" placeholder="全部模块" clearable>
                      <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                  </div>
                  <div class="filter-item">
                    <label>产品类型</label>
                    <el-select v-model="productType" placeholder="全部类型" clearable>
                      <el-option v-for="item in productTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </div>
                  <div class="filter-item">
                    <label>上下架状态</label>
                    <el-select v-model="status" placeholder="全部状态" clearable>
                      <el-option label="草稿" :value="0" />
                      <el-option label="上架" :value="1" />
                      <el-option label="下架" :value="2" />
                    </el-select>
                  </div>
                </div>
                <div class="filters-actions">
                  <el-button @click="resetSearch">重置筛选</el-button>
                  <el-button type="primary" @click="handleSearch">应用筛选</el-button>
                </div>
              </div>
            </el-collapse-transition>
          </div>

          <el-table :data="products" v-loading="loading" stripe>
            <el-table-column label="产品" min-width="240">
              <template #default="{ row }">
                <div class="product-info">
                  <el-image v-if="row.coverUrl" :src="row.coverUrl" class="product-cover" fit="cover" />
                  <div>
                    <div class="table-title">{{ row.title }}</div>
                    <div class="table-subtitle">{{ row.subtitle || row.summary || '-' }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="模块" width="110">
              <template #default="{ row }">{{ row.module?.name || '-' }}</template>
            </el-table-column>
            <el-table-column label="类型" width="110">
              <template #default="{ row }">
                <el-tag :type="productTypeTagType(row.productType)">{{ productTypeText(row.productType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="priceText" label="价格" width="100" />
            <el-table-column label="标签" min-width="160">
              <template #default="{ row }">
                <div class="tags-container">
                  <el-tag v-for="tag in row.tags.slice(0, 3)" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
                  <el-popover v-if="row.tags.length > 3" :content="`${row.tags.slice(3).join(', ')}`" placement="top">
                    <template #reference>
                      <span class="tag-more">+{{ row.tags.length - 3 }}</span>
                    </template>
                  </el-popover>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.status === 1" type="success" effect="light">已上架</el-tag>
                <el-tag v-else-if="row.status === 2" type="info" effect="light">已下架</el-tag>
                <el-tag v-else type="warning" effect="light">草稿</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" fixed="right" align="center">
              <template #default="{ row }">
                <el-dropdown @command="handleAction(row, $event)">
                  <span class="action-icon">⋮</span>
                  <template #dropdown>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item v-if="row.status !== 1" command="publish">上架</el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 1" command="unpublish">下架</el-dropdown-item>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadProducts"
              @size-change="loadProducts"
            />
          </div>
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
                <div class="table-actions">
                  <el-button size="small" @click="openModuleDialog(row)">编辑</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="productDialogVisible" :title="editingProductId ? '编辑产品' : '新增产品'" width="800px" :close-on-click-modal="false">
      <el-form ref="productFormRef" :model="productForm" :rules="productRules" label-width="100px">
        <el-tabs>
          <!-- 基础信息 -->
          <el-tab-pane label="基础信息" name="basic">
            <el-form-item label="所属模块" prop="moduleId">
              <el-select v-model="productForm.moduleId" placeholder="请选择模块" style="width: 100%">
                <el-option v-for="item in activeModules" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="产品类型" prop="productType">
              <el-radio-group v-model="productForm.productType">
                <el-radio-button v-for="item in productTypeOptions" :key="item.value" :label="item.value">
                  {{ item.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="标题" prop="title">
              <el-input v-model="productForm.title" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="productForm.subtitle" />
            </el-form-item>
            <el-form-item label="产品封面">
              <AdminCoverUpload v-model="productForm.coverUrl" tip="支持 jpg/png/webp，建议使用产品实拍或服务场景横图，文件不超过 5MB" />
            </el-form-item>
            <el-form-item label="价格文案">
              <el-input v-model="productForm.priceText" placeholder="例如：199元起 / 到店咨询" />
            </el-form-item>
            <el-form-item label="优先级/排序">
              <div style="display: flex; gap: 12px">
                <el-input-number v-model="productForm.priority" :min="0" placeholder="优先级" />
                <el-input-number v-model="productForm.sortOrder" :min="0" placeholder="排序" />
              </div>
            </el-form-item>
          </el-tab-pane>

          <!-- 标签规则 -->
          <el-tab-pane label="标签规则" name="tags">
            <div class="tag-rule-desc">根据用户标签推荐优先级配置。强相关标签优先推荐，排除标签会完全屏蔽该产品。</div>
            <el-form-item label="推荐标签" prop="tagIds">
              <el-select
                v-model="productForm.tagIds"
                multiple
                filterable
                placeholder="通用推荐标签"
                style="width: 100%"
              >
                <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
                  <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item label="强相关标签">
              <el-select v-model="productForm.primaryTagIds" multiple filterable placeholder="核心命中标签" style="width: 100%">
                <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
                  <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
                </el-option-group>
              </el-select>
              <div style="font-size: 12px; color: #999; margin-top: 4px">用户命中这些标签时优先推荐此产品</div>
            </el-form-item>
            <el-form-item label="弱相关标签">
              <el-select v-model="productForm.secondaryTagIds" multiple filterable placeholder="可覆盖但非核心标签" style="width: 100%">
                <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
                  <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
                </el-option-group>
              </el-select>
              <div style="font-size: 12px; color: #999; margin-top: 4px">用户命中这些标签时可推荐，但优先级较低</div>
            </el-form-item>
            <el-form-item label="排除标签">
              <el-select v-model="productForm.excludeTagIds" multiple filterable placeholder="命中则不推荐" style="width: 100%">
                <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
                  <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
                </el-option-group>
              </el-select>
              <div style="font-size: 12px; color: #999; margin-top: 4px">用户命中这些标签时不推荐此产品</div>
            </el-form-item>
          </el-tab-pane>

          <!-- 类型详情 -->
          <el-tab-pane label="类型详情" name="details">
            <template v-if="showServiceFields">
              <el-divider content-position="left">服务信息</el-divider>
              <el-form-item label="服务方式">
                <el-select v-model="productForm.serviceMode" placeholder="请选择服务方式" clearable style="width: 100%">
                  <el-option label="线上服务" value="online" />
                  <el-option label="到店服务" value="offline" />
                  <el-option label="线上 + 到店" value="mixed" />
                </el-select>
              </el-form-item>
              <el-form-item label="服务周期">
                <el-input v-model="productForm.serviceDuration" placeholder="例如：1次咨询 / 7天跟进 / 30天方案" />
              </el-form-item>
              <el-form-item label="是否预约">
                <el-switch v-model="productForm.appointmentRequired" active-text="需要" inactive-text="不需要" />
              </el-form-item>
              <el-form-item label="服务流程">
                <el-input v-model="productForm.serviceProcess" type="textarea" :rows="2" />
              </el-form-item>
            </template>
            <template v-if="showPhysicalFields">
              <el-divider :content-position="showServiceFields ? 'left' : 'center'">实物信息</el-divider>
              <el-form-item label="规格说明">
                <el-input v-model="productForm.specText" type="textarea" :rows="2" placeholder="例如：30包/盒，适合日常补充" />
              </el-form-item>
              <el-form-item label="配送说明">
                <el-input v-model="productForm.deliveryText" type="textarea" :rows="2" placeholder="例如：下单后由顾问确认配送方式" />
              </el-form-item>
              <el-form-item label="售后说明">
                <el-input v-model="productForm.afterSaleText" type="textarea" :rows="2" placeholder="例如：未拆封可沟通售后处理" />
              </el-form-item>
              <el-form-item label="库存状态">
                <el-select v-model="productForm.stockStatus" style="width: 100%">
                  <el-option label="正常供应" value="available" />
                  <el-option label="库存紧张" value="limited" />
                  <el-option label="暂不可售" value="sold_out" />
                </el-select>
              </el-form-item>
            </template>
            <div v-if="!showServiceFields && !showPhysicalFields" style="padding: 40px; text-align: center; color: #999">
              请先在"基础信息"中选择产品类型
            </div>
          </el-tab-pane>

          <!-- 描述内容 -->
          <el-tab-pane label="描述内容" name="content">
            <el-form-item label="简介">
              <el-input v-model="productForm.summary" type="textarea" :rows="3" placeholder="产品简介，会在列表中展示" />
            </el-form-item>
            <el-form-item label="适合人群">
              <el-input v-model="productForm.targetUserText" type="textarea" :rows="2" placeholder="描述最适合的使用人群" />
            </el-form-item>
            <el-form-item label="解决痛点">
              <el-input v-model="productForm.painPointText" type="textarea" :rows="2" placeholder="该产品解决的具体痛点" />
            </el-form-item>
            <el-form-item label="详情">
              <el-input v-model="productForm.detail" type="textarea" :rows="5" placeholder="产品详细描述和使用说明" />
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
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
        <el-form-item label="模块封面">
          <AdminCoverUpload v-model="moduleForm.coverUrl" tip="支持 jpg/png/webp，建议使用能代表模块主题的横图，文件不超过 5MB" />
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
import { productApi, type Product, type ProductModule, type ProductModulePayload, type ProductPayload, type ProductType, type TagDictionary } from '@/api/product'
import { buildTagOptionGroups, mapTagNamesToIds, tagOptionLabel } from '@/utils/tags'
import AdminCoverUpload from '@/components/AdminCoverUpload.vue'

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
const productType = ref<ProductType | ''>('')
const showFilters = ref(false)

const productDialogVisible = ref(false)
const moduleDialogVisible = ref(false)
const editingProductId = ref<number | null>(null)
const editingModuleId = ref<number | null>(null)
const productFormRef = ref<FormInstance>()

const defaultProductForm = (): ProductPayload => ({
  moduleId: modules.value[0]?.id ?? 0,
  productType: 'service',
  title: '',
  subtitle: '',
  coverUrl: '',
  priceText: '',
  summary: '',
  detail: '',
  targetUserText: '',
  painPointText: '',
  serviceProcess: '',
  serviceMode: '',
  serviceDuration: '',
  appointmentRequired: false,
  specText: '',
  deliveryText: '',
  afterSaleText: '',
  stockStatus: 'available',
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
  productType: [{ required: true, message: '请选择产品类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

const productTypeOptions: Array<{ label: string; value: ProductType }> = [
  { label: '服务产品', value: 'service' },
  { label: '实物产品', value: 'physical' },
  { label: '组合方案', value: 'package' },
]

const activeModules = computed(() => modules.value.filter((item) => item.status === 1))
const showServiceFields = computed(() => productForm.productType === 'service' || productForm.productType === 'package')
const showPhysicalFields = computed(() => productForm.productType === 'physical' || productForm.productType === 'package')
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

function productTypeText(value?: string) {
  return productTypeOptions.find((item) => item.value === value)?.label || '服务产品'
}

function productTypeTagType(value?: string) {
  if (value === 'physical') return 'warning'
  if (value === 'package') return 'success'
  return 'info'
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
      productType: productType.value,
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
  productType.value = ''
  status.value = ''
  handleSearch()
}

function handleAction(row: Product, command: string) {
  switch (command) {
    case 'edit':
      openProductDialog(row)
      break
    case 'publish':
      publish(row)
      break
    case 'unpublish':
      unpublish(row)
      break
  }
}

function assignProductForm(data: ProductPayload) {
  Object.assign(productForm, data)
}

function openProductDialog(row?: Product) {
  editingProductId.value = row?.id ?? null
  assignProductForm(row
    ? {
        moduleId: row.module.id,
        productType: row.productType || 'service',
        title: row.title,
        subtitle: row.subtitle,
        coverUrl: row.coverUrl,
        priceText: row.priceText,
        summary: row.summary,
        detail: row.detail,
        targetUserText: row.targetUserText,
        painPointText: row.painPointText,
        serviceProcess: row.serviceProcess,
        serviceMode: row.serviceMode || '',
        serviceDuration: row.serviceDuration || '',
        appointmentRequired: row.appointmentRequired || false,
        specText: row.specText || '',
        deliveryText: row.deliveryText || '',
        afterSaleText: row.afterSaleText || '',
        stockStatus: row.stockStatus || 'available',
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
.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.product-cover {
  width: 72px;
  height: 48px;
  border-radius: 6px;
  flex-shrink: 0;
  background: #f1f5f9;
}
.tag-item {
  margin: 2px 4px 2px 0;
}
.sort-input {
  margin-left: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
  border-top: 1px solid #eee;
}

/* 搜索栏样式 */
.search-bar {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid #e4e7eb;
}

.search-box {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box :deep(.el-input) {
  flex: 1;
  max-width: 400px;
}

.search-btn {
  flex-shrink: 0;
}

.search-box > button:last-of-type {
  border-color: #dcdfe6;
  color: #606266;
  transition: all 0.3s;
}

.search-box > button.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #2196f3;
}

/* 筛选面板 */
.filters-panel {
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #eee;
  animation: slideDown 0.3s ease-out;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-item label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.filter-item :deep(.el-select) {
  width: 100%;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

/* 表格行样式 */
:deep(.el-table__row) {
  transition: all 0.3s ease;
}

:deep(.el-table__row:hover) {
  background: #f5f7fa;
}

:deep(.el-table__row:hover .action-menu) {
  color: #2196f3;
}

/* 标签容器 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-more {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-more:hover {
  background: #e0e0e0;
  color: #333;
}

/* 操作菜单 */
.action-menu {
  cursor: pointer;
  color: #606266;
  font-size: 13px;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-menu:hover {
  color: #2196f3;
}

/* 操作图标 */
.action-icon {
  cursor: pointer;
  font-size: 18px;
  color: #909399;
  transition: all 0.3s;
  display: inline-block;
  line-height: 1;
}

.action-icon:hover {
  color: #2196f3;
  transform: scale(1.2);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dialog 内 tabs 样式优化 */
:deep(.el-dialog__body) {
  padding: 0;
}

:deep(.el-tabs) {
  height: 100%;
}

:deep(.el-tabs__content) {
  padding: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

.tag-rule-desc {
  padding: 12px;
  margin-bottom: 16px;
  background: #f0f9ff;
  border-left: 3px solid #0ea5e9;
  border-radius: 4px;
  font-size: 13px;
  color: #0c4a6e;
}
</style>
