<template>
  <div class="banner-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Banner管理</span>
          <el-button type="primary" @click="openDialog()">新增Banner</el-button>
        </div>
      </template>

      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" width="150" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="预览" width="200">
          <template #default="{ row }">
            <div
              v-if="row.gradient"
              :style="{ background: row.gradient, height: '60px', borderRadius: '4px' }"
              class="banner-preview"
            >
              <span style="color: white; font-size: 12px">{{ row.title }}</span>
            </div>
            <el-image
              v-else-if="row.imageUrl"
              :src="row.imageUrl"
              style="width: 180px; height: 60px"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上线' : '下线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button
              size="small"
              :type="row.status === 1 ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '下线' : '上线' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: center"
        @current-change="fetchData"
        @size-change="fetchData"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑Banner' : '新增Banner'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="渐变色">
          <div class="gradient-picker">
            <div
              v-for="(g, i) in gradientPresets"
              :key="i"
              :class="['gradient-option', { selected: form.gradient === g.value }]"
              :style="{ background: g.value }"
              @click="selectGradient(g.value)"
            >
              <span v-if="form.gradient === g.value" class="check-icon">✓</span>
            </div>
          </div>
          <el-button size="small" text @click="clearGradient" style="margin-top: 8px">清除渐变色</el-button>
        </el-form-item>
        <el-form-item label="Banner图片">
          <el-upload
            :action="uploadAction"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :before-upload="beforeUpload"
            accept="image/jpeg,image/png,image/webp"
          >
            <el-button size="small" type="primary">点击上传</el-button>
          </el-upload>
          <el-image v-if="form.imageUrl" :src="form.imageUrl" style="width: 200px; height: 80px; margin-top: 8px" fit="cover" />
          <el-button v-if="form.imageUrl" size="small" text @click="clearImage" style="margin-top: 8px">清除图片</el-button>
          <div style="color: #909399; font-size: 12px; margin-top: 4px">图片和渐变色二选一，图片优先显示</div>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.linkUrl" placeholder="点击跳转地址（可留空）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px">数字越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type UploadRawFile } from 'element-plus'
import { bannerApi, type Banner } from '@/api/banner'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const uploadAction = `${import.meta.env.VITE_API_BASE_URL}/upload/banner`
const uploadHeaders = computed(() => ({ Authorization: authStore.token }))

const gradientPresets = [
  { label: '紫蓝', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: '粉红', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { label: '天蓝', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { label: '橙金', value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
  { label: '绿翡', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { label: '深夜', value: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' },
  { label: '珊瑚', value: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)' },
  { label: '暮光', value: 'linear-gradient(135deg, #c471ed 0%, #12c2e9 100%)' },
]

const tableData = ref<Banner[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const defaultForm = () => ({ title: '', description: '', gradient: '', imageUrl: '', linkUrl: '', sort: 0 })
const form = ref(defaultForm())

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
}

function selectGradient(value: string) {
  form.value.gradient = value
}

function clearGradient() {
  form.value.gradient = ''
}

function clearImage() {
  form.value.imageUrl = ''
}

function beforeUpload(file: UploadRawFile) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    ElMessage.error('仅支持 jpg/png/webp 格式')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片不能超过 5MB')
    return false
  }
  return true
}

function handleUploadSuccess(res: { code: number; data: { url: string } }) {
  if (res.code === 200) {
    form.value.imageUrl = res.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error('上传失败')
  }
}

function handleUploadError() {
  ElMessage.error('上传失败，请重试')
}

async function fetchData() {
  const res = await bannerApi.list(page.value, pageSize.value)
  tableData.value = res.list
  total.value = res.total
}

function openDialog(row?: Banner) {
  editingId.value = row?.id ?? null
  form.value = row
    ? { title: row.title, description: row.description, gradient: row.gradient, imageUrl: row.imageUrl, linkUrl: row.linkUrl, sort: row.sort }
    : defaultForm()
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editingId.value) {
      await bannerApi.update(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await bannerApi.create(form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row: Banner) {
  await bannerApi.update(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '已下线' : '已上线')
  fetchData()
}

async function handleDelete(row: Banner) {
  await ElMessageBox.confirm(`确认删除"${row.title}"？`, '提示', { type: 'warning' })
  await bannerApi.remove(row.id)
  ElMessage.success('删除成功')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.banner-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}
.gradient-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.gradient-option {
  width: 52px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}
.gradient-option:hover {
  border-color: #409eff;
}
.gradient-option.selected {
  border-color: #409eff;
}
.check-icon {
  color: white;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}
</style>
