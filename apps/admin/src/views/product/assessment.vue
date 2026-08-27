<template>
  <div class="assessment-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">评估管理</div>
            <div class="card-header__desc">维护模块评估题目、选项和标签映射</div>
          </div>
          <el-button type="primary" @click="openDialog()">新增模板</el-button>
        </div>
      </template>

      <el-alert
        class="page-alert"
        type="info"
        show-icon
        :closable="false"
        title="每个产品模块可维护启用中的评估模板，小程序会优先读取后台配置。题目目前支持单选，选项标签用于产品推荐和线索跟进。"
      />

      <el-table :data="templates" v-loading="loading" stripe>
        <el-table-column label="模块" width="130">
          <template #default="{ row }">{{ row.module?.name || moduleName(row.moduleId) }}</template>
        </el-table-column>
        <el-table-column label="模板" min-width="240">
          <template #default="{ row }">
            <div class="template-title">{{ row.title }}</div>
            <div class="template-subtitle">{{ row.subtitle || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="题目数" width="90">
          <template #default="{ row }">{{ row.questions.length }}</template>
        </el-table-column>
        <el-table-column label="版本" width="90">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑评估模板' : '新增评估模板'" width="860px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="所属模块">
          <el-select v-model="form.moduleId" placeholder="请选择模块" style="width: 100%">
            <el-option v-for="item in modules" :key="item.id" :label="`${item.name}（${item.code}）`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="80" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" maxlength="160" />
        </el-form-item>
        <el-form-item label="版本/排序">
          <el-input-number v-model="form.version" :min="1" />
          <el-input-number v-model="form.sortOrder" :min="0" class="sort-input" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button :label="1">启用</el-radio-button>
            <el-radio-button :label="0">停用</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="题目配置">
          <div class="question-editor">
            <div class="question-editor__toolbar">
              <span>共 {{ questionDrafts.length }} 道题，当前支持单选题。选项标签会参与产品推荐匹配。</span>
              <div>
                <el-button size="small" @click="addQuestion">新增题目</el-button>
                <el-button size="small" @click="fillSampleQuestions">填入示例</el-button>
              </div>
            </div>

            <el-empty v-if="!questionDrafts.length" description="暂无题目" />
            <div v-for="(question, questionIndex) in questionDrafts" :key="questionIndex" class="question-card">
              <div class="question-card__header">
                <strong>题目 {{ questionIndex + 1 }}</strong>
                <el-button size="small" text type="danger" @click="removeQuestion(questionIndex)">删除题目</el-button>
              </div>
              <div class="question-grid">
                <el-input v-model="question.key" placeholder="题目标识，如 focus" />
                <el-input v-model="question.title" placeholder="题目标题，如 你现在最关注什么？" />
              </div>

              <div class="option-list">
                <div class="option-list__header">
                  <span>选项</span>
                  <el-button size="small" @click="addOption(question)">新增选项</el-button>
                </div>
                <div v-for="(option, optionIndex) in question.options" :key="optionIndex" class="option-row">
                  <el-input v-model="option.label" placeholder="选项文案" />
                  <el-input v-model="option.value" placeholder="选项值" />
                  <div class="option-tag-config">
                    <el-select
                      v-model="option.tagIds"
                      multiple
                      filterable
                      placeholder="选择选项标签"
                      class="option-tags"
                      @change="syncOptionTagWeights(option)"
                    >
                      <el-option-group v-for="group in groupedSelectableTags" :key="group.label" :label="group.label">
                        <el-option v-for="tag in group.options" :key="tag.id" :label="tagOptionLabel(tag)" :value="tag.id" />
                      </el-option-group>
                    </el-select>
                    <div v-if="option.tagIds?.length" class="option-weights">
                      <div v-for="tagId in option.tagIds" :key="tagId" class="option-weight">
                        <span>{{ tagName(tagId) }}</span>
                        <el-input-number v-model="option.tagWeights![String(tagId)]" :min="1" :max="5" size="small" />
                      </div>
                    </div>
                  </div>
                  <el-button size="small" text type="danger" @click="removeOption(question, optionIndex)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
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
  type AssessmentOption,
  type AssessmentQuestion,
  type AssessmentTemplate,
  type AssessmentTemplatePayload,
  type ProductModule,
  type TagDictionary,
} from '@/api/product'
import { buildTagOptionGroups, mapTagNamesToIds, tagOptionLabel } from '@/utils/tags'

type QuestionDraft = Omit<AssessmentQuestion, 'id'> & { id?: number }

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const modules = ref<ProductModule[]>([])
const templates = ref<AssessmentTemplate[]>([])
const tags = ref<TagDictionary[]>([])
const questionDrafts = ref<AssessmentQuestion[]>([])

const defaultForm = (): AssessmentTemplatePayload => ({
  moduleId: modules.value[0]?.id ?? 0,
  title: '',
  subtitle: '',
  version: 1,
  status: 1,
  sortOrder: 0,
  questions: [],
})
const form = reactive<AssessmentTemplatePayload>(defaultForm())
const selectableTags = computed(() => tags.value.filter((item) => (
  item.status === 1 && (!item.moduleId || item.moduleId === form.moduleId)
)))
const groupedSelectableTags = computed(() => buildTagOptionGroups(selectableTags.value))

function moduleName(id: number) {
  return modules.value.find((item) => item.id === id)?.name || '-'
}

function formatTime(value: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

function emptyOption(index = 0): AssessmentOption {
  return {
    label: '',
    value: '',
    tags: [],
    tagIds: [],
    tagWeights: {},
    sortOrder: index,
  }
}

function emptyQuestion(index = questionDrafts.value.length): AssessmentQuestion {
  return {
    key: '',
    title: '',
    type: 'single',
    sortOrder: index,
    options: [emptyOption(0)],
  }
}

function cleanQuestion(question: QuestionDraft, index: number): AssessmentQuestion {
  return {
    key: String(question.key || '').trim(),
    title: String(question.title || '').trim(),
    type: 'single',
    sortOrder: Number(question.sortOrder ?? index),
    options: (question.options || []).map((option, optionIndex) => ({
      label: String(option.label || '').trim(),
      value: String(option.value || '').trim(),
      tags: [...new Set((option.tags || []).map((tag) => String(tag).trim()).filter(Boolean))],
      tagIds: [...new Set((option.tagIds?.length ? option.tagIds : mapTagNamesToIds(option.tags, tags.value)).map((tagId) => Number(tagId)).filter(Boolean))],
      tagWeights: cleanTagWeights(option),
      sortOrder: Number(option.sortOrder ?? optionIndex),
    })),
  }
}

function cleanTagWeights(option: AssessmentOption) {
  const result: Record<string, number> = {}
  for (const tagId of option.tagIds || []) {
    const key = String(tagId)
    const value = Number(option.tagWeights?.[key] ?? 1)
    result[key] = Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 5) : 1
  }
  return result
}

function syncOptionTagWeights(option: AssessmentOption) {
  option.tagWeights = cleanTagWeights(option)
}

function tagName(tagId: number) {
  const tag = tags.value.find((item) => item.id === tagId)
  return tag ? tag.name : `标签 ${tagId}`
}

function validateQuestions(questions: AssessmentQuestion[]) {
  if (!questions.length) throw new Error('题目配置至少需要 1 道题')
  for (const question of questions) {
    if (!question.key || !question.title) throw new Error('每道题都需要 key 和 title')
    if (!question.options.length) throw new Error(`题目「${question.title}」至少需要 1 个选项`)
    for (const option of question.options) {
      if (!option.label || !option.value) throw new Error(`题目「${question.title}」存在未填写 label/value 的选项`)
    }
  }
}

function addQuestion() {
  questionDrafts.value.push(emptyQuestion())
}

function removeQuestion(index: number) {
  questionDrafts.value.splice(index, 1)
}

function addOption(question: AssessmentQuestion) {
  question.options.push(emptyOption(question.options.length))
}

function removeOption(question: AssessmentQuestion, index: number) {
  question.options.splice(index, 1)
}

function fillSampleQuestions() {
  questionDrafts.value = [
    {
      key: 'focus',
      title: '你现在最关注什么？',
      type: 'single',
      sortOrder: 0,
      options: [
        { label: '先了解', value: 'browse', tags: ['先了解'], sortOrder: 0 },
        { label: '尽快改善', value: 'urgent', tags: ['尽快改善', '重点改善'], sortOrder: 1 },
        { label: '希望有人联系', value: 'contact', tags: ['愿意联系', '线上咨询'], sortOrder: 2 },
      ],
    },
  ]
}

async function loadData() {
  loading.value = true
  try {
    const [moduleRows, templateRows, tagRows] = await Promise.all([
      productApi.listModules(),
      productApi.listAssessmentTemplates(),
      productApi.listTags({ status: 1 }),
    ])
    modules.value = moduleRows
    templates.value = templateRows
    tags.value = tagRows
  } finally {
    loading.value = false
  }
}

function openDialog(row?: AssessmentTemplate) {
  editingId.value = row?.id ?? null
  Object.assign(form, row
    ? {
        moduleId: row.moduleId,
        title: row.title,
        subtitle: row.subtitle,
        version: row.version,
        status: row.status,
        sortOrder: row.sortOrder,
        questions: row.questions,
      }
    : defaultForm())
  questionDrafts.value = row ? row.questions.map(cleanQuestion) : []
  if (!row) fillSampleQuestions()
  dialogVisible.value = true
}

async function submit() {
  if (!form.moduleId || !form.title.trim()) {
    ElMessage.error('请选择模块并填写标题')
    return
  }
  const questions = questionDrafts.value.map(cleanQuestion)
  try {
    validateQuestions(questions)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '题目配置错误')
    return
  }
  submitting.value = true
  try {
    const data = { ...form, questions }
    if (editingId.value) {
      await productApi.updateAssessmentTemplate(editingId.value, data)
      ElMessage.success('评估模板已更新')
    } else {
      await productApi.createAssessmentTemplate(data)
      ElMessage.success('评估模板已创建')
    }
    dialogVisible.value = false
    await loadData()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row: AssessmentTemplate) {
  await productApi.updateAssessmentTemplate(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '模板已停用' : '模板已启用')
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-alert {
  margin-bottom: 16px;
}
.template-title {
  font-weight: 600;
  color: #1f2937;
}
.template-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
.sort-input {
  margin-left: 12px;
}
.question-editor {
  width: 100%;
}
.question-editor__toolbar,
.question-card__header,
.option-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.question-editor__toolbar {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}
.question-card {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
}
.question-card__header {
  margin-bottom: 12px;
}
.question-grid {
  display: grid;
  grid-template-columns: minmax(160px, 0.7fr) minmax(260px, 1.3fr);
  gap: 10px;
}
.option-list {
  margin-top: 12px;
}
.option-list__header {
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
}
.option-row {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(120px, 0.6fr) minmax(260px, 1.5fr) 52px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.option-tags {
  width: 100%;
}
.option-tag-config {
  min-width: 0;
}
.option-weights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.option-weight {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  font-size: 12px;
}
@media (max-width: 900px) {
  .question-grid,
  .option-row {
    grid-template-columns: 1fr;
  }
}
</style>
