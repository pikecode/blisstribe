<template>
  <div class="venue-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">场地管理</div>
            <div class="card-header__desc">维护活动场地、图片、可用时间和临时不可用时间</div>
          </div>
          <div class="card-header__actions">
            <el-button @click="facilityDialogVisible = true">设施字典</el-button>
            <el-button type="primary" @click="openDialog()">新增场地</el-button>
          </div>
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
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openSchedule(row)">排期</el-button>
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
              <el-select v-model="form.facilityIds" multiple filterable placeholder="请选择设施" style="width: 100%">
                <el-option v-for="item in activeFacilities" :key="item.id" :label="item.name" :value="item.id" />
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

    <el-dialog v-model="facilityDialogVisible" title="设施字典" width="720px" :close-on-click-modal="false">
      <div class="facility-toolbar">
        <el-input v-model="facilityKeyword" placeholder="搜索设施" clearable style="width: 220px" @keyup.enter="loadFacilities" />
        <el-button type="primary" @click="openFacilityDialog()">新增设施</el-button>
      </div>
      <el-table :data="facilities" v-loading="facilityLoading" stripe>
        <el-table-column label="设施名称" prop="name" min-width="140" />
        <el-table-column label="说明" prop="description" min-width="180" show-overflow-tooltip />
        <el-table-column label="排序" prop="sortOrder" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openFacilityDialog(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" plain @click="toggleFacilityStatus(row)">
              {{ row.status === 1 ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="facilityFormVisible" :title="facilityEditingId ? '编辑设施' : '新增设施'" width="480px" :close-on-click-modal="false">
      <el-form ref="facilityFormRef" :model="facilityForm" :rules="facilityRules" label-width="84px">
        <el-form-item label="设施名称" prop="name">
          <el-input v-model="facilityForm.name" maxlength="40" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="facilityForm.description" type="textarea" :rows="3" maxlength="160" />
        </el-form-item>
        <el-form-item label="排序/状态">
          <div class="inline-fields">
            <el-input-number v-model="facilityForm.sortOrder" :min="0" placeholder="排序" />
            <el-switch v-model="facilityForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="facilityFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="facilitySubmitting" @click="submitFacility">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scheduleDialogVisible" title="场地排期" width="920px">
      <div class="schedule-toolbar">
        <div>
          <div class="schedule-title">{{ scheduleVenue?.name || '-' }}</div>
          <div class="muted">{{ scheduleVenue ? [scheduleVenue.city, scheduleVenue.district, scheduleVenue.address].filter(Boolean).join(' · ') : '' }}</div>
        </div>
        <div class="schedule-toolbar__controls">
          <el-date-picker v-model="scheduleStartDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
          <el-button :loading="scheduleLoading" @click="loadSchedule">刷新</el-button>
        </div>
      </div>
      <div v-loading="scheduleLoading" class="schedule-grid">
        <div v-for="day in scheduleDays" :key="day.date" class="schedule-day" :class="`schedule-day--${day.state}`">
          <div class="schedule-day__head">
            <div>
              <div class="schedule-day__date">{{ day.date }}</div>
              <div class="muted">{{ weekdayText(day.weekday) }}</div>
            </div>
            <el-tag :type="scheduleStateType(day.state)" size="small">{{ scheduleStateText(day.state) }}</el-tag>
          </div>
          <div class="schedule-day__section">
            <div class="schedule-day__label">开放时间</div>
            <div v-if="day.availability.length" class="schedule-day__items">
              <span v-for="item in day.availability" :key="item.id" :class="{ muted: item.status !== 1 }">
                {{ item.startTime }}-{{ item.endTime }}{{ item.status === 1 ? '' : '（停用）' }}
              </span>
            </div>
            <div v-else class="muted">无</div>
          </div>
          <div v-if="day.activities.length" class="schedule-day__section">
            <div class="schedule-day__label">活动占用</div>
            <div class="schedule-day__items">
              <span v-for="item in day.activities" :key="item.id">{{ formatTime(item.startAt) }} {{ item.title }}</span>
            </div>
          </div>
          <div v-if="day.blockedSlots.length" class="schedule-day__section">
            <div class="schedule-day__label">不可用</div>
            <div class="schedule-day__items">
              <span v-for="item in day.blockedSlots" :key="item.id">{{ formatTime(item.startAt) }}-{{ formatTime(item.endAt) }} {{ item.reason || '未填写原因' }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  venueApi,
  weekdayText,
  type Venue,
  type VenueFacility,
  type VenueFacilityPayload,
  type VenuePayload,
  type VenueScheduleDay,
} from '@/api/venue'
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
const facilities = ref<VenueFacility[]>([])
const loading = ref(false)
const facilityLoading = ref(false)
const submitting = ref(false)
const facilitySubmitting = ref(false)
const dialogVisible = ref(false)
const facilityDialogVisible = ref(false)
const facilityFormVisible = ref(false)
const scheduleDialogVisible = ref(false)
const editingId = ref<number | null>(null)
const facilityEditingId = ref<number | null>(null)
const scheduleVenue = ref<Venue | null>(null)
const scheduleDays = ref<VenueScheduleDay[]>([])
const scheduleLoading = ref(false)
const activeTab = ref('basic')
const formRef = ref<FormInstance>()
const facilityFormRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const city = ref('')
const status = ref<number | ''>('')
const facilityKeyword = ref('')
const scheduleStartDate = ref(dateKey(new Date()))

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
  facilityIds: [],
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
const facilityForm = reactive<VenueFacilityPayload>({
  name: '',
  description: '',
  status: 1,
  sortOrder: 0,
})
const activeFacilities = computed(() => facilities.value.filter((item) => item.status === 1))
const rules: FormRules<VenuePayload> = {
  name: [{ required: true, message: '请填写场地名称', trigger: 'blur' }],
}
const facilityRules: FormRules<VenueFacilityPayload> = {
  name: [{ required: true, message: '请填写设施名称', trigger: 'blur' }],
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

async function loadFacilities() {
  facilityLoading.value = true
  try {
    facilities.value = await venueApi.listFacilities({ keyword: facilityKeyword.value || undefined })
  } finally {
    facilityLoading.value = false
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
    facilityIds: [...row.facilityIds],
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

function openFacilityDialog(row?: VenueFacility) {
  facilityEditingId.value = row?.id ?? null
  Object.assign(facilityForm, row ? {
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
  } : {
    name: '',
    description: '',
    status: 1,
    sortOrder: facilities.value.length,
  })
  facilityFormVisible.value = true
  facilityFormRef.value?.clearValidate()
}

async function openSchedule(row: Venue) {
  scheduleVenue.value = row
  scheduleDialogVisible.value = true
  await loadSchedule()
}

async function loadSchedule() {
  if (!scheduleVenue.value) return
  scheduleLoading.value = true
  try {
    const result = await venueApi.schedule(scheduleVenue.value.id, { startDate: scheduleStartDate.value, days: 14 })
    scheduleVenue.value = result.venue
    scheduleDays.value = result.days
  } finally {
    scheduleLoading.value = false
  }
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
      facilities: [],
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

async function submitFacility() {
  await facilityFormRef.value?.validate()
  facilitySubmitting.value = true
  try {
    const payload = {
      ...facilityForm,
      name: facilityForm.name.trim(),
      description: facilityForm.description?.trim(),
    }
    if (facilityEditingId.value) {
      await venueApi.updateFacility(facilityEditingId.value, payload)
      ElMessage.success('设施已更新')
    } else {
      await venueApi.createFacility(payload)
      ElMessage.success('设施已创建')
    }
    facilityFormVisible.value = false
    await loadFacilities()
  } finally {
    facilitySubmitting.value = false
  }
}

async function toggleStatus(row: Venue) {
  await venueApi.update(row.id, {
    ...row,
    facilityIds: row.facilityIds,
    facilities: [],
    images: row.images.map((item) => ({ imageUrl: item.imageUrl, sortOrder: item.sortOrder })),
    availability: row.availability.map((item) => ({ weekday: item.weekday, startTime: item.startTime, endTime: item.endTime, status: item.status })),
    blockedSlots: row.blockedSlots.map((item) => ({ startAt: item.startAt, endAt: item.endAt, reason: item.reason })),
    status: row.status === 1 ? 0 : 1,
  })
  ElMessage.success(row.status === 1 ? '场地已停用' : '场地已启用')
  await loadVenues()
}

async function toggleFacilityStatus(row: VenueFacility) {
  await venueApi.updateFacility(row.id, { status: row.status === 1 ? 0 : 1 })
  ElMessage.success(row.status === 1 ? '设施已停用' : '设施已启用')
  await loadFacilities()
  await loadVenues()
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function scheduleStateText(value: VenueScheduleDay['state']) {
  if (value === 'free') return '空闲'
  if (value === 'busy') return '有占用'
  return '未开放'
}

function scheduleStateType(value: VenueScheduleDay['state']) {
  if (value === 'free') return 'success'
  if (value === 'busy') return 'warning'
  return 'info'
}

onMounted(async () => {
  await Promise.all([loadVenues(), loadFacilities()])
})
</script>

<style scoped>
.venue-info,
.inline-fields,
.array-row,
.card-header__actions,
.facility-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.facility-toolbar {
  justify-content: space-between;
  margin-bottom: 12px;
}

.schedule-toolbar,
.schedule-toolbar__controls,
.schedule-day__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.schedule-toolbar {
  margin-bottom: 14px;
}

.schedule-title {
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  min-height: 180px;
}

.schedule-day {
  min-height: 164px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.schedule-day--free {
  border-color: #b7ebc6;
  background: #fbfffc;
}

.schedule-day--busy {
  border-color: #f5d59a;
  background: #fffaf0;
}

.schedule-day--closed {
  background: #f7f8fa;
}

.schedule-day__date {
  color: #1f2937;
  font-weight: 600;
}

.schedule-day__section {
  margin-top: 10px;
}

.schedule-day__label {
  margin-bottom: 4px;
  color: #4b5563;
  font-size: 12px;
  font-weight: 600;
}

.schedule-day__items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.5;
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
