<template>
  <div class="product-page">
    <el-alert class="product-entry-guide" type="info" :closable="false" show-icon>
      <template #title>从产品工作区维护介绍、套餐、履约准备与上线检查。</template>
      <div>单独售卖实物请前往 <el-button link type="primary" @click="router.push('/shop/products')">商城商品</el-button>。历史实物与组合介绍可继续维护。</div>
    </el-alert>
    <el-tabs v-model="activeTab">
      <!-- 产品列表标签页 -->
      <el-tab-pane label="产品列表" name="products">
        <!-- 工具栏 -->
        <AdminListToolbar>
          <div class="toolbar__search">
            <el-input
              v-model="keyword"
              placeholder="搜索产品标题..."
              clearable
              prefix-icon="Search"
              @keyup.enter="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>

          <div class="toolbar__filters">
            <el-select
              v-model="moduleId"
              placeholder="全部分类"
              clearable
              style="width: 160px"
              @change="handleSearch"
            >
              <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>

            <el-select
              v-model="productType"
              placeholder="全部类型"
              clearable
              style="width: 160px"
              @change="handleSearch"
            >
              <el-option v-for="item in productTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>

            <el-select
              v-model="status"
              placeholder="全部状态"
              clearable
              style="width: 140px"
              @change="handleSearch"
            >
              <el-option label="草稿" :value="0" />
              <el-option label="已上架" :value="1" />
              <el-option label="已下架" :value="2" />
            </el-select>

            <el-button plain icon="Refresh" @click="resetSearch">重置</el-button>

            <!-- 新增产品按钮 -->
            <el-button type="primary" @click="openProductDialog()">新增服务产品</el-button>
          </div>
        </AdminListToolbar>

        <!-- 产品表格 -->
        <div class="table-wrapper">
          <AdminListTable :data="products" :loading="loading" style="width: 100%" :error="listError" @retry="loadProducts">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="产品" min-width="260">
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
            <el-table-column label="分类" width="110">
              <template #default="{ row }">{{ row.module?.name || '-' }}</template>
            </el-table-column>
            <el-table-column label="类型" width="110">
              <template #default="{ row }">
                <el-tag :type="productTypeTagType(row.productType)" effect="light">{{ productTypeText(row.productType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="priceText" label="价格文案" width="120" />
            <el-table-column label="标签" min-width="140">
              <template #default="{ row }">
                <div class="tags-container">
                  <el-tag v-for="tag in row.tags.slice(0, 2)" :key="tag" size="small">{{ tag }}</el-tag>
                  <el-popover v-if="row.tags.length > 2" placement="top" :width="280" trigger="click">
                    <template #reference>
                      <el-tag class="tags-more" size="small" type="info" effect="plain" tabindex="0">
                        +{{ row.tags.length - 2 }} 查看全部
                      </el-tag>
                    </template>
                    <div class="tags-popover-title">产品标签（{{ row.tags.length }}）</div>
                    <div class="tags-popover-content">
                      <el-tag v-for="tag in row.tags" :key="tag" size="small" effect="light">{{ tag }}</el-tag>
                    </div>
                  </el-popover>
                  <span v-if="!row.tags.length" class="tags-empty">—</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="介绍展示" width="110">
              <template #default="{ row }">
                <el-tag v-if="row.status === 1" type="success" effect="light" round>已展示</el-tag>
                <el-tag v-else-if="row.status === 2" type="info" effect="light" round>已隐藏</el-tag>
                <el-tag v-else type="warning" effect="light" round>草稿</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="104" fixed="right" align="center">
          <template #default="{ row }">
            <AdminListActions>
              <AdminListAction label="进入产品工作区" icon="Edit" @click="editProduct(row)" />
              <AdminListAction v-if="row.productType === 'service'" label="管理套餐" icon="DocumentChecked" @click="router.push({ name: 'ProductWorkspace', params: { id: row.id }, query: { tab: 'packages' } })" />
              <template #more>
                <el-dropdown-item v-if="row.status !== 1" @click="publishProduct(row)">展示介绍</el-dropdown-item>
                <el-dropdown-item v-else @click="unpublishProduct(row)">隐藏介绍</el-dropdown-item>
              </template>
            </AdminListActions>
          </template>
        </el-table-column>
          </AdminListTable>

        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <AdminListPagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
          :disabled="loading" @change="loadProducts" />
        </div>
      </el-tab-pane>

      <!-- 产品分类标签页 -->
      <el-tab-pane label="产品分类" name="modules">
        <div class="page-head">
          <h2 class="page-head__title">产品分类</h2>
          <el-button type="primary" @click="openModuleDialog()">新增分类</el-button>
        </div>

        <div class="table-wrapper">
          <AdminListTable :data="modules" style="width: 100%" :loading="moduleLoading" :error="moduleError" @retry="loadModules">
            <el-table-column prop="name" label="分类名称" width="160" />
            <el-table-column prop="code" label="编码" width="120" show-overflow-tooltip />
            <el-table-column prop="icon" label="图标文案" width="100" />
            <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
            <el-table-column label="首页展示" width="100">
              <template #default="{ row }">
                <el-tag :type="row.showOnHome ? 'success' : 'info'" effect="light" round>
                  {{ row.showOnHome ? '展示' : '隐藏' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="评估" width="110">
              <template #default="{ row }">
                <el-tag :type="row.assessmentEnabled ? 'success' : 'info'" effect="light" round>
                  {{ row.assessmentEnabled ? '已开启' : '未开启' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="分类状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template></el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="80" />
            <el-table-column label="操作" width="88" fixed="right" align="center">
          <template #default="{ row }">
            <AdminListActions>
              <AdminListAction label="编辑" icon="Edit" @click="openModuleDialog(row)" />
              <template #more>
                <el-dropdown-item @click="toggleModuleStatus(row)">{{ row.status === 1 ? '停用分类' : '启用分类' }}</el-dropdown-item>
              </template>
            </AdminListActions>
          </template>
        </el-table-column>
          </AdminListTable>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="moduleDialogVisible" :title="editingModuleId ? '编辑产品分类' : '新增产品分类'" width="620px">
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
        <el-form-item label="分类封面">
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
import AdminListAction from '@/components/AdminListAction.vue'
import AdminListActions from '@/components/AdminListActions.vue'
import AdminListTable from '@/components/AdminListTable.vue'
import AdminListToolbar from '@/components/AdminListToolbar.vue'
import AdminListPagination from '@/components/AdminListPagination.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { productApi, type Product, type ProductModule, type ProductModulePayload, type ProductType } from '@/api/product'
import AdminCoverUpload from '@/components/AdminCoverUpload.vue'

const router = useRouter()
const route = useRoute()

const moduleError = ref('')
const moduleLoading = ref(false)
const listError = ref('')


const activeTab = ref(route.query.tab === 'modules' ? 'modules' : 'products')
const modules = ref<ProductModule[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const moduleId = ref<number | ''>('')
const status = ref<number | ''>('')
const productType = ref<ProductType | ''>('')

const moduleDialogVisible = ref(false)
const editingModuleId = ref<number | null>(null)

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

const productTypeOptions: Array<{ label: string; value: ProductType }> = [
  { label: '服务产品', value: 'service' },
  { label: '实物介绍（历史）', value: 'physical' },
  { label: '组合介绍（历史）', value: 'package' },
]


function productTypeText(value?: string) {
  return productTypeOptions.find((item) => item.value === value)?.label || '服务产品'
}

function productTypeTagType(value?: string) {
  if (value === 'physical') return 'warning'
  if (value === 'package') return 'success'
  return 'info'
}

async function loadModules() {
  moduleLoading.value = true
  moduleError.value = ''
  try {
    modules.value = await productApi.listModules()
  } catch {
    moduleError.value = '列表加载失败，请重试'
  } finally {
    moduleLoading.value = false
  }
}

async function loadProducts() {
  loading.value = true
  listError.value = ''
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
  } catch {
    listError.value = '列表加载失败，请重试'
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

function openProductDialog(row?: Product) {
  void router.push(row ? { name:'ProductWorkspace', params:{ id:row.id } } : { name:'ProductCreate' })
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
    ElMessage.error('请填写分类编码和名称')
    return
  }
  const data = {
    ...moduleForm,
    assessmentType: moduleForm.assessmentEnabled ? moduleForm.assessmentType || '' : '',
  }
  if (editingModuleId.value) {
    await productApi.updateModule(editingModuleId.value, data)
    ElMessage.success('分类已更新')
  } else {
    await productApi.createModule(data)
    ElMessage.success('分类已创建')
  }
  Object.assign(moduleForm, defaultModuleForm())
  editingModuleId.value = null
  moduleDialogVisible.value = false
  await loadModules()
}

async function toggleModule(row: ProductModule) {
  await productApi.updateModule(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '分类已停用' : '分类已启用')
  await loadModules()
}

async function publish(row: Product) {
  await productApi.publishProduct(row.id)
  ElMessage.success('介绍已展示')
  await loadProducts()
}

async function unpublish(row: Product) {
  await productApi.unpublishProduct(row.id)
  ElMessage.success('介绍已隐藏')
  await loadProducts()
}

function editProduct(row: Product) {
  openProductDialog(row)
}

function publishProduct(row: Product) {
  publish(row)
}

function unpublishProduct(row: Product) {
  unpublish(row)
}

const moduleStatusSaving = ref(false)
async function toggleModuleStatus(row: ProductModule) {
  if (moduleStatusSaving.value) return
  const enabled = row.status !== 1
  try {
    await ElMessageBox.confirm(enabled ? `启用“${row.name}”后，已上架产品可恢复展示。` : `停用“${row.name}”后，该分类及其产品将从公开浏览入口隐藏，已有订单仍保留。`, enabled ? '启用分类' : '停用分类', { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' })
  } catch { return }
  moduleStatusSaving.value = true
  try {
    await productApi.updateModule(row.id, { status: enabled ? 1 : 0 })
    ElMessage.success(enabled ? '分类已启用' : '分类已停用')
    await loadModules()
  } finally { moduleStatusSaving.value = false }
}

onMounted(async () => {
  await loadModules()
  await loadProducts()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
.product-entry-guide { margin-bottom: 16px; }
.product-type-guide { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; }
.product-type-guide > span { color: #64748b; font-size: 12px; line-height: 1.7; }
.product-page {
  display: flex;
  flex-direction: column;
  gap: $space-16;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-16;
  margin-bottom: $space-12;

  &__title {
    margin: 0;
    font-size: $font-size-xl;
    font-weight: 800;
    color: $color-text;
    line-height: 1.2;
  }

  &__actions {
    display: flex;
    gap: $space-12;
    flex-shrink: 0;
  }
}

.product-info {
  display: flex;
  align-items: flex-start;
  gap: $space-12;
}

.product-cover {
  width: 64px;
  height: 64px;
  border-radius: $radius-md;
  flex-shrink: 0;
  background: $color-surface-soft;
  object-fit: cover;
}

.product-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $color-text;
  line-height: 1.4;
}

.product-subtitle {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-top: $space-4;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: $space-6;
  align-items: center;
}

.tags-more {
  cursor: pointer;
}

.tags-empty {
  color: $color-text-tertiary;
}

.tags-popover-title {
  margin-bottom: 10px;
  color: $color-text-secondary;
  font-size: $font-size-xs;
}

.tags-popover-content {
  display: flex;
  flex-wrap: wrap;
  gap: $space-6;
}

:deep(.el-dialog) {
  .el-dialog__header {
    background: $color-surface-soft;
    border-bottom: 1px solid $color-border;
  }

  .el-dialog__body {
    padding: 0;
  }

  .el-tabs__content {
    padding: $space-24;
  }

  .el-form-item {
    margin-bottom: $space-20;
  }
}

.tag-rule-desc {
  padding: $space-12;
  margin-bottom: $space-16;
  background: color-mix(in srgb, $color-info 8%, $color-bg-white);
  border-left: 3px solid $color-info;
  border-radius: $radius-md;
  font-size: $font-size-xs;
  color: $color-info;
  line-height: 1.6;
}

/* ── 平板端 ── */
@media (max-width: 1024px) {
  .toolbar {
    &__search {
      min-width: 100%;
      flex: none;
    }

    &__filters {
      width: 100%;
    }
  }

  .product-cover {
    width: 56px;
    height: 56px;
  }
}

/* ── 移动端 ── */
@media (max-width: 767px) {
  .product-page {
    gap: $space-12;
  }

  .toolbar {
    flex-direction: column;
    padding: $space-12;

    &__search,
    &__filters {
      width: 100%;

      :deep(.el-input),
      :deep(.el-select),
      :deep(.el-button) {
        width: 100%;
      }
    }
  }

  .product-cover {
    width: 48px;
    height: 48px;
  }

  .product-title {
    font-size: $font-size-xs;
  }

  .product-subtitle {
    font-size: 11px;
  }

  .pagination-wrapper {
    padding: $space-12;
    justify-content: center;
  }

  :deep(.el-tabs__content) {
    padding: $space-16 !important;
  }
}
</style>
