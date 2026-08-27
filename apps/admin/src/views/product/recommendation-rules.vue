<template>
  <div class="rule-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">推荐规则</div>
            <div class="card-header__desc">配置评估标签命中后的产品加权和推荐理由</div>
          </div>
          <el-button type="primary" @click="openDialog()">新增规则</el-button>
        </div>
      </template>

      <el-alert
        class="page-alert"
        type="info"
        show-icon
        :closable="false"
        title="规则用于增强标签匹配：当用户评估结果包含全部命中标签时，指定产品获得额外加分，并优先展示规则推荐理由。"
      />

      <div class="page-toolbar">
        <el-select v-model="filterModuleId" placeholder="全部模块" clearable style="width: 180px" @change="loadRules">
          <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 140px" @change="loadRules">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button @click="resetFilter">重置</el-button>
      </div>

      <el-table :data="rules" v-loading="loading" stripe>
        <el-table-column label="规则" min-width="200">
          <template #default="{ row }">
            <div class="rule-title">{{ row.name }}</div>
            <div class="rule-subtitle">{{ row.reason || '未配置推荐理由' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="模块" width="110">
          <template #default="{ row }">{{ row.module?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="推荐产品" min-width="220">
          <template #default="{ row }">{{ row.product?.title || '-' }}</template>
        </el-table-column>
        <el-table-column label="命中标签" min-width="220">
          <template #default="{ row }">
            <el-tag v-for="tag in row.conditionTags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scoreBoost" label="加分" width="90" />
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑推荐规则' : '新增推荐规则'" width="680px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="所属模块">
          <el-select v-model="form.moduleId" placeholder="请选择模块" style="width: 100%" @change="onModuleChange">
            <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐产品">
          <el-select v-model="form.productId" filterable placeholder="请选择产品" style="width: 100%">
            <el-option v-for="item in moduleProducts" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="规则名称">
          <el-input v-model="form.name" maxlength="80" placeholder="例如：睡眠重点改善推荐" />
        </el-form-item>
        <el-form-item label="命中标签">
          <el-select
            v-model="form.conditionTagIds"
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
        <el-form-item label="推荐理由">
          <el-input v-model="form.reason" type="textarea" :rows="3" maxlength="160" placeholder="展示给用户看的推荐理由" />
        </el-form-item>
        <el-form-item label="加分/排序">
          <el-input-number v-model="form.scoreBoost" :min="0" />
          <el-input-number v-model="form.sortOrder" :min="0" class="sort-input" />
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
import {
  productApi,
  type Product,
  type ProductModule,
  type RecommendationRule,
  type RecommendationRulePayload,
  type TagDictionary,
} from '@/api/product'
import { buildTagOptionGroups, mapTagNamesToIds, tagOptionLabel } from '@/utils/tags'

const modules = ref<ProductModule[]>([])
const products = ref<Product[]>([])
const tags = ref<TagDictionary[]>([])
const rules = ref<RecommendationRule[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const filterModuleId = ref<number | ''>('')
const filterStatus = ref<number | ''>('')

const defaultForm = (): RecommendationRulePayload => ({
  moduleId: modules.value[0]?.id ?? 0,
  productId: 0,
  name: '',
  conditionTags: [],
  conditionTagIds: [],
  scoreBoost: 50,
  reason: '',
  status: 1,
  sortOrder: 0,
})
const form = reactive<RecommendationRulePayload>(defaultForm())

const moduleProducts = computed(() => products.value.filter((item) => item.module.id === form.moduleId))
const selectableTags = computed(() => tags.value.filter((item) => (
  item.status === 1 && (!item.moduleId || item.moduleId === form.moduleId)
)))
const groupedSelectableTags = computed(() => buildTagOptionGroups(selectableTags.value))

function cleanTags(values: string[] = []) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].slice(0, 20)
}

async function loadBaseData() {
  const [moduleRows, productRows, tagRows] = await Promise.all([
    productApi.listModules(),
    productApi.listProducts({ page: 1, pageSize: 200 }),
    productApi.listTags({ status: 1 }),
  ])
  modules.value = moduleRows
  products.value = productRows.list
  tags.value = tagRows
}

async function loadRules() {
  loading.value = true
  try {
    rules.value = await productApi.listRecommendationRules({
      moduleId: filterModuleId.value,
      status: filterStatus.value,
    })
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterModuleId.value = ''
  filterStatus.value = ''
  loadRules()
}

function onModuleChange() {
  if (!moduleProducts.value.some((item) => item.id === form.productId)) {
    form.productId = moduleProducts.value[0]?.id ?? 0
  }
}

function openDialog(row?: RecommendationRule) {
  editingId.value = row?.id ?? null
  Object.assign(form, row
    ? {
        moduleId: row.moduleId,
        productId: row.productId,
        name: row.name,
        conditionTags: row.conditionTags,
        conditionTagIds: row.conditionTagIds?.length ? row.conditionTagIds : mapTagNamesToIds(row.conditionTags, tags.value),
        scoreBoost: row.scoreBoost,
        reason: row.reason,
        status: row.status,
        sortOrder: row.sortOrder,
      }
    : defaultForm())
  if (!row) onModuleChange()
  dialogVisible.value = true
}

async function submit() {
  const conditionTags = cleanTags(form.conditionTags ?? [])
  const conditionTagIds = form.conditionTagIds ?? []
  if (!form.moduleId || !form.productId || !form.name.trim()) {
    ElMessage.error('请选择模块、产品并填写规则名称')
    return
  }
  if (!conditionTags.length && !conditionTagIds.length) {
    ElMessage.error('请至少填写 1 个命中标签')
    return
  }
  submitting.value = true
  try {
    const data = { ...form, conditionTags, conditionTagIds }
    if (editingId.value) {
      await productApi.updateRecommendationRule(editingId.value, data)
      ElMessage.success('推荐规则已更新')
    } else {
      await productApi.createRecommendationRule(data)
      ElMessage.success('推荐规则已创建')
    }
    dialogVisible.value = false
    await loadRules()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row: RecommendationRule) {
  await productApi.updateRecommendationRule(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '规则已停用' : '规则已启用')
  await loadRules()
}

onMounted(async () => {
  await loadBaseData()
  await loadRules()
})
</script>

<style scoped>
.page-alert {
  margin-bottom: 16px;
}
.rule-title {
  font-weight: 600;
  color: #1f2937;
}
.rule-subtitle {
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
