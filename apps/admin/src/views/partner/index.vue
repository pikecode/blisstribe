<template>
  <div class="partner-mgr">
    <el-card>
      <div class="partner-mgr__summary">
        <div
          v-for="item in statusSummary"
          :key="item.label"
          class="partner-summary"
          :class="`partner-summary--${item.tone}`"
        >
          <span class="partner-summary__value">{{ item.value }}</span>
          <span class="partner-summary__label">{{ item.label }}</span>
        </div>
      </div>

      <div class="page-toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索主体名称、编号"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px">
          <el-option label="待审核" :value="PartnerStatus.PENDING" />
          <el-option label="正常" :value="PartnerStatus.ACTIVE" />
          <el-option label="已拒绝" :value="PartnerStatus.REJECTED" />
          <el-option label="已冻结" :value="PartnerStatus.FROZEN" />
          <el-option label="已停用" :value="PartnerStatus.DISABLED" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table v-if="!isMobile" :data="list" v-loading="loading" stripe>
        <el-table-column prop="partnerNo" label="主体编号" width="150" />
        <el-table-column prop="displayName" label="主体名称" min-width="160" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">{{ typeText(row.type) }}</template>
        </el-table-column>
        <el-table-column label="负责人" min-width="130">
          <template #default="{ row }">{{ row.owner?.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column label="联系电话" width="140">
          <template #default="{ row }">{{ row.contactPhoneMasked || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <div class="partner-actions">
              <el-button size="small" type="primary" plain @click="openDetail(row)">详情</el-button>
              <el-button
                v-if="row.status === PartnerStatus.PENDING"
                size="small"
                type="success"
                @click="approvePartner(row)"
              >
                审核通过
              </el-button>
              <el-button
                v-if="row.status === PartnerStatus.PENDING"
                size="small"
                type="danger"
                @click="rejectPartner(row)"
              >
                审核驳回
              </el-button>
              <el-button
                v-if="row.status === PartnerStatus.ACTIVE"
                size="small"
                type="warning"
                @click="freezePartner(row)"
              >
                冻结
              </el-button>
              <el-button
                v-if="row.status === PartnerStatus.FROZEN"
                size="small"
                type="success"
                @click="unfreezePartner(row)"
              >
                解冻
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else v-loading="loading" class="partner-cards">
        <div v-for="row in list" :key="row.id" class="partner-card">
          <div class="partner-card__header">
            <div>
              <div class="partner-card__name">{{ row.displayName }}</div>
              <div class="partner-card__no">{{ row.partnerNo }}</div>
            </div>
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </div>
          <div class="partner-card__row">
            <span class="partner-card__label">类型</span>
            <span>{{ typeText(row.type) }}</span>
          </div>
          <div class="partner-card__row">
            <span class="partner-card__label">负责人</span>
            <span>{{ row.owner?.nickname || '-' }}</span>
          </div>
          <div class="partner-card__row">
            <span class="partner-card__label">电话</span>
            <span>{{ row.contactPhoneMasked || '-' }}</span>
          </div>
          <div class="partner-card__row">
            <span class="partner-card__label">申请</span>
            <span>{{ formatDate(row.createdAt) }}</span>
          </div>
          <div class="partner-card__footer">
            <el-button size="small" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === PartnerStatus.PENDING"
              size="small"
              type="success"
              @click="approvePartner(row)"
            >
              审核通过
            </el-button>
            <el-button
              v-if="row.status === PartnerStatus.PENDING"
              size="small"
              type="danger"
              @click="rejectPartner(row)"
            >
              审核驳回
            </el-button>
            <el-button
              v-if="row.status === PartnerStatus.ACTIVE"
              size="small"
              type="warning"
              @click="freezePartner(row)"
            >
              冻结
            </el-button>
            <el-button
              v-if="row.status === PartnerStatus.FROZEN"
              size="small"
              type="success"
              @click="unfreezePartner(row)"
            >
              解冻
            </el-button>
          </div>
        </div>
      </div>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
        class="partner-mgr__pager"
      />
    </el-card>

    <el-drawer v-model="detailVisible" title="B 入驻审核详情" size="820px">
      <div v-if="currentPartner" class="partner-drawer__head">
        <div>
          <div class="partner-drawer__title">{{ currentPartner.displayName }}</div>
          <div class="partner-drawer__meta">
            {{ currentPartner.partnerNo }} · {{ typeText(currentPartner.type) }}
          </div>
        </div>
        <el-tag :type="statusTagType(currentPartner.status)">
          {{ statusText(currentPartner.status) }}
        </el-tag>
      </div>

      <el-tabs v-if="currentPartner" v-model="activeDetailTab" @tab-change="handleDetailTabChange">
        <el-tab-pane label="基础信息" name="base">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="主体编号">
              {{ currentPartner.partnerNo }}
            </el-descriptions-item>
            <el-descriptions-item label="主体名称">
              {{ currentPartner.displayName }}
            </el-descriptions-item>
            <el-descriptions-item label="主体类型">
              {{ typeText(currentPartner.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="主体状态">
              <el-tag :type="statusTagType(currentPartner.status)">
                {{ statusText(currentPartner.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="负责人">
              {{ currentPartner.owner?.nickname || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="负责人手机号">
              {{ currentPartner.owner?.phoneMasked || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="联系人">
              {{ currentPartner.contactName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ currentPartner.contactPhoneMasked || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="区域">
              {{ currentPartner.regionCode || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="审核原因">
              {{ currentPartner.auditReason || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ formatDate(currentPartner.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="通过时间">
              {{ currentPartner.approvedAt ? formatDate(currentPartner.approvedAt) : '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="客户关系" name="customers">
          <div class="partner-drawer__toolbar">
            <el-button type="primary" @click="transferDialogVisible = true">手动调整客户归属</el-button>
          </div>
          <el-table :data="customerList" v-loading="customerLoading" stripe>
            <el-table-column label="客户" min-width="130">
              <template #default="{ row }">{{ row.nickname || '-' }}</template>
            </el-table-column>
            <el-table-column label="手机号" width="130">
              <template #default="{ row }">{{ row.phoneMasked || '-' }}</template>
            </el-table-column>
            <el-table-column label="来源码" width="120">
              <template #default="{ row }">{{ row.sourceInvitationCode || '-' }}</template>
            </el-table-column>
            <el-table-column label="关系状态" width="100">
              <template #default="{ row }">
                <el-tag :type="relationStatusTagType(row.relationStatus)">
                  {{ relationStatusText(row.relationStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最近事件" width="120">
              <template #default="{ row }">{{ relationEventText(row.lastEventType) }}</template>
            </el-table-column>
            <el-table-column label="绑定时间" width="170">
              <template #default="{ row }">{{ formatDate(row.boundAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="customerPage"
            v-model:page-size="customerPageSize"
            :total="customerTotal"
            layout="total, prev, pager, next"
            class="partner-drawer__pager"
            @current-change="loadCustomers"
          />
        </el-tab-pane>

        <el-tab-pane label="邀请记录" name="invitations">
          <div v-loading="invitationLoading">
            <div class="invite-code-list">
              <div v-for="code in invitationCodes" :key="code.id" class="invite-code-card">
                <div>
                  <div class="invite-code-card__code">{{ code.code }}</div>
                  <div class="invite-code-card__meta">
                    {{ code.scene }} · 已用 {{ code.usedCount }} 次
                  </div>
                </div>
                <el-tag :type="code.status === 1 ? 'success' : 'info'">
                  {{ code.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </div>
              <el-empty v-if="invitationCodes.length === 0" description="暂无邀请码" />
            </div>

            <el-table :data="invitationRecords" stripe>
              <el-table-column prop="code" label="邀请码" width="120" />
              <el-table-column label="用户" min-width="130">
                <template #default="{ row }">{{ row.userNickname || '-' }}</template>
              </el-table-column>
              <el-table-column label="手机号" width="130">
                <template #default="{ row }">{{ row.userPhoneMasked || '-' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="invitationStatusTagType(row.status)">
                    {{ invitationStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="失败原因" min-width="150">
                <template #default="{ row }">{{ row.failureReason || '-' }}</template>
              </el-table-column>
              <el-table-column label="时间" width="170">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
            <el-pagination
              v-model:current-page="invitationPage"
              v-model:page-size="invitationPageSize"
              :total="invitationTotal"
              layout="total, prev, pager, next"
              class="partner-drawer__pager"
              @current-change="loadInvitations"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-drawer>

    <el-dialog v-model="transferDialogVisible" title="手动调整客户归属" width="460px">
      <el-form label-position="top">
        <el-form-item label="目标 B 主体">
          <el-input :model-value="currentPartner?.displayName || '-'" disabled />
        </el-form-item>
        <el-form-item label="客户用户 ID">
          <el-input-number
            v-model="transferCustomerUserId"
            :min="1"
            :precision="0"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input
            v-model="transferReason"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="例如：客户误填邀请码，经客服核实转入该 B 主体"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="transferSubmitting" @click="submitTransferCustomer">
          确认调整
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { partnerApi } from '@/api/partner'
import {
  type Partner,
  type PartnerCustomer,
  type PartnerInvitationCode,
  type PartnerInvitationRecord,
  type PartnerStatusValue,
  type PartnerType,
} from '@blisstribe/shared'

type TagType = '' | 'success' | 'warning' | 'danger' | 'info'

const PartnerStatus = {
  PENDING: 0,
  ACTIVE: 1,
  REJECTED: 2,
  FROZEN: 3,
  DISABLED: 4,
} as const

const list = ref<Partner[]>([])
const loading = ref(false)
const keyword = ref('')
const status = ref<PartnerStatusValue | undefined>()
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const detailVisible = ref(false)
const currentPartner = ref<Partner | null>(null)
const activeDetailTab = ref('base')
const customerLoading = ref(false)
const customerList = ref<PartnerCustomer[]>([])
const customerPage = ref(1)
const customerPageSize = ref(10)
const customerTotal = ref(0)
const invitationLoading = ref(false)
const invitationCodes = ref<PartnerInvitationCode[]>([])
const invitationRecords = ref<PartnerInvitationRecord[]>([])
const invitationPage = ref(1)
const invitationPageSize = ref(10)
const invitationTotal = ref(0)
const transferDialogVisible = ref(false)
const transferCustomerUserId = ref<number | undefined>()
const transferReason = ref('')
const transferSubmitting = ref(false)

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)

const updateWidth = (): void => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))

const loadList = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await partnerApi.list({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value,
      keyword: keyword.value || undefined,
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleSearch = (): void => {
  page.value = 1
  loadList()
}

const resetSearch = (): void => {
  keyword.value = ''
  status.value = undefined
  page.value = 1
  loadList()
}

const statusSummary = computed(() => {
  const count = (target: PartnerStatusValue) => list.value.filter(item => item.status === target).length
  return [
    { label: '当前列表', value: list.value.length, tone: 'neutral' },
    { label: '待审核', value: count(PartnerStatus.PENDING), tone: 'warning' },
    { label: '正常主体', value: count(PartnerStatus.ACTIVE), tone: 'success' },
    { label: '异常状态', value: count(PartnerStatus.REJECTED) + count(PartnerStatus.FROZEN), tone: 'danger' },
  ]
})

const openDetail = async (row: Partner): Promise<void> => {
  activeDetailTab.value = 'base'
  customerList.value = []
  customerTotal.value = 0
  customerPage.value = 1
  invitationCodes.value = []
  invitationRecords.value = []
  invitationTotal.value = 0
  invitationPage.value = 1
  currentPartner.value = await partnerApi.get(row.id)
  detailVisible.value = true
}

const handleDetailTabChange = (name: string | number): void => {
  if (name === 'customers' && customerList.value.length === 0) {
    loadCustomers()
  }
  if (name === 'invitations' && invitationCodes.value.length === 0 && invitationRecords.value.length === 0) {
    loadInvitations()
  }
}

const loadCustomers = async (): Promise<void> => {
  if (!currentPartner.value) return
  customerLoading.value = true
  try {
    const data = await partnerApi.customers(currentPartner.value.id, {
      page: customerPage.value,
      pageSize: customerPageSize.value,
    })
    customerList.value = data.list
    customerTotal.value = data.total
  } finally {
    customerLoading.value = false
  }
}

const loadInvitations = async (): Promise<void> => {
  if (!currentPartner.value) return
  invitationLoading.value = true
  try {
    const data = await partnerApi.invitations(currentPartner.value.id, {
      page: invitationPage.value,
      pageSize: invitationPageSize.value,
    })
    invitationCodes.value = data.codes
    invitationRecords.value = data.records.list
    invitationTotal.value = data.records.total
  } finally {
    invitationLoading.value = false
  }
}

const submitTransferCustomer = async (): Promise<void> => {
  if (!currentPartner.value) return
  if (!transferCustomerUserId.value) {
    ElMessage.warning('请填写客户用户 ID')
    return
  }
  if (!transferReason.value.trim()) {
    ElMessage.warning('请填写调整原因')
    return
  }
  transferSubmitting.value = true
  try {
    await partnerApi.transferCustomer(currentPartner.value.id, {
      customerUserId: transferCustomerUserId.value,
      reason: transferReason.value.trim(),
    })
    ElMessage.success('客户归属已调整')
    transferDialogVisible.value = false
    transferCustomerUserId.value = undefined
    transferReason.value = ''
    customerPage.value = 1
    await loadCustomers()
  } finally {
    transferSubmitting.value = false
  }
}

const approvePartner = async (row: Partner): Promise<void> => {
  await ElMessageBox.confirm(`确定通过「${row.displayName}」的 B 主体申请？`, '审核确认', {
    type: 'warning',
  })
  await partnerApi.approve(row.id)
  ElMessage.success('已通过审核')
  loadList()
}

const rejectPartner = async (row: Partner): Promise<void> => {
  const { value } = await ElMessageBox.prompt(`请输入驳回「${row.displayName}」的原因`, '驳回申请', {
    inputType: 'textarea',
    inputPlaceholder: '例如：资料不完整，请补充经营信息',
    inputValidator: (value) => Boolean(value && value.trim()),
    inputErrorMessage: '请填写驳回原因',
  })
  await partnerApi.reject(row.id, value.trim())
  ElMessage.success('已驳回申请')
  loadList()
}

const freezePartner = async (row: Partner): Promise<void> => {
  const { value } = await ElMessageBox.prompt(`请输入冻结「${row.displayName}」的原因`, '冻结主体', {
    inputType: 'textarea',
    inputPlaceholder: '例如：存在异常交易，待复核',
    inputValidator: (value) => Boolean(value && value.trim()),
    inputErrorMessage: '请填写冻结原因',
  })
  await partnerApi.freeze(row.id, value.trim())
  ElMessage.success('已冻结主体')
  loadList()
}

const unfreezePartner = async (row: Partner): Promise<void> => {
  await ElMessageBox.confirm(`确定解冻「${row.displayName}」？`, '解冻确认', {
    type: 'warning',
  })
  await partnerApi.unfreeze(row.id)
  ElMessage.success('已解冻主体')
  loadList()
}

const statusText = (value: PartnerStatusValue): string => {
  const map: Record<PartnerStatusValue, string> = {
    [PartnerStatus.PENDING]: '待审核',
    [PartnerStatus.ACTIVE]: '正常',
    [PartnerStatus.REJECTED]: '已拒绝',
    [PartnerStatus.FROZEN]: '已冻结',
    [PartnerStatus.DISABLED]: '已停用',
  }
  return map[value] || '未知'
}

const statusTagType = (value: PartnerStatusValue): TagType => {
  const map: Record<PartnerStatusValue, TagType> = {
    [PartnerStatus.PENDING]: 'warning',
    [PartnerStatus.ACTIVE]: 'success',
    [PartnerStatus.REJECTED]: 'danger',
    [PartnerStatus.FROZEN]: 'info',
    [PartnerStatus.DISABLED]: '',
  }
  return map[value] || ''
}

const relationStatusText = (value: number): string => {
  const map: Record<number, string> = {
    0: '失效',
    1: '有效',
    2: '争议中',
  }
  return map[value] || '未知'
}

const relationStatusTagType = (value: number): TagType => {
  const map: Record<number, TagType> = {
    0: 'info',
    1: 'success',
    2: 'warning',
  }
  return map[value] || ''
}

const relationEventText = (value?: string | null): string => {
  const map: Record<string, string> = {
    invited: '已邀请',
    bound: '已绑定',
    bind_skipped: '跳过绑定',
    transferred: '已转移',
    unbound: '已解绑',
    disputed: '争议中',
    resolved: '已处理',
  }
  return value ? map[value] || value : '-'
}

const invitationStatusText = (value: number): string => {
  const map: Record<number, string> = {
    0: '已解析',
    1: '已注册',
    2: '已绑定',
    3: '无效',
    4: '跳过绑定',
  }
  return map[value] || '未知'
}

const invitationStatusTagType = (value: number): TagType => {
  const map: Record<number, TagType> = {
    0: 'info',
    1: '',
    2: 'success',
    3: 'danger',
    4: 'warning',
  }
  return map[value] || ''
}

const typeText = (value: PartnerType): string => {
  const map: Record<PartnerType, string> = {
    individual: '个人',
    group_leader: '团长',
    creator: '达人',
    store: '门店',
    service_provider: '服务商',
    agency: '机构',
  }
  return map[value] || value
}

const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

onMounted(loadList)
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.partner-mgr {
  &__summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 14px;
  }

  &__pager {
    margin-top: 18px;
    justify-content: flex-end;
  }
}

.partner-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: $radius-md;
  border: 1px solid $color-border;
  background: $color-surface-soft;

  &__value {
    font-size: 24px;
    line-height: 1;
    font-weight: 800;
    color: $color-text;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    color: $color-text-tertiary;
    font-size: 13px;
    white-space: nowrap;
  }

  &--warning { border-color: rgba(217, 119, 6, 0.28); background: #fff8eb; }
  &--success { border-color: rgba(3, 152, 85, 0.24); background: #effaf4; }
  &--danger { border-color: rgba(217, 45, 32, 0.22); background: #fff4f2; }
}

.partner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.partner-drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface-soft;
}

.partner-drawer__title {
  color: $color-text;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.partner-drawer__meta {
  margin-top: 6px;
  color: $color-text-tertiary;
  font-size: 13px;
}

.partner-drawer__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}

.partner-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 60px;
}

.partner-card {
  background: #fff;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 1px 2px rgba(23, 20, 18, 0.04);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__name {
    font-size: 16px;
    font-weight: 700;
    color: $color-text;
  }

  &__no {
    margin-top: 2px;
    font-size: 12px;
    color: $color-text-tertiary;
  }

  &__row {
    display: grid;
    grid-template-columns: 60px 1fr;
    gap: 8px;
    font-size: 13px;
    color: $color-text-secondary;
  }

  &__label {
    color: $color-text-tertiary;
    min-width: 52px;
  }

  &__footer {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;

    :deep(.el-button + .el-button) {
      margin-left: 0;
    }
  }
}

@media (max-width: 900px) {
  .partner-mgr__summary {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
}

@media (max-width: 520px) {
  .partner-mgr__summary {
    grid-template-columns: 1fr;
  }
}
</style>
