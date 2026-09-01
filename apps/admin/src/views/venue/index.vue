<template>
  <div class="venue-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">场地管理</div>
            <div class="card-header__desc">维护活动场地、图片、可用时间和临时不可用时间</div>
          </div>
          <el-button type="primary" @click="openDialog()">新增场地</el-button>
        </div>
      </template>

      <div class="page-toolbar">
        <el-input v-model="keyword" placeholder="搜索场地/地址" clearable style="width: 240px" @keyup.enter="handleSearch" />
        <el-input v-model="city" placeholder="城市" clearable style="width: 140px" @keyup.enter="handleSearch" />
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 130px">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="venues" v-loading="loading" stripe>
        <el-table-column label="场地" min-width="260">
          <template #default="{ row }">
            <div class="venue-info">
              <el-image v-if="row.coverUrl" :src="row.coverUrl" class="venue-cover" fit="cover" />
              <div class="venue-cover venue-cover--empty" v-else>场地</div>
              <div>
                <div class="table-title">{{ row.name }}</div>
                <div class="table-subtitle">{{ row.subtitle || row.address || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="城市区域" width="150">
          <template #default="{ row }">{{ [row.city, row.district].filter(Boolean).join(' / ') || '-' }}</template>
        </el-table-column>
        <el-table-column label="容量" width="90">
          <template #default="{ row }">{{ row.capacity || '不限' }}</template>
        </el-table-column>
        <el-table-column label="设施" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="item in row.facilities.slice(0, 3)" :key="item" size="small" class="tag-item">{{ item }}</el-tag>
            <span v-if="row.facilities.length > 3" class="muted">+{{ row.facilities.length - 3 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="可用时间" min-width="180">
          <template #default="{ row }">
            <div v-for="item in row.availability.slice(0, 2)" :key="`${item.weekday}-${item.startTime}`" class="muted">
              {{ weekdayText(item.weekday) }} {{ item.startTime }}-{{ item.endTime }}
            </div>
            <span v-if="row.availability.length > 2" class="muted">+{{ row.availability.length - 2 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openDialog(row)">编辑</el-button>
              <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" plain @click="toggleStatus(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
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
        @current-change="loadVenues"
        @size-change="loadVenues"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑场地' : '新增场地'" width="860px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基础信息" name="basic">
            <el-form-item label="场地名称" prop="name">
              <el-input v-model="form.name" maxlength="80" />
            </el-form-item>
            <el-form-item label="副标题">
              <el-input v-model="form.subtitle" maxlength="120" />
            </el-form-item>
            <el-form-item label="封面图">
              <AdminCoverUpload v-model="form.coverUrl" tip="支持 jpg/png/webp，建议使用场地横图，文件不超过 5MB" />
            </el-form-item>
            <el-form-item label="城市区域">
              <div class="inline-fields">
                <el-input v-model="form.city" placeholder="城市" maxlength="40" />
                <el-input v-model="form.district" placeholder="区域" maxlength="40" />
              </div>
            </el-form-item>
            <el-form-item label="详细地址">
              <el-input v-model="form.address" maxlength="200" />
            </el-form-item>
            <el-form-item label="容量/排序">
              <div class="inline-fields">
                <el-input-number v-model="form.capacity" :min="1" placeholder="容量" />
                <el-input-number v-model="form.sortOrder" :min="0" placeholder="排序" />
                <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
              </div>
            </el-form-item>
            <el-form-item label="设施">
              <el-select v-model="form.facilities" multiple allow-create filterable default-first-option style="width: 100%">
                <el-option v-for="item in form.facilities" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="联系人">
              <div class="inline-fields">
                <el-input v-model="form.contactName" placeholder="联系人" maxlength="40" />
                <el-input v-model="form.contactPhoneMasked" placeholder="联系电话展示" maxlength="40" />
              </div>
            </el-form-item>
            <el-form-item label="场地说明">
              <el-input v-model="form.description" type="textarea" :rows="4" />
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="图片与时间" name="schedule">
            <el-form-item label="场地图片">
              <div class="array-editor">
                <div v-for="(item, index) in form.images" :key="index" class="venue-image-row">
                  <AdminCoverUpload v-model="item.imageUrl" tip="支持 jpg/png/webp，可上传场地环境、门头或活动区图片，文件不超过 5MB" />
                  <div class="venue-image-row__meta">
                    <el-input-number v-model="item.sortOrder" :min="0" placeholder="排序" />
                    <el-button text type="danger" @click="removeImage(index)">删除</el-button>
                  </div>
                </div>
                <el-button @click="addImage">新增图片</el-button>
              </div>
            </el-form-item>
            <el-form-item label="可用时间">
              <div class="array-editor">
                <div v-for="(item, index) in form.availability" :key="index" class="array-row">
                  <el-select v-model="item.weekday" style="width: 110px">
                    <el-option v-for="day in weekdays" :key="day.value" :label="day.label" :value="day.value" />
                  </el-select>
                  <el-time-picker v-model="item.startTime" value-format="HH:mm" format="HH:mm" placeholder="开始" style="width: 120px" />
                  <el-time-picker v-model="item.endTime" value-format="HH:mm" format="HH:mm" placeholder="结束" style="width: 120px" />
                  <el-switch v-model="item.status" :active-value="1" :inactive-value="0" />
                  <el-button text type="danger" @click="form.availability.splice(index, 1)">删除</el-button>
                </div>
                <el-button @click="addAvailability">新增可用时间</el-button>
              </div>
            </el-form-item>
            <el-form-item label="不可用时间">
              <div class="array-editor">
                <div v-for="(item, index) in form.blockedSlots" :key="index" class="array-row">
                  <el-date-picker v-model="item.startAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" placeholder="开始时间" />
                  <el-date-picker v-model="item.endAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSSZ" placeholder="结束时间" />
                  <el-input v-model="item.reason" placeholder="原因" maxlength="160" />
                  <el-button text type="danger" @click="form.blockedSlots.splice(index, 1)">删除</el-button>
                </div>
                <el-button @click="form.blockedSlots.push({ startAt: '', endAt: '', reason: '' })">新增不可用时间</el-button>
              </div>
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
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { venueApi, weekdayText, type Venue, type VenuePayload } from '@/api/venue'
import AdminCoverUpload from '@/components/AdminCoverUpload.vue'

const weekdays = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

const venues = ref<Venue[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const activeTab = ref('basic')
const formRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const city = ref('')
const status = ref<number | ''>('')

const defaultForm = (): VenuePayload => ({
  name: '',
  subtitle: '',
  coverUrl: '',
  address: '',
  city: '',
  district: '',
  latitude: null,
  longitude: null,
  capacity: null,
  facilities: [],
  description: '',
  contactName: '',
  contactPhoneMasked: '',
  status: 1,
  sortOrder: 0,
  images: [],
  availability: [
    { weekday: 1, startTime: '09:00', endTime: '18:00', status: 1 },
    { weekday: 2, startTime: '09:00', endTime: '18:00', status: 1 },
    { weekday: 3, startTime: '09:00', endTime: '18:00', status: 1 },
    { weekday: 4, startTime: '09:00', endTime: '18:00', status: 1 },
    { weekday: 5, startTime: '09:00', endTime: '18:00', status: 1 },
  ],
  blockedSlots: [],
})

const form = reactive<VenuePayload>(defaultForm())
const rules: FormRules<VenuePayload> = {
  name: [{ required: true, message: '请填写场地名称', trigger: 'blur' }],
}

async function loadVenues() {
  loading.value = true
  try {
    const result = await venueApi.list({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      city: city.value || undefined,
      status: status.value,
    })
    venues.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadVenues()
}

function resetSearch() {
  keyword.value = ''
  city.value = ''
  status.value = ''
  handleSearch()
}

function openDialog(row?: Venue) {
  editingId.value = row?.id ?? null
  activeTab.value = 'basic'
  Object.assign(form, row ? {
    name: row.name,
    subtitle: row.subtitle,
    coverUrl: row.coverUrl,
    address: row.address,
    city: row.city,
    district: row.district,
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity,
    facilities: [...row.facilities],
    description: row.description,
    contactName: row.contactName,
    contactPhoneMasked: row.contactPhoneMasked,
    status: row.status,
    sortOrder: row.sortOrder,
    images: row.images.map((item) => ({ imageUrl: item.imageUrl, sortOrder: item.sortOrder })),
    availability: row.availability.map((item) => ({ weekday: item.weekday, startTime: item.startTime, endTime: item.endTime, status: item.status })),
    blockedSlots: row.blockedSlots.map((item) => ({ startAt: item.startAt, endAt: item.endAt, reason: item.reason })),
  } : defaultForm())
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function addAvailability() {
  form.availability.push({ weekday: 1, startTime: '09:00', endTime: '18:00', status: 1 })
}

function addImage() {
  form.images.push({ imageUrl: '', sortOrder: form.images.length })
}

function removeImage(index: number) {
  form.images.splice(index, 1)
}

async function submit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload: VenuePayload = {
      ...form,
      facilities: form.facilities.map((item) => item.trim()).filter(Boolean),
      images: form.images.filter((item) => item.imageUrl.trim()),
      blockedSlots: form.blockedSlots.filter((item) => item.startAt && item.endAt),
    }
    if (editingId.value) {
      await venueApi.update(editingId.value, payload)
      ElMessage.success('场地已更新')
    } else {
      await venueApi.create(payload)
      ElMessage.success('场地已创建')
    }
    dialogVisible.value = false
    await loadVenues()
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(row: Venue) {
  await venueApi.update(row.id, { ...row, status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '场地已停用' : '场地已启用')
  await loadVenues()
}

onMounted(loadVenues)
</script>

<style scoped>
.venue-info,
.inline-fields,
.array-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.venue-cover {
  width: 72px;
  height: 48px;
  border-radius: 6px;
  flex: 0 0 auto;
}

.venue-cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;
  color: #8a94a6;
  font-size: 12px;
}

.array-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.venue-image-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.venue-image-row__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

@media (max-width: 720px) {
  .venue-image-row {
    grid-template-columns: 1fr;
  }
}

.tag-item {
  margin-right: 4px;
}

.muted {
  color: #8a94a6;
  font-size: 12px;
}
</style>
