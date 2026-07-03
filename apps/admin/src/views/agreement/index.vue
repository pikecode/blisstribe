<template>
  <div class="agreement-mgr">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="card-header__left">
            <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 140px">
              <el-option label="用户协议" value="user" />
              <el-option label="隐私政策" value="privacy" />
            </el-select>
          </div>
          <el-button type="primary" @click="openCreate">发布新版本</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 'user' ? 'primary' : 'warning'" size="small">
              {{ row.type === 'user' ? '用户协议' : '隐私政策' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="90" />
        <el-table-column prop="title" label="标题" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isCurrent" type="warning" size="small">当前</el-tag>
            <el-tag v-else type="info" size="small">历史</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="生效时间" width="180">
          <template #default="{ row }">{{ formatDate(row.effectiveAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openView(row)">查看</el-button>
            <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="success" :disabled="row.isCurrent" @click="setCurrent(row)">
              设为当前
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page" v-model:page-size="pageSize"
        :total="total" layout="total, prev, pager, next"
        class="page-pager"
        @current-change="loadList" @size-change="loadList"
      />
    </el-card>

    <!-- 新建弹窗 -->
    <el-dialog v-model="createVisible" title="发布新版本" width="680px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="类型">
          <el-select v-model="createForm.type">
            <el-option label="用户协议" value="user" />
            <el-option label="隐私政策" value="privacy" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号">
          <el-input v-model="createForm.version" placeholder="如 2.0" style="width: 200px" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="createForm.title" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="createForm.content" type="textarea" :rows="10" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">发布</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑协议内容" width="680px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="editForm.content" type="textarea" :rows="12" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看弹窗 -->
    <el-dialog v-model="viewVisible" :title="viewTitle" width="700px">
      <div class="content-preview">{{ viewContent }}</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { agreementApi } from '@/api'

interface AgreementItem {
  id: number; type: string; version: string; title: string
  isCurrent: boolean; effectiveAt: string; content?: string
}

const list = ref<AgreementItem[]>([])
const loading = ref(false)
const saving = ref(false)
const filterType = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const createVisible = ref(false)
const editVisible = ref(false)
const viewVisible = ref(false)
const viewTitle = ref('')
const viewContent = ref('')
const editingId = ref(0)
const createForm = reactive({ type: 'user', version: '', title: '', content: '' })
const editForm = reactive({ title: '', content: '' })

const loadList = async () => {
  loading.value = true
  try {
    const res = await agreementApi.list({ page: page.value, pageSize: pageSize.value, type: filterType.value || undefined })
    list.value = res.list
    total.value = res.total
  } finally { loading.value = false }
}

watch(filterType, () => { page.value = 1; loadList() })

const openCreate = () => {
  Object.assign(createForm, { type: 'user', version: '', title: '', content: '' })
  createVisible.value = true
}

const handleCreate = async () => {
  saving.value = true
  try {
    await agreementApi.create({ ...createForm })
    ElMessage.success('发布成功')
    createVisible.value = false
    loadList()
  } finally { saving.value = false }
}

const openEdit = (row: AgreementItem) => {
  editingId.value = row.id
  editForm.title = row.title
  editForm.content = row.content || ''
  editVisible.value = true
}

const handleEdit = async () => {
  saving.value = true
  try {
    await agreementApi.update(editingId.value, { title: editForm.title, content: editForm.content })
    ElMessage.success('保存成功')
    editVisible.value = false
    loadList()
  } finally { saving.value = false }
}

const openView = (row: AgreementItem) => {
  viewTitle.value = `${row.title}（v${row.version}）`
  viewContent.value = row.content || '暂无内容'
  viewVisible.value = true
}

const setCurrent = async (row: AgreementItem) => {
  await agreementApi.setCurrent(String(row.id))
  ElMessage.success('已设为当前版本')
  loadList()
}

const formatDate = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false })

onMounted(loadList)
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.content-preview {
  white-space: pre-wrap; font-size: 14px; line-height: 1.8;
  max-height: 500px; overflow-y: auto; color: #333;
  background: #fafafa; padding: 12px; border-radius: 4px;
}
</style>
