<template>
  <div class="refund-mgr">
    <!-- 工具栏 -->
    <AdminListToolbar>
      <div class="toolbar__filters">
        <!-- 搜索 -->
        <div class="toolbar__search">
          <el-input
            v-model="keyword"
            placeholder="搜索退款号、订单号、用户昵称..."
            clearable
            prefix-icon="Search"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </div>

        <!-- 状态筛选 -->
        <el-select
          v-model="statusFilter"
          placeholder="退款状态"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option label="待审核" value="pending" />
          <el-option label="已批准" value="approved" />
          <el-option label="已拒绝" value="rejected" />
          <el-option label="处理中" value="processing" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
        </el-select>

        <!-- 日期范围 -->
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px"
          @change="handleSearch"
        />

        <!-- 重置按钮 -->
        <el-button plain icon="Refresh" @click="resetSearch">重置</el-button>
      </div>
    </AdminListToolbar>

    <!-- 表格容器 -->
    <div class="table-wrapper">
      <!-- 桌面端表格 -->
      <el-alert v-if="isMobile && listError" :title="listError" type="error" :closable="false" show-icon>
        <el-button link type="primary" :disabled="loading" @click="loadList">重新加载</el-button>
      </el-alert>
      <AdminListTable
        v-if="!isMobile"
        :data="refunds"
        :loading="loading"
        style="width: 100%"
        row-key="id"
       :error="listError" @retry="loadList">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="refundNo" label="退款号" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              {{ row.refundNo }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="140" show-overflow-tooltip />
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div>
              <div>{{ row.user?.nickname || row.userName || '-' }}</div>
              <div style="color: #909399; font-size: 12px">
                {{ row.user?.phoneMasked || row.userPhone || '-' }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="申请金额" width="100" align="right">
          <template #default="{ row }">
            ¥{{ (row.requestAmountFen / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="批准金额" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.approvedAmountFen !== undefined && row.approvedAmountFen !== null">
              ¥{{ (row.approvedAmountFen / 100).toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="退款原因" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.reasonSummary || row.reason || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="退款状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" round>
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="渠道状态" width="150">
          <template #default="{ row }">
            <div>{{ row.lastProviderStatus || '-' }}</div>
            <el-text v-if="refundNeedsProviderQuery(row)" type="danger" size="small">核对渠道，勿重提</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right" align="center">
          <template #default="{ row }">
            <AdminListActions :show-more="refundNeedsProviderQuery(row)">
              <AdminListAction label="详情" icon="View" @click="viewDetail(row)" />
              <AdminListAction v-if="row.status === 'pending'" label="审核退款" icon="DocumentChecked" @click="openApprovalDialog(row)" />
              <template #more>
                <el-dropdown-item
                v-if="refundNeedsProviderQuery(row)"
                :disabled="providerQueryingId === row.id"
                @click="queryProviderRefund(row)"
              >
                查渠道
              </el-dropdown-item>
              </template>
            </AdminListActions>
          </template>
        </el-table-column>
      </AdminListTable>

      <!-- 移动端卡片列表 -->
      <div v-else v-loading="loading" class="refund-cards">
        <div v-for="row in refunds" :key="row.id" class="refund-card">
          <div class="refund-card__header">
            <div>
              <div class="refund-card__refund-no">{{ row.refundNo }}</div>
              <div class="refund-card__order-no">订单: {{ row.orderNo }}</div>
            </div>
            <el-tag :type="getStatusType(row.status)" effect="light" round size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </div>

          <div class="refund-card__meta">
            <div class="refund-card__meta-item">
              <span class="refund-card__meta-label">用户</span>
              <span>{{ row.user?.nickname || row.userName || '-' }}</span>
            </div>
            <div class="refund-card__meta-item">
              <span class="refund-card__meta-label">申请金额</span>
              <span>¥{{ (row.requestAmountFen / 100).toFixed(2) }}</span>
            </div>
            <div class="refund-card__meta-item">
              <span class="refund-card__meta-label">批准金额</span>
              <span>
                <span v-if="row.approvedAmountFen !== undefined && row.approvedAmountFen !== null">
                  ¥{{ (row.approvedAmountFen / 100).toFixed(2) }}
                </span>
                <span v-else>-</span>
              </span>
            </div>
            <div class="refund-card__meta-item">
              <span class="refund-card__meta-label">原因</span>
              <span>{{ row.reasonSummary || row.reason || '-' }}</span>
            </div>
          </div>

          <div class="refund-card__footer">
            <div class="refund-card__time">{{ formatDate(row.createdAt) }}</div>
            <div class="refund-card__actions">
              <el-button type="primary" link size="small" @click="viewDetail(row)">
                详情
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                link
                size="small"
                @click="openApprovalDialog(row)"
              >
                审批
              </el-button>
              <el-button
                v-if="refundNeedsProviderQuery(row)"
                type="warning"
                link
                size="small"
                :loading="providerQueryingId === row.id"
                @click="queryProviderRefund(row)"
              >
                查渠道
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="isMobile && !loading && !listError && refunds.length === 0" description="暂无退款数据" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <AdminListPagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
      :disabled="loading" @change="loadList" />
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="退款详情" width="min(880px, calc(100vw - 32px))" class="refund-detail-dialog" :close-on-click-modal="false" :destroy-on-close="true">
      <div v-if="currentRefund" class="refund-detail-panel">
        <div class="refund-overview">
          <div>
            <el-tag :type="getStatusType(currentRefund.status)" effect="light">{{ getStatusText(currentRefund.status) }}</el-tag>
            <p class="refund-overview__hint">{{ currentRefund.status === 'pending' ? '请核对申请原因和金额，再决定是否批准退款。' : currentRefund.status === 'success' ? '微信渠道已确认退款成功，用户可在原支付账单查看退款详情。' : currentRefund.status === 'processing' ? '微信正在处理退款，可查询渠道结果，请勿重复发起退款。' : currentRefund.status === 'rejected' ? '申请已拒绝，用户可查看拒绝原因。' : '请核对处理记录与微信渠道结果。' }}</p>
          </div>
          <div class="refund-overview__amount"><span>申请退款金额</span><strong>¥{{ (currentRefund.requestAmountFen / 100).toFixed(2) }}</strong></div>
        </div>

        <div class="refund-detail-grid">
          <section class="refund-detail-section">
            <h3>申请信息</h3>
            <dl>
              <dt>退款单号</dt><dd class="refund-identifier">{{ currentRefund.refundNo }}</dd>
              <dt>关联订单</dt><dd class="refund-identifier">{{ currentRefund.orderNo || '-' }}</dd>
              <dt>申请时间</dt><dd>{{ formatDate(currentRefund.createdAt) }}</dd>
              <dt>申请用户</dt><dd>{{ currentRefund.user?.nickname || currentRefund.userName || '-' }}<span class="refund-secondary">{{ currentRefund.user?.phoneMasked || currentRefund.userPhone || '-' }}</span></dd>
            </dl>
          </section>
          <section class="refund-detail-section">
            <h3>退款处理</h3>
            <dl>
              <dt>批准金额</dt><dd>{{ currentRefund.approvedAmountFen != null ? `¥${(currentRefund.approvedAmountFen / 100).toFixed(2)}` : '尚未批准' }}</dd>
              <dt>渠道记录</dt><dd>{{ providerStatusText(currentRefund.lastProviderStatus) }}</dd>
              <dt>提交时间</dt><dd>{{ currentRefund.lastAttemptAt ? formatDate(currentRefund.lastAttemptAt) : '尚未提交' }}</dd>
              <dt>完成时间</dt><dd>{{ currentRefund.completedAt ? formatDate(currentRefund.completedAt) : '尚未完成' }}</dd>
              <dt v-if="currentRefund.wechatRefundId">微信退款单号</dt><dd v-if="currentRefund.wechatRefundId" class="refund-identifier">{{ currentRefund.wechatRefundId }}</dd>
            </dl>
          </section>
          <section class="refund-detail-section refund-detail-section--wide">
            <h3>退款原因</h3>
            <div class="refund-note">{{ currentRefund.reason || '-' }}</div>
            <div v-if="currentRefund.rejectionReason" class="refund-note refund-note--danger"><strong>拒绝原因</strong>{{ currentRefund.rejectionReason }}</div>
            <div v-if="currentRefund.remark" class="refund-note"><strong>审核备注</strong>{{ currentRefund.remark }}</div>
          </section>
        </div>
        <el-alert v-if="refundNeedsProviderQuery(currentRefund)" type="warning" :closable="false" show-icon title="退款结果尚未同步完成，请查询微信渠道状态；不要重复发起退款。" />
        <el-collapse v-if="currentRefund.events?.length" class="refund-history">
          <el-collapse-item name="history" :title="`处理记录 · ${currentRefund.events.length} 条`">
            <el-timeline>
              <el-timeline-item v-for="event in currentRefund.events" :key="event.id" :timestamp="formatDate(event.createdAt)" placement="top">
                <div class="refund-history__title">{{ eventLabel(event.eventType) }}<span>{{ eventActorLabel(event) }}</span></div>
                <div class="refund-history__status">{{ event.fromStatus ? getStatusText(event.fromStatus) : '新建' }} → {{ getStatusText(event.toStatus) }}<span v-if="event.providerStatus"> · {{ providerStatusText(event.providerStatus) }}</span></div>
                <div v-if="event.detail" class="refund-history__note">{{ event.detail }}</div>
              </el-timeline-item>
            </el-timeline>
          </el-collapse-item>
        </el-collapse>
      </div>
      <template #footer>
        <div class="refund-detail-footer">
          <el-button :disabled="!currentRefund || providerQueryingId !== null" @click="currentRefund && viewDetail(currentRefund)">刷新状态</el-button>
          <div>
            <el-button @click="detailDialogVisible = false">关闭</el-button>
            <el-button v-if="currentRefund && refundNeedsProviderQuery(currentRefund)" type="primary" :loading="providerQueryingId === currentRefund.id" @click="queryProviderRefund(currentRefund)">查询微信结果</el-button>
            <el-button v-if="currentRefund?.status === 'pending'" type="primary" @click="detailDialogVisible = false; openApprovalDialog(currentRefund)">审核退款</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 审批对话框 -->
    <el-dialog v-model="approvalDialogVisible" title="审批退款" width="500px" @close="resetApprovalForm">
      <div v-if="currentRefund" class="approval-content">
        <div class="approval-info">
          <div class="info-row">
            <span class="info-label">退款号</span>
            <span class="info-value">{{ currentRefund.refundNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">订单号</span>
            <span class="info-value">{{ currentRefund.orderNo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">申请金额</span>
            <span class="info-value">¥{{ (currentRefund.requestAmountFen / 100).toFixed(2) }}</span>
          </div>
        </div>

        <el-divider />

        <div class="approval-reason">
          <div class="approval-label">退款原因</div>
          <div class="approval-reason-text">{{ currentRefund.reason || '-' }}</div>
        </div>

        <el-divider />

        <el-form ref="approvalFormRef" :model="approvalForm" label-width="100px">
          <el-form-item label="审批意见" required>
            <el-radio-group v-model="approvalForm.decision">
              <el-radio value="approve">批准</el-radio>
              <el-radio value="reject">拒绝</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="approvalForm.decision === 'approve'" label="退款金额">
            <span>整单退款：¥{{ (currentRefund.requestAmountFen / 100).toFixed(2) }}</span>
          </el-form-item>

          <el-form-item v-if="approvalForm.decision === 'reject'" label="拒绝原因" required>
            <el-input
              v-model="approvalForm.rejectionReason"
              type="textarea"
              placeholder="请输入拒绝原因..."
              :rows="3"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="备注">
            <el-input
              v-model="approvalForm.remark"
              type="textarea"
              placeholder="可选备注信息..."
              :rows="2"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="approvalDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="approvalLoading"
            @click="submitApproval"
          >
            确认提交
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import AdminListAction from '@/components/AdminListAction.vue'
import AdminListActions from '@/components/AdminListActions.vue'
import AdminListTable from '@/components/AdminListTable.vue'
import AdminListToolbar from '@/components/AdminListToolbar.vue'
import AdminListPagination from '@/components/AdminListPagination.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { refundApi, type Refund } from '@/api/refund'

const listError = ref('')


const refunds = ref<Refund[]>([])
const loading = ref(false)
const approvalLoading = ref(false)
const providerQueryingId = ref<number | null>(null)
const keyword = ref('')
const statusFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 详情对话框
const detailDialogVisible = ref(false)
const currentRefund = ref<Refund | null>(null)

// 审批对话框
const approvalDialogVisible = ref(false)
const approvalFormRef = ref()
const approvalForm = ref({
  decision: '',
  rejectionReason: '',
  remark: '',
})

// 移动端检测
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)

const updateWidth = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))

// 状态映射
const statusMap: Record<string, { text: string; type: string }> = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已批准', type: 'success' },
  rejected: { text: '已拒绝', type: 'danger' },
  processing: { text: '处理中', type: 'info' },
  success: { text: '退款成功', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  failed: { text: '失败', type: 'danger' },
}

const getStatusText = (status: string): string => statusMap[status]?.text || status
const getStatusType = (status: string): string => statusMap[status]?.type || 'info'

const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')
const eventLabel = (type: string): string => ({
  request_submitted: '用户提交申请',
  approved: '管理员批准',
  rejected: '管理员拒绝',
  provider_request_accepted: '渠道受理',
  provider_result_unknown: '渠道结果未知',
  provider_notification: '渠道通知',
  provider_query: '渠道查单',
}[type] || type)
const providerStatusText = (status?: string): string => ({
  SUBMITTED: '已提交，等待结果', PROCESSING: '微信处理中', SUCCESS: '微信退款成功',
  CLOSED: '渠道已关闭', ABNORMAL: '渠道退款异常', UNKNOWN: '结果未知',
}[status || ''] || status || '尚无渠道记录')
const eventActorLabel = (event: NonNullable<Refund['events']>[number]): string => {
  if (event.actorType === 'admin') return `管理员 #${event.actorId ?? '-'}`
  if (event.actorType === 'user') return '用户'
  return event.actorType === 'wechat' ? '微信支付' : '系统'
}
const refundNeedsProviderQuery = (refund: Refund): boolean =>
  refund.status === 'processing' &&
  (
    refund.lastErrorCode === 'provider_result_unknown' ||
    ['SUBMITTED', 'PROCESSING', 'UNKNOWN', 'CLOSED', 'ABNORMAL', 'SUCCESS'].includes(refund.lastProviderStatus || '')
  )

const loadList = async (): Promise<void> => {
  loading.value = true
  listError.value = ''
  try {
    const data = await refundApi.listRefunds({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      status: statusFilter.value || undefined,
      startDate: dateRange.value?.[0].toISOString().split('T')[0],
      endDate: dateRange.value?.[1].toISOString().split('T')[0],
    })
    refunds.value = data.list
    total.value = data.total
  } catch {
    listError.value = '列表加载失败，请重试'
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
  statusFilter.value = ''
  dateRange.value = null
  page.value = 1
  loadList()
}

const viewDetail = async (row: Refund): Promise<void> => {
  try {
    currentRefund.value = await refundApi.getRefund(row.id)
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取退款详情失败')
  }
}

const queryProviderRefund = async (row: Refund): Promise<void> => {
  providerQueryingId.value = row.id
  try {
    const result = await refundApi.queryProviderRefund(row.id)
    if (currentRefund.value?.id === row.id) currentRefund.value = result
    await loadList()
    ElMessage.success(
      result.status === 'success'
        ? '渠道确认退款成功，账务已更新'
        : `已记录渠道状态：${result.lastProviderStatus || '未知'}；请勿重复提交退款`
    )
  } catch {
    ElMessage.error('渠道查单失败，结果可能未知；请勿重复提交退款')
    await loadList()
  } finally {
    providerQueryingId.value = null
  }
}

const openApprovalDialog = async (row: Refund): Promise<void> => {
  try {
    currentRefund.value = await refundApi.getRefund(row.id)
    resetApprovalForm()
    approvalDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取退款详情失败')
  }
}

const resetApprovalForm = (): void => {
  approvalForm.value = {
    decision: '',
    rejectionReason: '',
    remark: '',
  }
}

const submitApproval = async (): Promise<void> => {
  if (!currentRefund.value) return
  if (!approvalForm.value.decision) {
    ElMessage.warning('请选择审批意见')
    return
  }

  if (approvalForm.value.decision === 'reject' && !approvalForm.value.rejectionReason.trim()) {
    ElMessage.warning('拒绝时必须填写拒绝原因')
    return
  }

  approvalLoading.value = true
  try {
    if (approvalForm.value.decision === 'approve') {
      const result = await refundApi.approveRefund(currentRefund.value.id, {
        approved: true,
        adminNote: approvalForm.value.remark || undefined,
      })
      ElMessage.warning(
        result.lastErrorCode === 'provider_result_unknown'
          ? '渠道结果未知，请先核对退款单，不要重复提交'
          : '退款申请已提交，等待渠道确认'
      )
    } else {
      await refundApi.rejectRefund(currentRefund.value.id, {
        rejectReason: approvalForm.value.rejectionReason,
      })
      ElMessage.success('已拒绝退款')
    }

    approvalDialogVisible.value = false
    loadList()
  } catch (error) {
    ElMessage.error('审批失败，请重试')
  } finally {
    approvalLoading.value = false
  }
}

const route = useRoute()
onMounted(async () => {
  await loadList()
  const id = Number(route.query.refundId)
  if (!Number.isSafeInteger(id) || id <= 0) return
  try {
    currentRefund.value = await refundApi.getRefund(id)
    if (currentRefund.value.status === 'pending') {
      resetApprovalForm()
      approvalDialogVisible.value = true
    } else {
      detailDialogVisible.value = true
    }
  } catch {
    ElMessage.error('获取退款详情失败')
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
.refund-detail-panel { max-height: 65vh; overflow-y: auto; padding-right: 6px; }
.refund-overview { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; padding: 24px; margin-bottom: 20px; border-radius: 12px; background: #f6f8fb; }
.refund-overview__hint { margin: 12px 0 0; color: #667085; font-size: 13px; line-height: 1.7; max-width: 440px; }
.refund-overview__amount { flex-shrink: 0; text-align: right; }
.refund-overview__amount span { display: block; color: #667085; font-size: 12px; }
.refund-overview__amount strong { display: block; margin-top: 8px; font-size: 32px; font-weight: 600; color: #101828; font-variant-numeric: tabular-nums; }
.refund-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
.refund-detail-section { padding: 20px; border: 1px solid #e4e7ed; border-radius: 10px; }
.refund-detail-section--wide { grid-column: 1 / -1; }
.refund-detail-section h3 { margin: 0 0 18px; font-size: 14px; font-weight: 600; color: #101828; }
.refund-detail-section dl { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 14px 12px; margin: 0; font-size: 13px; line-height: 1.6; }
.refund-detail-section dt { color: #667085; }
.refund-detail-section dd { margin: 0; color: #344054; overflow-wrap: anywhere; }
.refund-secondary { display: block; color: #98a2b3; font-size: 12px; }
.refund-identifier { font-variant-numeric: tabular-nums; }
.refund-note { padding: 12px 14px; border-radius: 6px; background: #f8fafc; color: #344054; font-size: 13px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
.refund-note + .refund-note { margin-top: 12px; }
.refund-note strong { display: block; margin-bottom: 4px; }
.refund-note--danger { background: #fef3f2; color: #b42318; }
.refund-history { margin-top: 18px; }
.refund-history :deep(.el-timeline) { padding: 12px 6px 0; }
.refund-history__title { color: #344054; font-weight: 600; }
.refund-history__title span { margin-left: 12px; font-size: 12px; color: #98a2b3; font-weight: 400; }
.refund-history__status, .refund-history__note { margin-top: 6px; font-size: 12px; color: #667085; line-height: 1.6; overflow-wrap: anywhere; }
.refund-detail-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
@media (max-width: 640px) {
  .refund-detail-grid { grid-template-columns: minmax(0, 1fr); }
  .refund-overview { padding: 16px; gap: 16px; flex-direction: column; }
  .refund-overview__amount { text-align: left; }
  .refund-detail-section { padding: 16px; }
  .refund-detail-footer { flex-wrap: wrap; }
}


.refund-mgr {
  display: flex;
  flex-direction: column;
  gap: $space-16;
}

.refund-cards {
  display: flex;
  flex-direction: column;
  gap: $space-12;
  min-height: 60px;
}

.refund-card {
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-16;
  display: flex;
  flex-direction: column;
  gap: $space-12;
  transition: all $transition-base;

  &:active {
    border-color: $color-primary;
    box-shadow: $shadow-md;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $space-12;
  }

  &__refund-no {
    font-size: $font-size-md;
    font-weight: 600;
    color: $color-text;
    line-height: 1.4;
  }

  &__order-no {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    margin-top: $space-2;
  }

  &__meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $space-12;
    padding: $space-12 0;
    border-top: 1px solid $color-border;
    border-bottom: 1px solid $color-border;
  }

  &__meta-item {
    display: flex;
    flex-direction: column;
    gap: $space-4;
  }

  &__meta-label {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    font-weight: 600;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: $space-12;
    border-top: 1px solid $color-border;
  }

  &__time {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }

  &__actions {
    display: flex;
    gap: $space-8;

    :deep(.el-button) {
      font-size: $font-size-xs;
    }
  }
}

.approval-content {
  padding: $space-12 0;
}

.approval-info {
  display: flex;
  flex-direction: column;
  gap: $space-12;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $space-16;
}

.info-label {
  flex: 0 0 auto;
  width: 80px;
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

.info-value {
  flex: 1;
  color: $color-text;
  font-size: $font-size-sm;
  font-weight: 500;
}

.approval-reason {
  display: flex;
  flex-direction: column;
  gap: $space-8;
}

.approval-label {
  color: $color-text-secondary;
  font-size: $font-size-sm;
  font-weight: 600;
}

.approval-reason-text {
  color: $color-text;
  font-size: $font-size-sm;
  line-height: 1.6;
  padding: $space-12;
  background: $color-surface-soft;
  border-radius: $radius-md;
  white-space: pre-wrap;
  word-break: break-all;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: $space-8;

  .amount-prefix {
    color: $color-text;
    font-weight: 600;
  }

  :deep(.el-input-number) {
    flex: 1;
  }
}

.amount-hint {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  margin-top: $space-4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: $space-12;
}

/* ── 平板端 ── */
@media (max-width: 1024px) {
  .toolbar {
    padding: $space-12;

    &__filters {
      gap: $space-10;
    }

    &__search {
      width: 100%;
      min-width: unset;

      :deep(.el-button) {
        white-space: nowrap;
      }
    }
  }
}

/* ── 移动端 ── */
@media (max-width: 767px) {
  .refund-mgr {
    gap: $space-12;
  }

  .toolbar {
    padding: $space-12;

    &__filters {
      flex-direction: column;
      align-items: stretch;
      gap: $space-10;
    }

    &__search {
      flex-direction: column;
      width: 100%;
      min-width: unset;

      :deep(.el-input),
      :deep(.el-button) {
        width: 100%;
      }
    }
  }

  .refund-card {
    padding: $space-12;
    gap: $space-10;

    &__meta {
      gap: $space-10;
    }
  }

  .pagination-wrapper {
    padding: $space-12;
    justify-content: center;
  }

  :deep(.el-dialog) {
    --el-dialog-width: 95vw;
  }
}
</style>
