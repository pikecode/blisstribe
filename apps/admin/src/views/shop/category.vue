<template>
  <div class="shop-category-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">分类管理</div>
            <div class="card-header__desc">维护商城分类信息</div>
          </div>
          <el-button type="primary" @click="openDialog()">新增分类</el-button>
        </div>
      </template>

      <div class="page-toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索分类名/编码"
          clearable
          style="width: 240px"
          @keyup.enter="loadCategories"
        />
        <el-select
          v-model="status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="loadCategories"
        >
          <el-option label="启用" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
        <el-button type="primary" @click="loadCategories">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column prop="name" label="分类名" min-width="150" />
        <el-table-column prop="code" label="编码" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="sortOrder" label="排序" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openDialog(row)">编辑</el-button>
              <el-button
                size="small"
                :type="row.status === 1 ? 'warning' : 'success'"
                @click="toggleStatus(row)"
              >
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button size="small" type="danger" @click="deleteCategory(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑分类' : '新增分类'"
      width="560px"
      @close="resetForm"
    >
      <el-form :model="form" :rules="rules" label-width="90px" ref="formRef">
        <el-form-item label="分类名" prop="name">
          <el-input v-model="form.name" maxlength="60" placeholder="如 美容护肤" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input
            v-model="form.code"
            maxlength="60"
            placeholder="如 beauty_skincare，仅英文或数字"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="200"
            placeholder="分类描述（可选）"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio-button :label="1">启用</el-radio-button>
            <el-radio-button :label="0">禁用</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shopApi, type ShopCategory } from '@/api/shop'
import type { FormInstance } from 'element-plus'

const categories = ref<ShopCategory[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const keyword = ref('')
const status = ref<number | ''>('')

const formRef = ref<FormInstance>()

const defaultForm = () => ({
  name: '',
  code: '',
  description: '',
  sortOrder: 0,
  status: 1,
})

const form = reactive({
  name: '',
  code: '',
  description: '',
  sortOrder: 0,
  status: 1,
})

const rules = {
  name: [
    { required: true, message: '请输入分类名', trigger: 'blur' },
    { min: 1, max: 60, message: '分类名长度1-60个字符', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: '编码仅支持英文、数字和下划线',
      trigger: 'blur',
    },
  ],
  sortOrder: [{ type: 'number', message: '排序必须是数字', trigger: 'blur' }],
}

async function loadCategories() {
  loading.value = true
  try {
    categories.value = await shopApi.listCategories()
    if (keyword.value || status.value !== '') {
      categories.value = categories.value.filter((cat) => {
        const matchKeyword =
          !keyword.value ||
          cat.name.includes(keyword.value) ||
          cat.code.includes(keyword.value)
        const matchStatus = status.value === '' || cat.status === status.value
        return matchKeyword && matchStatus
      })
    }
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  keyword.value = ''
  status.value = ''
  loadCategories()
}

function openDialog(row?: ShopCategory) {
  editingId.value = row?.id ?? null
  if (row) {
    Object.assign(form, {
      name: row.name,
      code: row.code,
      description: row.description || '',
      sortOrder: row.sortOrder,
      status: row.status,
    })
  } else {
    Object.assign(form, defaultForm())
  }
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.clearValidate()
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate()

  submitting.value = true
  try {
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description?.trim(),
      sortOrder: form.sortOrder,
      status: form.status,
    }

    if (editingId.value) {
      await shopApi.updateCategory(editingId.value, payload)
      ElMessage.success('分类已更新')
    } else {
      await shopApi.createCategory(payload)
      ElMessage.success('分类已创建')
    }

    dialogVisible.value = false
    await loadCategories()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row: ShopCategory) {
  submitting.value = true
  try {
    await shopApi.updateCategory(row.id, {
      status: row.status === 1 ? 0 : 1,
    })
    ElMessage.success(
      row.status === 1 ? '分类已禁用' : '分类已启用'
    )
    await loadCategories()
  } finally {
    submitting.value = false
  }
}

async function deleteCategory(row: ShopCategory) {
  try {
    await ElMessageBox.confirm(
      `确定删除分类"${row.name}"吗？`,
      '删除分类',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    submitting.value = true
    await shopApi.deleteCategory(row.id)
    ElMessage.success('分类已删除')
    await loadCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.shop-category-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header__title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-header__desc {
  font-size: 14px;
  color: #909399;
}

.page-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
