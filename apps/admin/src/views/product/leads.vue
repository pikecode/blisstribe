<template>
  <div class="lead-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">咨询线索</div>
            <div class="card-header__desc">查看用户需求并记录线索跟进状态</div>
          </div>
          <el-button @click="loadAll">刷新</el-button>
        </div>
      </template>

      <div class="lead-summary">
        <button
          v-for="item in summaryCards"
          :key="item.key"
          type="button"
          class="summary-card"
          :class="[`summary-card--${item.tone}`, { 'summary-card--active': item.active }]"
          @click="applySummaryFilter(item)"
        >
          <span class="summary-card__label">{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <span class="summary-card__desc">{{ item.desc }}</span>
        </button>
      </div>

      <div class="page-toolbar">
        <el-input v-model="keyword" placeholder="搜索产品/用户/留言" clearable style="width: 220px" @keyup.enter="handleSearch" />
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px">
          <el-option v-for="item in leadStatuses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="followScope" placeholder="全部跟进" clearable style="width: 150px">
          <el-option label="今日跟进" value="today" />
          <el-option label="已逾期" value="overdue" />
          <el-option label="后续跟进" value="upcoming" />
        </el-select>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="leads" v-loading="loading" stripe>
        <el-table-column label="产品" min-width="180">
          <template #default="{ row }">{{ row.product.title }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="160">
          <template #default="{ row }">
            <div>{{ row.user.nickname || '-' }}</div>
            <div class="muted">{{ row.user.phoneMasked || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="归属 B 端" min-width="180">
          <template #default="{ row }">
            <span v-if="row.partner">{{ row.partner.displayName }}</span>
            <span v-else class="muted">平台线索</span>
          </template>
        </el-table-column>
        <el-table-column label="需求标签" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="tag in row.needTags" :key="tag" size="small" class="tag-item">{{ tag }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="留言" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下次跟进" width="180">
          <template #default="{ row }">
            <span :class="{ overdue: isOverdue(row.nextFollowAt, row.status) }">{{ row.nextFollowAt ? formatDate(row.nextFollowAt) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" @click="openDetail(row)">详情</el-button>
              <el-button size="small" type="primary" plain @click="openFollowDialog(row)">跟进</el-button>
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
        @current-change="loadLeads"
        @size-change="loadLeads"
      />
    </el-card>

    <el-dialog v-model="followDialogVisible" title="线索跟进" width="520px">
      <el-form :model="followForm" label-width="90px">
        <el-form-item label="处理状态">
          <el-select v-model="followForm.status" style="width: 100%">
            <el-option v-for="item in leadStatuses" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进备注">
          <el-input v-model="followForm.followUpNote" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="下次跟进">
          <el-date-picker
            v-model="followForm.nextFollowAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
            placeholder="可选"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollow">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="线索详情" size="560px">
      <div v-if="detailLead" class="lead-detail">
        <div class="detail-section">
          <div class="detail-title">产品信息</div>
          <div class="detail-main">{{ detailLead.product.title }}</div>
          <div class="muted">{{ detailLead.product.priceText || '-' }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-title">用户信息</div>
          <div class="detail-grid">
            <span>昵称</span>
            <strong>{{ detailLead.user.nickname || '-' }}</strong>
            <span>手机</span>
            <strong>{{ detailLead.user.phoneMasked || '-' }}</strong>
            <span>归属</span>
            <strong>{{ detailLead.partner?.displayName || '平台线索' }}</strong>
            <span>来源</span>
            <strong>{{ detailLead.sourceScene || '-' }}</strong>
            <span>下次跟进</span>
            <strong :class="{ overdue: isOverdue(detailLead.nextFollowAt, detailLead.status) }">
              {{ detailLead.nextFollowAt ? formatDate(detailLead.nextFollowAt) : '-' }}
            </strong>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-title">需求信息</div>
          <div class="detail-tags">
            <el-tag v-for="tag in detailLead.needTags" :key="tag" size="small">{{ tag }}</el-tag>
          </div>
          <div v-if="detailLead.message" class="detail-message">{{ detailLead.message }}</div>
        </div>

        <div class="detail-section">
          <div class="detail-title">跟进历史</div>
          <el-timeline v-if="detailLead.followUps.length">
            <el-timeline-item
              v-for="item in detailLead.followUps"
              :key="item.id"
              :timestamp="formatDate(item.createdAt)"
            >
              <div class="timeline-title">
                {{ followStatusText(item.fromStatus, item.toStatus) }}
              </div>
              <div v-if="item.note" class="muted">{{ item.note }}</div>
              <div v-if="item.nextFollowAt" class="muted">下次跟进：{{ formatDate(item.nextFollowAt) }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无跟进记录" />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { productApi, type ProductLead, type ProductLeadSummary } from '@/api/product'

const leads = ref<ProductLead[]>([])
const summary = ref<ProductLeadSummary>({
  total: 0,
  active: 0,
  today: 0,
  overdue: 0,
  upcoming: 0,
  converted: 0,
  invalid: 0,
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const status = ref('')
const followScope = ref('')
const keyword = ref('')
const currentLeadId = ref<number | null>(null)
const detailLead = ref<ProductLead | null>(null)
const detailVisible = ref(false)
const followDialogVisible = ref(false)
const followForm = reactive({ status: 'new', followUpNote: '', nextFollowAt: '' })

const leadStatuses = [
  { label: '线索创建', value: 'created' },
  { label: '新线索', value: 'new' },
  { label: '已联系', value: 'contacted' },
  { label: '有效线索', value: 'qualified' },
  { label: '已转化', value: 'converted' },
  { label: '无效', value: 'invalid' },
]

function statusText(value: string) {
  return leadStatuses.find((item) => item.value === value)?.label ?? value
}

function followStatusText(fromStatus: string, toStatus: string) {
  if (fromStatus === 'created') return statusText(toStatus)
  return `${statusText(fromStatus)}变更为${statusText(toStatus)}`
}

function statusType(value: string) {
  if (value === 'converted') return 'success'
  if (value === 'invalid') return 'danger'
  if (value === 'qualified') return 'warning'
  return 'info'
}

const summaryCards = computed(() => [
  {
    key: 'active',
    label: '活跃线索',
    value: summary.value.active,
    desc: '新线索/已联系/有效线索',
    tone: 'primary',
    status: '',
    followScope: '',
    active: !status.value && !followScope.value,
  },
  {
    key: 'overdue',
    label: '已逾期',
    value: summary.value.overdue,
    desc: '需要优先处理',
    tone: 'danger',
    status: '',
    followScope: 'overdue',
    active: followScope.value === 'overdue',
  },
  {
    key: 'today',
    label: '今日跟进',
    value: summary.value.today,
    desc: '当天计划跟进',
    tone: 'warning',
    status: '',
    followScope: 'today',
    active: followScope.value === 'today',
  },
  {
    key: 'converted',
    label: '已转化',
    value: summary.value.converted,
    desc: '已形成有效转化',
    tone: 'success',
    status: 'converted',
    followScope: '',
    active: status.value === 'converted',
  },
  {
    key: 'invalid',
    label: '无效线索',
    value: summary.value.invalid,
    desc: '需复盘来源质量',
    tone: 'muted',
    status: 'invalid',
    followScope: '',
    active: status.value === 'invalid',
  },
])

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString() : '-'
}

function isOverdue(value: string | null, leadStatus?: string) {
  if (!value) return false
  if (leadStatus === 'converted' || leadStatus === 'invalid') return false
  return new Date(value).getTime() < Date.now()
}

async function loadSummary() {
  summary.value = await productApi.leadSummary()
}

async function loadLeads() {
  loading.value = true
  try {
    const res = await productApi.listLeads({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value || undefined,
      followScope: followScope.value || undefined,
      keyword: keyword.value || undefined,
    })
    leads.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  await Promise.all([loadSummary(), loadLeads()])
}

function handleSearch() {
  page.value = 1
  loadLeads()
}

function applySummaryFilter(item: { status: string; followScope: string }) {
  status.value = item.status
  followScope.value = item.followScope
  keyword.value = ''
  handleSearch()
}

function resetSearch() {
  status.value = ''
  followScope.value = ''
  keyword.value = ''
  handleSearch()
}

function openFollowDialog(row: ProductLead) {
  currentLeadId.value = row.id
  followForm.status = row.status
  followForm.followUpNote = row.followUpNote
  followForm.nextFollowAt = ''
  followDialogVisible.value = true
}

async function openDetail(row: ProductLead) {
  detailLead.value = await productApi.detailLead(row.id)
  detailVisible.value = true
}

async function submitFollow() {
  if (!currentLeadId.value) return
  const updated = await productApi.followLead(currentLeadId.value, {
    status: followForm.status,
    followUpNote: followForm.followUpNote,
    nextFollowAt: followForm.nextFollowAt || undefined,
  })
  if (detailLead.value?.id === updated.id) detailLead.value = updated
  ElMessage.success('跟进状态已更新')
  followDialogVisible.value = false
  await loadAll()
}

onMounted(loadAll)
</script>

<style scoped>
.muted {
  color: #909399;
  font-size: 12px;
}
.overdue {
  color: #f56c6c;
  font-weight: 600;
}
.tag-item {
  margin: 2px 4px 2px 0;
}
.lead-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.summary-card {
  min-height: 92px;
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.summary-card:hover,
.summary-card--active {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgb(31 41 55 / 8%);
}
.summary-card__label,
.summary-card__desc {
  display: block;
  color: #667085;
  font-size: 12px;
}
.summary-card strong {
  display: block;
  margin: 6px 0 4px;
  color: #1f2937;
  font-size: 26px;
  line-height: 1;
}
.summary-card--primary.summary-card--active,
.summary-card--primary:hover {
  border-color: #409eff;
}
.summary-card--danger.summary-card--active,
.summary-card--danger:hover {
  border-color: #f56c6c;
}
.summary-card--warning.summary-card--active,
.summary-card--warning:hover {
  border-color: #e6a23c;
}
.summary-card--success.summary-card--active,
.summary-card--success:hover {
  border-color: #67c23a;
}
.summary-card--muted.summary-card--active,
.summary-card--muted:hover {
  border-color: #909399;
}
.lead-detail {
  padding-right: 8px;
}
.detail-section {
  margin-bottom: 24px;
}
.detail-title {
  margin-bottom: 10px;
  color: #1f2937;
  font-weight: 600;
}
.detail-main {
  margin-bottom: 4px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}
.detail-grid {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px 12px;
  color: #909399;
}
.detail-grid strong {
  color: #303133;
  font-weight: 500;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-message {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  background: #f6f7f8;
  color: #475467;
  line-height: 1.6;
  white-space: pre-wrap;
}
.timeline-title {
  margin-bottom: 4px;
  color: #303133;
  font-weight: 500;
}
@media (max-width: 1200px) {
  .lead-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
