<template>
  <div class="agreement-mgr">
    <el-card>
      <div class="agreement-mgr__toolbar">
        <el-select v-model="filterType" placeholder="协议类型" clearable style="width: 160px">
          <el-option label="用户协议" value="user" />
          <el-option label="隐私政策" value="privacy" />
        </el-select>
        <el-button type="primary" @click="openCreate">发布新版本</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="类型">
          <template #default="{ row }">{{ typeText(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column prop="title" label="标题" />
        <el-table-column label="当前版本" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isCurrent" type="success">当前</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="effectiveAt" label="生效时间">
          <template #default="{ row }">{{ formatDate(row.effectiveAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              :disabled="row.isCurrent"
              @click="setCurrent(row)"
            >
              设为当前
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="发布新版本" width="600px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option label="用户协议" value="user" />
            <el-option label="隐私政策" value="privacy" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号">
          <el-input v-model="form.version" placeholder="如 1.0" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="8" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { agreementApi } from '@/api'

interface AgreementItem {
  id: number
  type: string
  version: string
  title: string
  isCurrent: boolean
  effectiveAt: string
}

const list = ref<AgreementItem[]>([])
const loading = ref(false)
const filterType = ref<string>('')

const dialogVisible = ref(false)
const creating = ref(false)
const form = reactive({ type: 'user', version: '', title: '', content: '' })

const loadList = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await agreementApi.list({ type: filterType.value || undefined })
    list.value = data.list
  } finally {
    loading.value = false
  }
}

const openCreate = (): void => {
  Object.assign(form, { type: 'user', version: '', title: '', content: '' })
  dialogVisible.value = true
}

const handleCreate = async (): Promise<void> => {
  creating.value = true
  try {
    await agreementApi.create({ ...form })
    ElMessage.success('发布成功')
    dialogVisible.value = false
    loadList()
  } finally {
    creating.value = false
  }
}

const setCurrent = async (row: AgreementItem): Promise<void> => {
  await agreementApi.setCurrent(String(row.id))
  ElMessage.success('已设为当前版本')
  loadList()
}

const typeText = (t: string): string => (t === 'user' ? '用户协议' : '隐私政策')
const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

onMounted(loadList)
</script>

<style lang="scss" scoped>
.agreement-mgr {
  &__toolbar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }
}
</style>
