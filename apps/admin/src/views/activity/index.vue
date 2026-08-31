<template>
  <div class="activity-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">活动管理</div>
            <div class="card-header__desc">维护活动内容、报名时间、名额和关联产品</div>
          </div>
          <el-button type="primary" @click="openDialog()">新增活动</el-button>
        </div>
      </template>

      <div class="page-toolbar">
        <el-input v-model="keyword" placeholder="搜索活动标题/说明" clearable style="width: 240px" @keyup.enter="handleSearch" />
        <el-select v-model="moduleId" placeholder="全部模块" clearable style="width: 150px">
          <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="activityType" placeholder="全部形式" clearable style="width: 140px">
          <el-option label="线上活动" value="online" />
          <el-option label="线下活动" value="offline" />
          <el-option label="线上+线下" value="mixed" />
        </el-select>
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 130px">
          <el-option label="草稿" :value="0" />
          <el-option label="已发布" :value="1" />
          <el-option label="已下线" :value="2" />
        </el-select>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="activities" v-loading="loading" stripe>
        <el-table-column label="活动" min-width="260">
          <template #default="{ row }">
            <div class="activity-info">
              <el-image v-if="row.coverUrl" :src="row.coverUrl" class="activity-cover" fit="cover" />
              <div>
                <div class="table-title">{{ row.title }}</div>
                <div class="table-subtitle">{{ row.subtitle || row.targetUserText || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="模块" width="110">
          <template #default="{ row }">{{ row.module?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="形式" width="110">
          <template #default="{ row }">
            <el-tag type="info">{{ activityTypeText(row.activityType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="活动时间" width="180">
          <template #default="{ row }">
            <div>{{ formatDate(row.startAt) }}</div>
            <div class="muted">至 {{ formatDate(row.endAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="报名截止" width="160">
          <template #default="{ row }">{{ formatDate(row.registrationEndAt) }}</template>
        </el-table-column>
        <el-table-column label="报名" width="120">
          <template #default="{ row }">
            <div>{{ row.registeredCount }} / {{ row.capacity || '不限' }}</div>
            <div class="muted">{{ registrationStatusText(row.registrationStatus) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags.slice(0, 3)" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
            <span v-if="row.tags.length > 3" class="muted">+{{ row.tags.length - 3 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ activityStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openDialog(row)">编辑</el-button>
              <el-button v-if="row.status !== 1" size="small" type="success" plain @click="publish(row)">发布</el-button>
              <el-button v-else size="small" type="warning" plain @click="unpublish(row)">下线</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="page-pager"
        @current-change="loadActivities"
        @size-change="loadActivities"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑活动' : '新增活动'" width="820px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-tabs v-model="activeFormTab">
          <el-tab-pane label="基础信息" name="basic">
            <el-form-item label="所属模块" prop="moduleId">
              <el-select v-model="form.moduleId" placeholder="请选择模块" style="width: 100%" @change="handleModuleChange">
                <el-option v-for="item in activeModules" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" maxlength="80" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="form.subtitle" maxlength="120" />
            </el-form-item>
            <el-form-item label="活动封面">
              <AdminCoverUpload v-model="form.coverUrl" tip="支持 jpg/png/webp，建议使用 16:9 横图，文件不超过 5MB" />
            </el-form-item>
            <el-form-item label="活动形式">
              <el-radio-group v-model="form.activityType">
                <el-radio-button label="online">线上活动</el-radio-button>
                <el-radio-button label="offline">线下活动</el-radio-button>
                <el-radio-button label="mixed">线上+线下</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="地点/入口">
              <el-input v-model="form.locationText" maxlength="200" :placeholder="locationPlaceholder" />
            </el-form-item>
            <el-form-item label="活动时间" prop="activityTimeRange">
              <el-date-picker
                v-model="form.activityTimeRange"
                type="datetimerange"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="报名时间" prop="registrationTimeRange">
              <el-date-picker
                v-model="form.registrationTimeRange"
                type="datetimerange"
                start-placeholder="开始时间"
                end-placeholder="截止时间"
                value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="名额/排序">
              <div class="inline-fields">
                <el-input-number v-model="form.capacity" :min="1" placeholder="名额" />
                <el-input-number v-model="form.priority" :min="0" placeholder="优先级" />
                <el-input-number v-model="form.sortOrder" :min="0" placeholder="排序" />
              </div>
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="内容与关联" name="content">
            <el-form-item label="适合人群">
              <el-input v-model="form.targetUserText" type="textarea" :rows="3" maxlength="300" />
            </el-form-item>
            <el-form-item label="活动亮点">
              <el-select v-model="form.highlights" multiple allow-create filterable default-first-option style="width: 100%">
                <el-option v-for="item in form.highlights" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="活动详情">
              <el-input v-model="form.detail" type="textarea" :rows="6" />
            </el-form-item>
            <el-form-item label="活动标签">
              <el-select v-model="form.tagIds" multiple filterable clearable style="width: 100%">
                <el-option-group v-for="group in groupedTags" :key="group.label" :label="group.label">
                  <el-option v-for="item in group.options" :key="item.id" :label="item.name" :value="item.id" />
                </el-option-group>
              </el-select>
            </el-form-item>
            <el-form-item label="关联产品">
              <el-select v-model="form.relatedProductIds" multiple filterable clearable style="width: 100%">
                <el-option
                  v-for="item in selectableProducts"
                  :key="item.id"
                  :label="`${item.module?.name || '-'} / ${item.title}`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
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
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { activityApi, activityStatusText, activityTypeText, type Activity, type ActivityPayload, type ActivityType } from '@/api/activity'
import { productApi, type Product, type ProductModule, type TagDictionary } from '@/api/product'
import AdminCoverUpload from '@/components/AdminCoverUpload.vue'

type ActivityForm = Omit<ActivityPayload, 'startAt' | 'endAt' | 'registrationStartAt' | 'registrationEndAt'> & {
  activityTimeRange: string[]
  registrationTimeRange: string[]
}

const activities = ref<Activity[]>([])
const modules = ref<ProductModule[]>([])
const tags = ref<TagDictionary[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const activeFormTab = ref('basic')
const formRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const moduleId = ref<number | ''>('')
const activityType = ref<ActivityType | ''>('')
const status = ref<number | ''>('')

const defaultForm = (): ActivityForm => ({
  moduleId: 0,
  title: '',
  subtitle: '',
  coverUrl: '',
  activityType: 'online',
  locationText: '',
  activityTimeRange: [],
  registrationTimeRange: [],
  capacity: undefined,
  targetUserText: '',
  highlights: [],
  detail: '',
  tagIds: [],
  relatedProductIds: [],
  priority: 0,
  sortOrder: 0,
  status: 0,
})

const form = reactive<ActivityForm>(defaultForm())
const activeModules = computed(() => modules.value.filter((item) => item.status === 1))
const selectableProducts = computed(() => products.value.filter((item) => !form.moduleId || item.module?.id === form.moduleId))
const locationPlaceholder = computed(() => {
  if (form.activityType === 'offline') return '填写门店地址、集合地点或详细到场说明'
  if (form.activityType === 'mixed') return '填写线下地址和线上参与入口说明'
  return '填写直播间、会议链接或报名后通知说明'
})
const groupedTags = computed(() => {
  const currentModuleId = form.moduleId || null
  const options = tags.value.filter((item) => item.status === 1 && (!item.moduleId || item.moduleId === currentModuleId))
  const map = new Map<string, TagDictionary[]>()
  options.forEach((item) => {
    const label = `${item.module?.name || '通用'} / ${item.group || '默认'}`
    map.set(label, [...(map.get(label) ?? []), item])
  })
  return Array.from(map.entries()).map(([label, groupOptions]) => ({ label, options: groupOptions }))
})

const rules: FormRules<ActivityForm> = {
  moduleId: [{ required: true, message: '请选择所属模块', trigger: 'change' }],
  title: [{ required: true, message: '请填写活动标题', trigger: 'blur' }],
  activityTimeRange: [{ required: true, type: 'array', min: 2, message: '请选择活动时间', trigger: 'change' }],
  registrationTimeRange: [{ required: true, type: 'array', min: 2, message: '请选择报名时间', trigger: 'change' }],
}

async function loadOptions() {
  const [moduleRows, tagRows, productResult] = await Promise.all([
    productApi.listModules(),
    productApi.listTags({ status: 1 }),
    productApi.listProducts({ page: 1, pageSize: 200, status: 1 }),
  ])
  modules.value = moduleRows
  tags.value = tagRows
  products.value = productResult.list
}

async function loadActivities() {
  loading.value = true
  try {
    const result = await activityApi.listActivities({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      moduleId: moduleId.value,
      activityType: activityType.value,
      status: status.value,
    })
    activities.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadActivities()
}

function resetSearch() {
  keyword.value = ''
  moduleId.value = ''
  activityType.value = ''
  status.value = ''
  handleSearch()
}

function openDialog(row?: Activity) {
  editingId.value = row?.id ?? null
  activeFormTab.value = 'basic'
  Object.assign(form, row
    ? {
        moduleId: row.moduleId,
        title: row.title,
        subtitle: row.subtitle,
        coverUrl: row.coverUrl,
        activityType: row.activityType,
        locationText: row.locationText,
        activityTimeRange: [row.startAt, row.endAt],
        registrationTimeRange: [row.registrationStartAt || row.createdAt, row.registrationEndAt],
        capacity: row.capacity ?? undefined,
        targetUserText: row.targetUserText,
        highlights: [...row.highlights],
        detail: row.detail,
        tagIds: [...row.tagIds],
        relatedProductIds: [...row.relatedProductIds],
        priority: row.priority,
        sortOrder: row.sortOrder,
        status: row.status,
      }
    : defaultForm())
  dialogVisible.value = true
}

function handleModuleChange() {
  const validTagIds = new Set(groupedTags.value.flatMap((group) => group.options.map((item) => item.id)))
  form.tagIds = form.tagIds?.filter((id) => validTagIds.has(id)) ?? []
  const validProductIds = new Set(selectableProducts.value.map((item) => item.id))
  form.relatedProductIds = form.relatedProductIds?.filter((id) => validProductIds.has(id)) ?? []
}

function validateActivityTimeline() {
  const [startAt, endAt] = form.activityTimeRange
  const [registrationStartAt, registrationEndAt] = form.registrationTimeRange
  const activityStart = new Date(startAt).getTime()
  const activityEnd = new Date(endAt).getTime()
  const registrationStart = registrationStartAt ? new Date(registrationStartAt).getTime() : 0
  const registrationEnd = new Date(registrationEndAt).getTime()

  activeFormTab.value = 'basic'
  if (!Number.isFinite(activityStart) || !Number.isFinite(activityEnd) || activityEnd <= activityStart) {
    ElMessage.error('活动结束时间必须晚于开始时间')
    return false
  }
  if (!Number.isFinite(registrationEnd)) {
    ElMessage.error('请选择报名截止时间')
    return false
  }
  if (registrationStartAt && (!Number.isFinite(registrationStart) || registrationEnd <= registrationStart)) {
    ElMessage.error('报名截止时间必须晚于报名开始时间')
    return false
  }
  if (registrationEnd > activityEnd) {
    ElMessage.error('报名截止时间不能晚于活动结束时间')
    return false
  }
  return true
}

async function submit() {
  try {
    await formRef.value?.validate()
  } catch (error) {
    activeFormTab.value = 'basic'
    throw error
  }
  const [startAt, endAt] = form.activityTimeRange
  const [registrationStartAt, registrationEndAt] = form.registrationTimeRange
  if (!validateActivityTimeline()) return
  submitting.value = true
  try {
    const payload: ActivityPayload = {
      moduleId: form.moduleId,
      title: form.title.trim(),
      subtitle: form.subtitle?.trim(),
      coverUrl: form.coverUrl?.trim(),
      activityType: form.activityType,
      startAt,
      endAt,
      registrationStartAt,
      registrationEndAt,
      locationText: form.locationText?.trim(),
      capacity: form.capacity,
      targetUserText: form.targetUserText?.trim(),
      highlights: form.highlights?.map((item) => item.trim()).filter(Boolean),
      detail: form.detail?.trim(),
      tagIds: form.tagIds,
      relatedProductIds: form.relatedProductIds,
      priority: form.priority,
      sortOrder: form.sortOrder,
      status: form.status,
    }
    if (editingId.value) {
      await activityApi.updateActivity(editingId.value, payload)
      ElMessage.success('活动已更新')
    } else {
      await activityApi.createActivity(payload)
      ElMessage.success('活动已创建')
    }
    dialogVisible.value = false
    await loadActivities()
  } finally {
    submitting.value = false
  }
}

async function publish(row: Activity) {
  await activityApi.publishActivity(row.id)
  ElMessage.success('活动已发布')
  await loadActivities()
}

async function unpublish(row: Activity) {
  await activityApi.unpublishActivity(row.id)
  ElMessage.success('活动已下线')
  await loadActivities()
}

function statusType(value: number) {
  if (value === 1) return 'success'
  if (value === 2) return 'info'
  return 'warning'
}

function registrationStatusText(value: string) {
  if (value === 'registering') return '报名中'
  if (value === 'not_started') return '未开始'
  if (value === 'full') return '已满员'
  if (value === 'closed') return '已截止'
  if (value === 'ended') return '已结束'
  return value || '-'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

onMounted(async () => {
  await loadOptions()
  await loadActivities()
})
</script>

<style scoped>
.activity-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.activity-cover {
  width: 64px;
  height: 44px;
  border-radius: 6px;
  flex: 0 0 auto;
}

.inline-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
