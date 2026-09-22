<template>
  <div class="shop-product-mgr">
    <!-- 工具栏 -->
    <div class="toolbar" role="region" aria-label="搜索和操作工具栏">
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

        <el-button plain icon="Refresh" @click="resetSearch">重置</el-button>
        <el-button type="primary" @click="openProductDialog()">添加商品</el-button>
      </div>
    </div>

    <!-- 商品表格 -->
    <div class="table-wrapper">
      <el-table
        :data="products"
        v-loading="loading"
        stripe
        style="width: 100%"
        role="table"
        aria-label="商品列表表格"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="商品" min-width="220">
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
                <div class="product-desc">{{ row.description || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ getCategoryName(row.categoryId) }}</template>
        </el-table-column>
        <el-table-column label="价格" width="100">
          <template #default="{ row }">¥{{ (row.priceFen / 100).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="库存" width="100">
          <template #default="{ row }">
            <div class="stock-info">
              <span>总: {{ row.totalStock }}</span>
              <span class="stock-reserved">预留: {{ row.reservedStock }}</span>
              <span class="stock-sold">已售: {{ row.soldStock }}</span>
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
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" link size="small" @click="editProduct(row)">编辑</el-button>
              <el-divider direction="vertical" />
              <el-button
                v-if="row.status !== 1"
                type="success"
                link
                size="small"
                @click="publishProduct(row)"
              >
                上架
              </el-button>
              <el-button
                v-else
                type="warning"
                link
                size="small"
                @click="unpublishProduct(row)"
              >
                下架
              </el-button>
              <el-divider direction="vertical" />
              <el-button type="danger" link size="small" @click="deleteProduct(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && products.length === 0" description="暂无商品数据" />
    </div>

    <!-- 分页 -->
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

    <!-- 新增/编辑商品对话框 -->
    <el-dialog
      v-model="productDialogVisible"
      :title="editingProductId ? '编辑商品' : '添加商品'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="productRules"
        label-width="100px"
      >
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

        <el-form-item label="商品名" prop="name">
          <el-input
            v-model="productForm.name"
            placeholder="请输入商品名"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="productForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入商品描述（可选）"
            maxlength="500"
          />
        </el-form-item>

        <el-form-item label="价格（元）" prop="priceFen">
          <el-input-number
            v-model="productForm.priceYuan"
            :min="0.01"
            :step="0.01"
            :precision="2"
            placeholder="请输入价格"
          />
        </el-form-item>

        <el-form-item label="库存数量" prop="totalStock">
          <el-input-number
            v-model="productForm.totalStock"
            :min="0"
            :step="1"
            placeholder="请输入库存数量"
          />
        </el-form-item>

        <el-form-item label="商品图片" prop="images">
          <div class="images-upload">
            <div class="images-list">
              <div
                v-for="(img, idx) in productForm.images"
                :key="idx"
                class="image-item"
              >
                <el-image :src="img" class="image-preview" fit="cover" />
                <div class="image-actions">
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
                支持 jpg/png/webp，最多 5 张，每张不超过 5MB
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number
            v-model="productForm.sortOrder"
            :min="0"
            placeholder="排序值，数值越小越靠前"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { shopApi, type ShopProduct, type ShopCategory } from '@/api/shop'

const authStore = useAuthStore()
const productFormRef = ref<FormInstance>()

const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const selectedCategoryId = ref<number | ''>('')

const categories = ref<ShopCategory[]>([])
const products = ref<ShopProduct[]>([])

const productDialogVisible = ref(false)
const editingProductId = ref<number | null>(null)

const defaultProductForm = () => ({
  categoryId: categories.value[0]?.id || 0,
  name: '',
  description: '',
  priceYuan: 0,
  priceFen: 0,
  totalStock: 0,
  images: [] as string[],
  sortOrder: 0,
})

const productForm = reactive(defaultProductForm())

