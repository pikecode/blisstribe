<template>
  <div class="shop-product-mgr">
    <!-- 工具栏 -->
    <AdminListToolbar role="region" aria-label="搜索和操作工具栏">
      <div class="toolbar__left">
        <div class="toolbar__search">
          <label for="product-search-input" class="sr-only">搜索商品名</label>
          <el-input
            id="product-search-input"
            v-model="keyword"
            placeholder="搜索商品名..."
            clearable
            prefix-icon="Search"
            aria-label="搜索商品"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" @click="handleSearch" aria-label="执行搜索">搜索</el-button>
        </div>
      </div>

      <div class="toolbar__right">
        <el-select
          v-model="selectedCategoryId"
          placeholder="全部分类"
          clearable
          style="width: 160px"
          @change="handleSearch"
        >
          <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>

        <el-select v-model="selectedStatus" placeholder="全部状态" clearable style="width: 130px" aria-label="商品状态筛选" @change="handleSearch">
          <el-option label="草稿" :value="0" /><el-option label="上架" :value="1" /><el-option label="下架" :value="2" />
        </el-select>
        <el-button plain icon="Refresh" @click="resetSearch">重置</el-button>
        <el-button type="primary" @click="openProductDialog()" icon="Plus">新增商品</el-button>
      </div>
    </AdminListToolbar>

    <!-- 商品表格 -->
    <div class="table-wrapper">
      <AdminListTable
        :data="products"
        :loading="loading"
        row-key="id"
        :max-height="620"
        style="width: 100%"
        role="table"
        aria-label="商品列表表格"
        empty-text="暂无符合条件的商品"
       :error="listError" @retry="loadProducts">
        <el-table-column type="expand" width="48">
          <template #default="{ row }">
            <div class="sku-preview">
              <AdminListTable :data="row.skus" size="small">
                <el-table-column label="规格组合" min-width="200"><template #default="{ row: sku }">{{ Object.entries(sku.specifications).map(([name, value]) => `${name}：${value}`).join(' / ') || '默认规格' }}</template></el-table-column>
                <el-table-column label="售价" width="120"><template #default="{ row: sku }">¥{{ (sku.priceFen / 100).toFixed(2) }}</template></el-table-column>
                <el-table-column prop="available" label="可售" width="90" />
                <el-table-column label="状态" width="90"><template #default="{ row: sku }"><el-tag :type="sku.enabled ? 'success' : 'info'" size="small">{{ sku.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
              </AdminListTable>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="280">
          <template #default="{ row }">
            <div class="product-item">
              <el-image
                v-if="row.images && row.images.length > 0"
                :src="row.images[0]"
                class="product-image"
                fit="cover"
              />
              <div v-else class="product-image-placeholder">
                <span>无图片</span>
              </div>
              <div class="product-info">
                <div class="product-name">{{ row.name }}</div>
                <div class="product-desc">{{ getCategoryName(row.categoryId) }} · {{ row.description || '暂无描述' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="规格" width="110"><template #default="{ row }"><el-tag type="info" effect="plain">{{ row.skus.length }} 个规格</el-tag></template></el-table-column>
        <el-table-column label="售价 / 区间" min-width="180">
          <template #default="{ row }">
            ¥{{ (row.priceFen / 100).toFixed(2) }}
            <template v-if="row.priceMaxFen !== row.priceFen">
              - ¥{{ (row.priceMaxFen / 100).toFixed(2) }}
            </template>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="160">
          <template #default="{ row }">
            <div class="stock-info">
            <span class="stock-available">可售 <strong>{{ row.available }}</strong></span>
              <span class="stock-secondary">预留 {{ row.reservedStock }} · 已售 {{ row.soldStock }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              effect="light"
              round
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right" align="center">
          <template #default="{ row }">
            <AdminListActions>
              <AdminListAction label="编辑" icon="Edit" @click="editProduct(row)" />
              <template #more>
                <el-dropdown-item v-if="row.status !== 1" @click="publishProduct(row)">上架商品</el-dropdown-item>
                <el-dropdown-item v-else @click="unpublishProduct(row)">下架商品</el-dropdown-item>
                <el-dropdown-item divided class="danger-menu-item" @click="deleteProduct(row)">删除商品</el-dropdown-item>
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

    <!-- 新增/编辑商品对话框 -->
    <el-dialog
      v-model="productDialogVisible"
      :title="editingProductId ? '编辑商品' : '添加商品'"
      width="min(1100px, 94vw)"
      class="product-dialog"
      :before-close="closeProductDialog"
      top="5vh"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="editor-header"><div><h2>{{ editingProductId ? '编辑商品' : '新增商品' }}</h2><p>{{ editingProductId ? productForm.name : '完善商品信息，再配置售价与库存' }}</p></div><el-tag v-if="editingProductId" type="info" effect="plain">商品 #{{ editingProductId }}</el-tag></div>
      </template>
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="productRules"
        label-position="top"
        :disabled="submitting"
      >
        <el-tabs v-model="editorTab" class="editor-tabs"><el-tab-pane label="商品信息" name="info" /><el-tab-pane :label="`规格与库存（${productForm.skus.length}）`" name="skus" /></el-tabs>
        <div v-show="editorTab === 'info'" class="editor-info">
          <section class="editor-info__main"><h3 class="editor-section-title">基本信息</h3>
          <div class="form-grid">
        <el-form-item label="商品名" prop="name">
          <el-input
            v-model="productForm.name"
            placeholder="请输入商品名"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="productForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>

          </div>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="productForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入商品描述（可选）"
            maxlength="500"
          />
        </el-form-item>

          <el-form-item label="展示排序"><el-input-number v-model="productForm.sortOrder" :min="0" :precision="0" controls-position="right" /><span class="field-hint">数值越小，展示越靠前</span></el-form-item>
          </section>
          <aside class="editor-info__media">
        <el-form-item label="图片与封面" prop="images">
          <div class="images-upload">
            <div class="images-list">
              <div
                v-for="(img, idx) in productForm.images"
                :key="idx"
                class="image-item"
              >
                <el-image :src="img" class="image-preview" fit="cover" />
                <span v-if="idx === 0" class="image-cover">封面</span>
                <div class="image-actions">
                  <el-button v-if="idx > 0" size="small" @click="setCover(idx)">设为封面</el-button>
                  <el-button
                    type="danger"
                    size="small"
                    @click="removeImage(idx)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>

            <div class="upload-area">
              <el-upload
                :disabled="submitting || productForm.images.length >= 5"
                :action="uploadAction"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleImageUploadSuccess"
                :on-error="handleImageUploadError"
                :before-upload="beforeImageUpload"
                accept="image/jpeg,image/png,image/webp"
              >
                <el-button icon="Plus">上传图片</el-button>
              </el-upload>
              <div class="upload-tip">
                首张为封面 · 支持 jpg/png/webp · 最多 5 张 · 单张不超过 5MB
              </div>
            </div>
          </div>
        </el-form-item>

          </aside>
        </div>
        <section v-show="editorTab === 'skus'" class="editor-skus">
          <div class="editor-skus__toolbar"><div><h3>规格与库存</h3><p>共 {{ productForm.skus.length }} 个规格，{{ productForm.skus.filter(sku => sku.enabled).length }} 个启用 · 点击行首箭头编辑属性</p></div><el-button type="primary" plain icon="Plus" @click="addSku">新增规格</el-button></div>
          <el-table ref="skuTableRef" :data="productForm.skus" row-key="key" class="sku-edit-table" :row-class-name="skuRowClass">
            <el-table-column type="expand" width="40">
              <template #default="{ row: sku, $index: index }">
                <div class="sku-property-editor">
                  <div class="sku-property-editor__title">规格属性<span>例如：颜色 / 米白，尺寸 / 大号；无规格商品可留空</span></div>
                  <div v-for="(attribute, attributeIndex) in sku.attributes" :key="attributeIndex" class="sku-attribute">
                    <el-input v-model="attribute.name" placeholder="属性名，如颜色" maxlength="50" :aria-label="`规格 ${index + 1} 属性 ${attributeIndex + 1} 名称`" />
                    <el-input v-model="attribute.value" placeholder="属性值，如米白" maxlength="100" :aria-label="`规格 ${index + 1} 属性 ${attributeIndex + 1} 值`" />
                    <el-button link type="danger" @click="sku.attributes.splice(attributeIndex, 1)" :aria-label="`删除属性 ${attributeIndex + 1}`">移除</el-button>
                  </div>
                  <el-button link type="primary" icon="Plus" @click="sku.attributes.push({ name: '', value: '' })">添加属性</el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="规格" min-width="230">
              <template #default="{ row: sku }">
                <button type="button" class="sku-name-button" :disabled="submitting" @click="skuTableRef?.toggleRowExpansion(sku)">{{ skuLabel(sku) }} <span>编辑属性</span></button>
                <p v-if="skuErrors[sku.key]" class="sku-inline-error" role="alert">{{ skuErrors[sku.key] }}</p>
              </template>
            </el-table-column>
            <el-table-column label="售价（元）" width="160"><template #default="{ row: sku, $index: index }"><el-input-number v-model="sku.priceYuan" :min="0.01" :step="1" :precision="2" controls-position="right" :aria-label="`规格 ${index + 1} 售价（元）`" /></template></el-table-column>
            <el-table-column label="总库存" width="150"><template #default="{ row: sku, $index: index }"><el-input-number v-model="sku.totalStock" :min="sku.reservedStock + sku.soldStock" :step="1" :precision="0" controls-position="right" :aria-label="`规格 ${index + 1} 总库存`" /><p class="sku-stock-hint">预留 {{ sku.reservedStock }} · 已售 {{ sku.soldStock }}</p></template></el-table-column>
            <el-table-column label="可售" width="75"><template #default="{ row: sku }"><strong class="sku-available">{{ sku.enabled ? Math.max(0, (sku.totalStock || 0) - sku.reservedStock - sku.soldStock) : 0 }}</strong></template></el-table-column>
            <el-table-column label="启用" width="70"><template #default="{ row: sku, $index: index }"><el-switch v-model="sku.enabled" :aria-label="`规格 ${index + 1} 启用状态`" /></template></el-table-column>
            <el-table-column label="操作" width="76" fixed="right" align="center">
              <template #default="{ row: sku, $index: index }">
                <el-dropdown trigger="click" :disabled="submitting">
                  <el-button link :disabled="submitting" :aria-label="`规格 ${index + 1} 更多操作`">更多</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :disabled="submitting" @click="copySku(sku)">复制规格</el-dropdown-item>
                      <el-dropdown-item divided class="danger-menu-item" :disabled="submitting || productForm.skus.length <= 1 || sku.reservedStock + sku.soldStock > 0" @click="removeSku(index)">删除规格</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
          <p class="editor-note">总库存包含可售、预留与已售数量；有订单的规格建议停用。修改规格不会改变历史订单快照。</p>
        </section>
      </el-form>

      <template #footer>
        <span class="dialog-footer-hint">{{ formDirty ? '有未保存的修改' : '修改保存后生效' }}</span>
        <el-button v-if="editorTab === 'info'" :disabled="submitting" @click="editorTab = 'skus'">配置规格</el-button>
        <el-button v-else :disabled="submitting" @click="editorTab = 'info'">商品信息</el-button>
        <el-button :disabled="submitting" @click="closeProductDialog()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProduct">保存</el-button>
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
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type TableInstance } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { shopApi, type ShopProduct, type ShopCategory, type ProductSkuInput } from '@/api/shop'

const listError = ref('')


const authStore = useAuthStore()
const productFormRef = ref<FormInstance>()

const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const selectedCategoryId = ref<number | ''>('')
const selectedStatus = ref<number | ''>('')

const categories = ref<ShopCategory[]>([])
const products = ref<ShopProduct[]>([])

const productDialogVisible = ref(false)
const editingProductId = ref<number | null>(null)
const formBaseline = ref('')
const skuErrors = ref<Record<number, string>>({})
const editorTab = ref('info')
const skuTableRef = ref<TableInstance>()

async function closeProductDialog(done?: () => void) {
  if (submitting.value) return
  if (formDirty.value) {
    try {
      await ElMessageBox.confirm('修改尚未保存，关闭后将丢失本次修改。', '放弃修改？', { type: 'warning', confirmButtonText: '放弃修改', cancelButtonText: '继续编辑' })
    } catch { return }
  }
  if (done) done()
  else productDialogVisible.value = false
}

type SkuFormRow = {
  id?: string
  skuCode: string
  key: number
  attributes: { name: string; value: string }[]
  reservedStock: number
  soldStock: number
  priceYuan: number
  totalStock: number
  enabled: boolean
}

function skuRowClass({ row }: { row: SkuFormRow }) {
  return skuErrors.value[row.key] ? 'sku-error-row' : ''
}

function skuLabel(sku: SkuFormRow) {
  return sku.attributes.map(item => item.value.trim()).filter(Boolean).join(' / ') || '默认规格'
}

let skuKey = 0
function newSku(): SkuFormRow {
  return { key: ++skuKey, skuCode: '', attributes: [], priceYuan: 0.01, totalStock: 0, reservedStock: 0, soldStock: 0, enabled: true }
}

const defaultProductForm = () => ({
  categoryId: categories.value[0]?.id || 0,
  name: '',
  description: '',
  skus: [newSku()],
  images: [] as string[],
  sortOrder: 0,
})

const productForm = reactive(defaultProductForm())
const formDirty = computed(() => JSON.stringify(productForm) !== formBaseline.value)

const productRules = {
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  name: [{ required: true, message: '请输入商品名', trigger: 'blur' }],
  images: [
    {
      validator: (rule: any, value: string[]) => {
        if (!value || value.length === 0) {
          return Promise.reject(new Error('请至少上传一张商品图片'))
        }
        return Promise.resolve()
      },
      trigger: 'change',
    },
  ],
}

const uploadAction = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/upload/cover`
const uploadHeaders = computed(() => ({ Authorization: authStore.token }))

function getCategoryName(categoryId: number): string {
  return categories.value.find(cat => String(cat.id) === String(categoryId))?.name || '-'
}

function getStatusText(status: number): string {
  if (status === 1) return '上架'
  if (status === 2) return '下架'
  return '草稿'
}

function getStatusType(status: number): string {
  if (status === 1) return 'success'
  if (status === 2) return 'warning'
  return 'info'
}

async function loadCategories() {
  try {
    categories.value = await shopApi.listCategories()
  } catch (error) {
    ElMessage.error('加载分类失败')
  }
}

async function loadProducts() {
  loading.value = true
  listError.value = ''
  try {
    const result = await shopApi.listProducts({
      page: page.value,
      pageSize: pageSize.value,
      categoryId: selectedCategoryId.value || undefined,
      keyword: keyword.value || undefined,
      status: selectedStatus.value === '' ? undefined : selectedStatus.value,
    })
    products.value = result.list
    total.value = result.total
  } catch (error) {
    listError.value = '列表加载失败，请重试'
    ElMessage.error('加载商品列表失败')
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
  selectedCategoryId.value = ''
  selectedStatus.value = ''
  handleSearch()
}

function openProductDialog(row?: ShopProduct) {
  editingProductId.value = row?.id || null
  if (row) {
    Object.assign(productForm, {
      categoryId: row.categoryId,
      name: row.name,
      description: row.description || '',
      skus: row.skus.map((sku) => ({
        id: String(sku.id),
        skuCode: sku.skuCode,
        key: ++skuKey,
        attributes: Object.entries(sku.specifications).map(([name, value]) => ({ name, value })),
        reservedStock: sku.reservedStock,
        soldStock: sku.soldStock,
        priceYuan: sku.priceFen / 100,
        totalStock: sku.totalStock,
        enabled: sku.enabled,
      })),
      images: [...row.images],
      sortOrder: row.sortOrder,
    })
  } else {
    Object.assign(productForm, defaultProductForm())
  }
  editorTab.value = 'info'
  skuErrors.value = {}
  formBaseline.value = JSON.stringify(productForm)
  productDialogVisible.value = true
  productFormRef.value?.clearValidate()
}

function addSku() {
  const sku = newSku()
  sku.attributes = [{ name: '规格', value: '' }]
  productForm.skus.push(sku)
  nextTick(() => skuTableRef.value?.toggleRowExpansion(sku, true))
}

function copySku(sku: SkuFormRow) {
  productForm.skus.push({
    ...newSku(),
    attributes: sku.attributes.map(attribute => ({ ...attribute })),
    priceYuan: sku.priceYuan,
    totalStock: sku.totalStock,
    enabled: sku.enabled,
  })
  ElMessage.info('已复制，请修改属性值以区分新规格')
}

async function removeSku(index: number) {
  const sku = productForm.skus[index]
  if (!sku || productForm.skus.length <= 1 || sku.reservedStock + sku.soldStock > 0) return
  try {
    await ElMessageBox.confirm('删除后将在保存时移除此规格；有历史订单的规格可能无法删除，建议停用。', '删除规格', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '保留' })
    const currentIndex = productForm.skus.indexOf(sku)
    if (currentIndex >= 0 && productForm.skus.length > 1) productForm.skus.splice(currentIndex, 1)
  } catch {
    // 取消删除时保留规格。
  }
}

function beforeImageUpload(file: any) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    ElMessage.error('仅支持 jpg/png/webp 格式')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片不能超过 5MB')
    return false
  }
  if (productForm.images.length >= 5) {
    ElMessage.error('最多只能上传 5 张图片')
    return false
  }
  return true
}

function handleImageUploadSuccess(res: any) {
  if (res.code !== 200 || !res.data?.url) {
    ElMessage.error(res.message || '上传失败')
    return
  }
  productForm.images.push(res.data.url)
  ElMessage.success('图片上传成功')
}

function handleImageUploadError() {
  ElMessage.error('图片上传失败')
}

function setCover(index: number) {
  const [image] = productForm.images.splice(index, 1)
  productForm.images.unshift(image)
}

function removeImage(index: number) {
  productForm.images.splice(index, 1)
}

async function submitProduct() {
  if (submitting.value) return
  if (!await productFormRef.value?.validate().catch(async () => {
    editorTab.value = 'info'
    await nextTick()
    document.querySelector('.product-dialog .is-error input')?.scrollIntoView({ block: 'center' })
    return false
  })) return

  // 保存前校验必填图片。
  if (!productForm.images || productForm.images.length === 0) {
    ElMessage.error('请至少上传一张商品图片')
    return
  }

  submitting.value = true
  try {
    skuErrors.value = {}
    const combinations = new Set<string>()
    const codes = new Set<string>()
    const skus: ProductSkuInput[] = productForm.skus.map((sku, index) => {
      const prefix = `规格 ${index + 1}：`
      const invalid = (message: string): never => {
        skuErrors.value[sku.key] = message
        editorTab.value = 'skus'
        nextTick(() => {
          skuTableRef.value?.toggleRowExpansion(sku, true)
          document.querySelector('.product-dialog .sku-error-row')?.scrollIntoView({ block: 'center' })
        })
        throw new Error(prefix + message)
      }
      const entries = sku.attributes.map(attribute => [attribute.name.trim(), attribute.value.trim()] as const)
      if (entries.some(([name, value]) => !name || !value)) invalid('请填写完整的属性名和属性值，或移除空属性')
      if (new Set(entries.map(([name]) => name)).size !== entries.length) invalid('属性名不能重复')
      entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      const specifications = Object.fromEntries(entries)
      const combination = JSON.stringify(specifications)
      if (combinations.has(combination)) invalid('规格组合重复，请修改属性值')
      combinations.add(combination)
      const code = sku.skuCode.trim()
      if (code && codes.has(code)) invalid('规格编码重复')
      if (code) codes.add(code)
      if (!Number.isFinite(sku.priceYuan) || sku.priceYuan < 0.01) invalid('售价至少为 0.01 元')
      if (!Number.isSafeInteger(sku.totalStock) || sku.totalStock < sku.reservedStock + sku.soldStock) invalid('总库存不能低于预留与已售之和')
      return {
        id: sku.id,
        skuCode: sku.skuCode.trim() || undefined,
        specifications,
        priceFen: Math.round(sku.priceYuan * 100),
        totalStock: sku.totalStock,
        enabled: sku.enabled,
      }
    })
    const data = {
      categoryId: productForm.categoryId,
      name: productForm.name,
      description: productForm.description,
      images: productForm.images,
      skus,
      sortOrder: productForm.sortOrder,
    }

    if (editingProductId.value) {
      await shopApi.updateProduct(editingProductId.value, data)
      ElMessage.success('商品已更新')
    } else {
      await shopApi.createProduct(data)
      ElMessage.success('商品已创建')
    }
    productDialogVisible.value = false
    page.value = 1
    await loadProducts()
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function editProduct(row: ShopProduct) {
  openProductDialog(row)
}

async function publishProduct(row: ShopProduct) {
  try {
    await shopApi.publishProduct(row.id)
    ElMessage.success('商品已上架')
    await loadProducts()
  } catch (error: any) {
    ElMessage.error(error?.message || '上架失败')
  }
}

async function unpublishProduct(row: ShopProduct) {
  try {
    await shopApi.unpublishProduct(row.id)
    ElMessage.success('商品已下架')
    await loadProducts()
  } catch (error: any) {
    ElMessage.error(error?.message || '下架失败')
  }
}

async function deleteProduct(row: ShopProduct) {
  try {
    await ElMessageBox.confirm(
      `确定删除商品「${row.name}」？删除后无法恢复。`,
      '提示',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    await shopApi.deleteProduct(row.id)
    ElMessage.success('商品已删除')
    await loadProducts()
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除失败')
  }
}

onMounted(async () => {
  await loadCategories()
  await loadProducts()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

:global(.danger-menu-item:not(.is-disabled)) { color: #d92d20; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.list-count { margin-right: auto; color: $color-text-secondary; font-size: 13px; }
.sku-preview { padding: 16px 28px; background: $color-surface-soft; }
.stock-available { color: $color-text; font-size: 14px; }
.stock-available strong { color: $color-primary; font-size: 18px; font-variant-numeric: tabular-nums; }
.stock-secondary { color: $color-text-secondary; }
.editor-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-right: 30px; }
.editor-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.editor-header p { margin: 5px 0 0; font-size: 12px; color: $color-text-secondary; }
.editor-tabs { position: sticky; top: 0; z-index: 3; background: white; }
.editor-tabs :deep(.el-tabs__header) { margin-bottom: 24px; }
.editor-info { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 32px; }
.editor-info__media { border-left: 1px solid $color-border; padding-left: 24px; }
.editor-section-title, .editor-skus__toolbar h3 { margin: 0 0 18px; font-size: 14px; font-weight: 600; }
.form-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
.field-hint, .editor-note { font-size: 12px; color: $color-text-secondary; }
.field-hint { margin-left: 12px; }
.editor-skus__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.editor-skus__toolbar h3 { margin-bottom: 5px; }
.editor-skus__toolbar p, .sku-stock-hint { margin: 0; font-size: 12px; color: $color-text-secondary; }
.sku-edit-table { border: 1px solid $color-border; border-radius: 8px; }
.sku-edit-table :deep(.el-table__cell) { padding: 14px 0; vertical-align: top; }
.sku-edit-table :deep(.el-input-number) { width: 100%; }
.sku-edit-table :deep(.el-table__header th) { background: $color-surface-soft; }
.sku-edit-table :deep(.sku-error-row) { --el-table-tr-bg-color: #fff5f4; }
.sku-name-button { display: flex; justify-content: space-between; width: 100%; padding: 0; margin: 0 0 8px; border: 0; background: transparent; font: inherit; color: $color-text; font-weight: 600; text-align: left; cursor: pointer; }
.sku-name-button span { color: $color-primary; font-weight: 400; font-size: 11px; }
.sku-stock-hint { margin-top: 8px; }
.sku-available { color: $color-primary; font-variant-numeric: tabular-nums; }
.sku-inline-error { margin: 6px 0 0; color: $color-danger; font-size: 12px; line-height: 1.5; }
.sku-property-editor { padding: 18px 36px; background: $color-surface-soft; }
.sku-property-editor__title { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
.sku-property-editor__title span { margin-left: 12px; font-size: 12px; font-weight: 400; color: $color-text-secondary; }
.sku-attribute { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; max-width: 600px; }
.sku-attribute :deep(.el-input) { flex: 1; min-width: 0; }
.editor-note { line-height: 1.7; margin: 14px 0 0; }
.dialog-footer-hint { margin-right: auto; font-size: 12px; color: $color-text-secondary; }
.image-cover { position: absolute; top: 6px; left: 6px; color: white; background: $color-primary; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
:global(.product-dialog) { display: flex; flex-direction: column; height: min(740px, 90vh); padding: 0; overflow: hidden; border-radius: 12px; }
:global(.product-dialog .el-dialog__header) { margin: 0; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
:global(.product-dialog .el-dialog__body) { flex: 1; overflow-y: auto; min-height: 0; padding: 0 24px 24px; background: white; }
:global(.product-dialog .el-dialog__footer) { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e5e7eb; background: #f8fafc; }
@media (max-width: 767px) { .editor-info, .form-grid { grid-template-columns: 1fr; } .editor-info { gap: 16px; } .editor-info__media { border-left: 0; padding-left: 0; } .dialog-footer-hint { display: none; } .sku-property-editor { padding: 12px; } }

.shop-product-mgr { display: flex; flex-direction: column; gap: $space-16; }

.product-item {
  display: flex;
  align-items: center;
  gap: $space-12;

  .product-image {
    width: 56px;
    height: 56px;
    border-radius: $radius-md;
    flex-shrink: 0;
    background: $color-surface-soft;
    object-fit: cover;
  }

  .product-image-placeholder {
    width: 56px;
    height: 56px;
    border-radius: $radius-md;
    flex-shrink: 0;
    background: $color-surface-soft;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }

  .product-info {
    flex: 1;
    min-width: 0;
  }

  .product-name {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $color-text;
    line-height: 1.4;
  }

  .product-desc {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    margin-top: $space-4;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  font-size: $font-size-xs;

  .stock-reserved {
    color: $color-warning;
  }

  .stock-sold {
    color: $color-success;
  }
}

:deep(.el-dialog) {
  .el-dialog__header {
    background: $color-surface-soft;
    border-bottom: 1px solid $color-border;
  }

  .el-dialog__body {
    padding: $space-24;
  }

  .el-form-item {
    margin-bottom: $space-20;
  }
}

.images-upload {
  display: flex;
  flex-direction: column;
  gap: $space-12;

  .images-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-12;
  }

  .image-item {
    position: relative;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    overflow: hidden;
    background: $color-surface-soft;

    .image-preview {
      width: 100%;
      height: 100px;
      display: block;
    }

    .image-actions {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.55);
      top: auto;
      padding: 4px;
      gap: 4px;
      flex-wrap: wrap;
      opacity: 1;
      transition: opacity 0.3s;

      :deep(.el-button) {
        font-size: $font-size-xs;
      }
    }

    &:hover .image-actions {
      opacity: 1;
    }
  }

  .upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-8;
    padding: $space-16;
    border: 2px dashed $color-border;
    border-radius: $radius-md;
    background: $color-surface-soft;
    text-align: center;

    .upload-tip {
      font-size: $font-size-xs;
      color: $color-text-tertiary;
    }
  }
}

/* ── 平板端 ── */
@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;

    &__left,
    &__right {
      width: 100%;
    }

    &__search {
      min-width: auto;
    }
  }

  .product-item {
    .product-image {
      width: 48px;
      height: 48px;
    }

    .product-image-placeholder {
      width: 48px;
      height: 48px;
    }

    .product-name {
      font-size: $font-size-xs;
    }

    .product-desc {
      font-size: 11px;
    }
  }
}

/* ── 移动端 ── */
@media (max-width: 767px) {
  .shop-product-mgr {
    gap: $space-12;
  }

  .toolbar {
    padding: $space-12;

    &__left,
    &__right {
      width: 100%;
    }

    :deep(.el-input),
    :deep(.el-select),
    :deep(.el-button) {
      width: 100%;
    }
  }

  .product-item {
    .product-image,
    .product-image-placeholder {
      width: 40px;
      height: 40px;
    }
  }

  .images-upload {
    .images-list {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    }

    .image-item {
      .image-preview {
        height: 80px;
      }
    }
  }

  .pagination-wrapper {
    padding: $space-12;
    justify-content: center;
  }
}
</style>
