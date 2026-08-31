<template>
  <div class="activity-registration-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">活动报名</div>
            <div class="card-header__desc">查看报名用户、来源归属和现场确认状态</div>
          </div>
          <el-button @click="loadRegistrations">刷新</el-button>
        </div>
      </template>

      <div class="page-toolbar">
        <el-input v-model="keyword" placeholder="搜索活动/用户/留言" clearable style="width: 240px" @keyup.enter="handleSearch" />
        <el-select v-model="activityId" placeholder="全部活动" clearable filterable style="width: 240px">
          <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
        </el-select>
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px">
          <el-option v-for="item in registrationStatuses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="registrations" v-loading="loading" stripe>
        <el-table-column label="活动" min-width="220">
          <template #default="{ row }">
            <div class="table-title">{{ row.activity.title }}</div>
            <div class="table-subtitle">{{ formatDate(row.activity.startAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">
            <div>{{ row.user.nickname || row.name || '-' }}</div>
            <div class="muted">{{ row.phoneMasked || row.user.phoneMasked || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="归属 B 端" min-width="160">
          <template #default="{ row }">
            <span v-if="row.partner">{{ row.partner.displayName }}</span>
            <span v-else class="muted">平台报名</span>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="140">
          <template #default="{ row }">{{ row.sourceInviteCode || row.sourceScene || '-' }}</template>
        </el-table-column>
        <el-table-column prop="message" label="留言" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="registrationStatusType(row.status)">{{ registrationStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="报名时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openDetail(row)">详情</el-button>
              <el-button size="small" type="primary" plain @click="openStatusDialog(row)">处理</el-button>
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
        @current-change="loadRegistrations"
        @size-change="loadRegistrations"
      />
    </el-card>

    <el-dialog v-model="statusDialogVisible" title="处理报名" width="520px">
      <el-form :model="statusForm" label-width="90px">
        <el-form-item label="报名状态">
          <el-select v-model="statusForm.status" style="width: 100%">
            <el-option v-for="item in registrationStatuses" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input v-model="statusForm.followUpNote" type="textarea" :rows="5" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitStatus">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="报名详情" size="560px">
      <div v-if="detail" class="registration-detail">
        <div class="detail-section">
          <div class="detail-title">活动信息</div>
          <div class="detail-main">{{ detail.activity.title }}</div>
          <div class="muted">{{ formatDate(detail.activity.startAt) }} 至 {{ formatDate(detail.activity.endAt) }}</div>
          <div class="muted">{{ detail.activity.locationText || '-' }}</div>
        </div>
        <div class="detail-section">
          <div class="detail-title">报名信息</div>
          <div class="detail-grid">
            <span>用户</span>
            <strong>{{ detail.user.nickname || detail.name || '-' }}</strong>
            <span>手机</span>
            <strong>{{ detail.phoneMasked || detail.user.phoneMasked || '-' }}</strong>
            <span>归属</span>
            <strong>{{ detail.partner?.displayName || '平台报名' }}</strong>
            <span>邀请码</span>
            <strong>{{ detail.sourceInviteCode || '-' }}</strong>
            <span>状态</span>
            <strong>{{ registrationStatusText(detail.status) }}</strong>
            <span>报名时间</span>
            <strong>{{ formatDate(detail.createdAt) }}</strong>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-title">留言与备注</div>
          <div class="detail-message">{{ detail.message || '暂无留言' }}</div>
          <div v-if="detail.followUpNote" class="detail-message">{{ detail.followUpNote }}</div>
          <div v-if="detail.cancelReason" class="muted">取消原因：{{ detail.cancelReason }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  activityApi,
  registrationStatusText,
  type Activity,
  type ActivityRegistration,
  type ActivityRegistrationStatus,
} from '@/api/activity'

const activities = ref<Activity[]>([])
const registrations = ref<ActivityRegistration[]>([])
const detail = ref<ActivityRegistration | null>(null)
const loading = ref(false)
const submitting = ref(false)
const detailVisible = ref(false)
const statusDialogVisible = ref(false)
const currentId = ref<number | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const keyword = ref('')
const activityId = ref<number | ''>('')
const status = ref<ActivityRegistrationStatus | ''>('')
const statusForm = reactive<{ status: ActivityRegistrationStatus; followUpNote: string }>({
  status: 'registered',
  followUpNote: '',
})

const registrationStatuses: { label: string; value: ActivityRegistrationStatus }[] = [
  { label: '已报名', value: 'registered' },
  { label: '已确认', value: 'confirmed' },
  { label: '已到场', value: 'attended' },
  { label: '已取消', value: 'cancelled' },
  { label: '无效', value: 'invalid' },
]

async function loadActivities() {
  const result = await activityApi.listActivities({ page: 1, pageSize: 200 })
  activities.value = result.list
}

async function loadRegistrations() {
  loading.value = true
  try {
    const result = await activityApi.listRegistrations({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      activityId: activityId.value,
      status: status.value,
    })
    registrations.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadRegistrations()
}

function resetSearch() {
  keyword.value = ''
  activityId.value = ''
  status.value = ''
  handleSearch()
}

async function openDetail(row: ActivityRegistration) {
  detail.value = await activityApi.detailRegistration(row.id)
  detailVisible.value = true
}

function openStatusDialog(row: ActivityRegistration) {
  currentId.value = row.id
  statusForm.status = row.status
  statusForm.followUpNote = row.followUpNote || ''
  statusDialogVisible.value = true
}

async function submitStatus() {
  if (!currentId.value) return
  submitting.value = true
  try {
    await activityApi.updateRegistrationStatus(currentId.value, {
      status: statusForm.status,
      followUpNote: statusForm.followUpNote.trim(),
    })
    ElMessage.success('报名状态已更新')
    statusDialogVisible.value = false
    await loadRegistrations()
    if (detailVisible.value && detail.value?.id === currentId.value) {
      detail.value = await activityApi.detailRegistration(currentId.value)
    }
  } finally {
    submitting.value = false
  }
}

function registrationStatusType(value: string) {
  if (value === 'attended') return 'success'
  if (value === 'confirmed') return 'warning'
  if (value === 'cancelled' || value === 'invalid') return 'info'
  return 'primary'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

onMounted(async () => {
  await loadActivities()
  await loadRegistrations()
})
</script>

<style scoped>
.registration-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