const productRules = {
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  name: [{ required: true, message: '请输入商品名', trigger: 'blur' }],
  priceFen: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    {
      validator: (rule: any, value: number) => {
        if (value < 0) {
          return Promise.reject(new Error('价格不能为负数'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
  totalStock: [
    { required: true, message: '请输入库存数量', trigger: 'blur' },
    {
      validator: (rule: any, value: number) => {
        if (!Number.isInteger(value)) {
          return Promise.reject(new Error('库存必须为整数'))
        }
        if (value < 0) {
          return Promise.reject(new Error('库存不能为负数'))
        }
        return Promise.resolve()
      },
      trigger: 'blur',
    },
  ],
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
  return categories.value.find(cat => cat.id === categoryId)?.name || '-'
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
  try {
    const result = await shopApi.listProducts({
      page: page.value,
      pageSize: pageSize.value,
      categoryId: selectedCategoryId.value || undefined,
      keyword: keyword.value || undefined,
    })
    products.value = result.list
    total.value = result.total
  } catch (error) {
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
  handleSearch()
}

function openProductDialog(row?: ShopProduct) {
  editingProductId.value = row?.id || null
  if (row) {
    Object.assign(productForm, {
      categoryId: row.categoryId,
      name: row.name,
      description: row.description || '',
      priceYuan: row.priceFen / 100,
      priceFen: row.priceFen,
      totalStock: row.totalStock,
      images: [...row.images],
      sortOrder: row.sortOrder,
    })
  } else {
    Object.assign(productForm, defaultProductForm())
  }
  productDialogVisible.value = true
  productFormRef.value?.clearValidate()
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

function removeImage(index: number) {
  productForm.images.splice(index, 1)
}

async function submitProduct() {
  await productFormRef.value?.validate()

  // Validate images
  if (!productForm.images || productForm.images.length === 0) {
    ElMessage.error('请至少上传一张商品图片')
    return
  }

  submitting.value = true
  try {
    const data = {
      categoryId: productForm.categoryId,
      name: productForm.name,
      description: productForm.description,
      images: productForm.images,
      priceFen: Math.round(productForm.priceYuan * 100),
      totalStock: productForm.totalStock,
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
  } catch (error) {
    // User cancel
  }
}

onMounted(async () => {
  await loadCategories()
  await loadProducts()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.shop-product-mgr {
  display: flex;
  flex-direction: column;
  gap: $space-16;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-16;
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-16;
  flex-wrap: wrap;

  &__left {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex: 1;
    min-width: 300px;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex: 1;
    min-width: 300px;

    :deep(.el-input) {
      .el-input__wrapper {
        background: $color-surface-soft;

        &:hover {
          border-color: $color-primary;
        }
      }
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex-wrap: wrap;

    :deep(.el-select) {
      .el-input__wrapper {
        background: $color-surface-soft;

        &:hover {
          border-color: $color-primary;
        }
      }
    }
  }
}

.table-wrapper {
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;

  :deep(.el-table) {
    --el-table-border-color: #{$color-border};
    --el-table-header-bg-color: #{$color-surface-soft};
    --el-table-header-text-color: #{$color-text};
    --el-table-row-hover-bg-color: #{$color-bg-hover};

    thead {
      background: $color-surface-soft;

      th {
        background: $color-surface-soft;
        font-weight: 600;
        color: $color-text;
        border-bottom: 1px solid $color-border;
      }
    }

    tbody tr {
      &:hover > td {
        background: $color-bg-hover !important;
      }
    }
  }
}

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

.table-actions {
  display: flex;
  align-items: center;
  gap: $space-8;
  justify-content: center;

  :deep(.el-button) {
    padding: 0;
    height: auto;
    font-size: $font-size-sm;

    &.is-link {
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  :deep(.el-divider--vertical) {
    margin: 0 $space-6;
    background-color: $color-border;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: $space-16;
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;

  :deep(.el-pagination) {
    --el-pagination-font-size: #{$font-size-sm};
    --el-pagination-bg-color: transparent;
    --el-pagination-button-bg-color: #{$color-surface-soft};
    --el-pagination-button-disabled-bg-color: #{$color-bg};
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
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
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
      background: rgba(0, 0, 0, 0.6);
      opacity: 0;
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
