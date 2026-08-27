<template>
  <div class="tag-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">标签字典</div>
            <div class="card-header__desc">维护评估、产品和推荐规则共用标签</div>
          </div>
          <el-button type="primary" @click="openDialog()">新增标签</el-button>
        </div>
      </template>

      <el-alert
        class="page-alert"
        type="info"
        show-icon
        :closable="false"
        title="标签是评估、产品和推荐规则的统一口径。产品标签、评估选项标签、规则命中标签应优先从这里选择。"
      />

      <div class="page-toolbar">
        <el-input v-model="keyword" placeholder="搜索编码/名称/说明" clearable style="width: 240px" @keyup.enter="loadTags" />
        <el-select v-model="moduleId" placeholder="全部模块" clearable style="width: 160px" @change="loadTags">
          <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="group" placeholder="全部分组" clearable style="width: 160px" @change="loadTags">
          <el-option v-for="item in tagGroups" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="loadTags">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button type="primary" @click="loadTags">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="tags" v-loading="loading" stripe>
        <el-table-column prop="code" label="编码" min-width="160" />
        <el-table-column prop="name" label="名称" width="130" />
        <el-table-column prop="group" label="分组" width="130" />
        <el-table-column label="适用模块" width="130">
          <template #default="{ row }">{{ row.module?.name || '通用' }}</template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="220" />
        <el-table-column prop="sortOrder" label="排序" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openDialog(row)">编辑</el-button>
              <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" @click="toggleStatus(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新增标签'" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="编码">
          <el-input v-model="form.code" maxlength="60" placeholder="如 sleep_improve" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" maxlength="40" placeholder="如 睡眠改善" />
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="form.group" allow-create filterable default-first-option clearable placeholder="选择或输入分组" style="width: 100%">
            <el-option v-for="item in tagGroups" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用模块">
          <el-select v-model="form.moduleId" clearable placeholder="不选表示通用标签" style="width: 100%">
            <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="200" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button :label="1">启用</el-radio-button>
            <el-radio-button :label="0">停用</el-radio-button>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { productApi, type ProductModule, type TagDictionary, type TagDictionaryPayload } from '@/api/product'

const modules = ref<ProductModule[]>([])
const tags = ref<TagDictionary[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const keyword = ref('')
const moduleId = ref<number | ''>('')
const group = ref('')
const status = ref<number | ''>('')

const defaultForm = (): TagDictionaryPayload => ({
  code: '',
  name: '',
  group: '',
  moduleId: undefined,
  description: '',
  status: 1,
  sortOrder: 0,
})
const form = reactive<TagDictionaryPayload>(defaultForm())
const tagGroups = computed(() => [...new Set(tags.value.map((item) => item.group).filter(Boolean))])

async function loadModules() {
  modules.value = await productApi.listModules()
}

async function loadTags() {
  loading.value = true
  try {
    tags.value = await productApi.listTags({
      keyword: keyword.value || undefined,
      moduleId: moduleId.value,
      group: group.value || undefined,
      status: status.value,
    })
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  keyword.value = ''
  moduleId.value = ''
  group.value = ''
  status.value = ''
  loadTags()
}

function openDialog(row?: TagDictionary) {
  editingId.value = row?.id ?? null
  Object.assign(form, row
    ? {
        code: row.code,
        name: row.name,
        group: row.group,
        moduleId: row.moduleId ?? undefined,
        description: row.description,
        status: row.status,
        sortOrder: row.sortOrder,
      }
    : defaultForm())
  dialogVisible.value = true
}

async function submit() {
  if (!form.code.trim() || !form.name.trim()) {
    ElMessage.error('请填写标签编码和名称')
    return
  }
  submitting.value = true
  try {
    const data = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      group: form.group?.trim(),
      description: form.description?.trim(),
    }
    if (editingId.value) {
      await productApi.updateTag(editingId.value, data)
      ElMessage.success('标签已更新')
    } else {
      await productApi.createTag(data)
      ElMessage.success('标签已创建')
    }
    dialogVisible.value = false
    await loadTags()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row: TagDictionary) {
  await productApi.updateTag(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '标签已停用' : '标签已启用')
  await loadTags()
}

onMounted(async () => {
  await loadModules()
  await loadTags()
})
</script>

<style scoped>
.page-alert {
  margin-bottom: 16px;
}
</style>
