<template>
  <div class="refund-mgr">
    <!-- 工具栏 -->
    <div class="toolbar">
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
    </div>

    <!-- 表格容器 -->
    <div class="table-wrapper">
      <!-- 桌面端表格 -->
      <el-table
        v-if="!isMobile"
        :data="refunds"
        v-loading="loading"
        stripe
        style="width: 100%"
        row-key="id"
      >
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
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" link size="small" @click="viewDetail(row)">
                详情
              </el-button>
              <el-divider v-if="row.status === 'pending'" direction="vertical" />
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                link
                size="small"
                @click="openApprovalDialog(row)"
              >
                审批
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

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
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!loading && refunds.length === 0" description="暂无退款数据" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadList"
        @size-change="loadList"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="退款详情" width="600px">
      <div v-if="currentRefund" class="detail-content">
        <div class="detail-group">
          <div class="detail-row">
            <span class="detail-label">退款号</span>
            <span class="detail-value">{{ currentRefund.refundNo }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">订单号</span>
            <span class="detail-value">{{ currentRefund.orderNo }}</span>
          </div>
        </div>

        <el-divider />

        <div class="detail-group">
          <div class="detail-label">用户信息</div>
          <div class="detail-row">
            <span class="detail-label">昵称</span>
            <span class="detail-value">{{ currentRefund.user?.nickname || currentRefund.userName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">手机号</span>
            <span class="detail-value">{{ currentRefund.user?.phoneMasked || currentRefund.userPhone }}</span>
          </div>
        </div>

        <el-divider />

        <div class="detail-group">
          <div class="detail-label">金额信息</div>
          <div class="detail-row">
            <span class="detail-label">申请金额</span>
            <span class="detail-value">¥{{ (currentRefund.requestAmountFen / 100).toFixed(2) }}</span>
          </div>
          <div class="detail-row" v-if="currentRefund.approvedAmountFen !== undefined && currentRefund.approvedAmountFen !== null">
            <span class="detail-label">批准金额</span>
            <span class="detail-value">¥{{ (currentRefund.approvedAmountFen / 100).toFixed(2) }}</span>
          </div>
        </div>

        <el-divider />

        <div class="detail-group">
          <div class="detail-label">状态信息</div>
          <div class="detail-row">
            <span class="detail-label">退款状态</span>
            <span class="detail-value">
              <el-tag :type="getStatusType(currentRefund.status)" effect="light" round>
                {{ getStatusText(currentRefund.status) }}
              </el-tag>
            </span>
          </div>
          <div class="detail-row" v-if="currentRefund.rejectionReason">
            <span class="detail-label">拒绝原因</span>
            <span class="detail-value">{{ currentRefund.rejectionReason }}</span>
          </div>
        </div>

        <el-divider />

        <div class="detail-group">
          <div class="detail-label">退款原因</div>
          <div class="detail-reason">
            {{ currentRefund.reason || '-' }}
          </div>
        </div>

        <el-divider v-if="currentRefund.remark" />

        <div v-if="currentRefund.remark" class="detail-group">
          <div class="detail-label">备注</div>
          <div class="detail-reason">
            {{ currentRefund.remark }}
          </div>
        </div>
      </div>
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

          <el-form-item v-if="approvalForm.decision === 'approve'" label="批准金额" required>
            <div class="amount-input">
              <span class="amount-prefix">¥</span>
              <el-input-number
                v-model="approvalForm.approvedAmount"
                :precision="2"
                :min="0"
                :max="currentRefund.requestAmountFen / 100"
                :step="0.01"
                style="width: 100%"
              />
            </div>
            <div class="amount-hint">
              最大可批准: ¥{{ (currentRefund.requestAmountFen / 100).toFixed(2) }}
            </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { refundApi, type Refund } from '@/api/refund'

const refunds = ref<Refund[]>([])
const loading = ref(false)
const approvalLoading = ref(false)
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
  approvedAmount: 0,
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
  completed: { text: '已完成', type: 'success' },
  failed: { text: '失败', type: 'danger' },
}

const getStatusText = (status: string): string => statusMap[status]?.text || status
const getStatusType = (status: string): string => statusMap[status]?.type || 'info'

const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

const loadList = async (): Promise<void> => {
  loading.value = true
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
    approvedAmount: currentRefund.value?.requestAmountFen ? currentRefund.value.requestAmountFen / 100 : 0,
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

  if (approvalForm.value.decision === 'approve' && approvalForm.value.approvedAmount === 0) {
    ElMessage.warning('请输入批准金额')
    return
  }

  if (approvalForm.value.decision === 'reject' && !approvalForm.value.rejectionReason.trim()) {
    ElMessage.warning('拒绝时必须填写拒绝原因')
    return
  }

  approvalLoading.value = true
  try {
    if (approvalForm.value.decision === 'approve') {
      await refundApi.approveRefund(currentRefund.value.id, {
        approvedAmountFen: Math.round(approvalForm.value.approvedAmount * 100),
        remark: approvalForm.value.remark || undefined,
      })
      ElMessage.success('已批准退款')
    } else {
      await refundApi.rejectRefund(currentRefund.value.id, {
        rejectionReason: approvalForm.value.rejectionReason,
        remark: approvalForm.value.remark || undefined,
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

onMounted(loadList)
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.refund-mgr {
  display: flex;
  flex-direction: column;
  gap: $space-16;
}

.toolbar {
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-20;

  &__filters {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex-wrap: wrap;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex: 1;
    min-width: 300px;

    :deep(.el-input) {
      .el-input__wrapper {
        background: $color-surface-soft;
        border-color: $color-border;

        &:hover {
          border-color: $color-primary;
        }
      }
    }
  }
}

.table-wrapper {
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;

  :deep(.el-table) {
    --el-table-border-color: #{$color-border};
    --el-table-header-bg-color: #{$color-surface-soft};
    --el-table-header-text-color: #{$color-text};
    --el-table-row-hover-bg-color: #{$color-bg-hover};

    thead {
      background: $color-surface-soft;

      th {
        background: $color-surface-soft;
        font-weight: 600;
        color: $color-text;
        border-bottom: 1px solid $color-border;
      }
    }

    tbody tr {
      &:hover > td {
        background: $color-bg-hover !important;
      }
    }
  }
}

.table-actions {
  display: flex;
  align-items: center;
  gap: $space-8;

  :deep(.el-button) {
    padding: 0;
    height: auto;
    font-size: $font-size-sm;

    &.is-link {
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  :deep(.el-divider--vertical) {
    margin: 0 $space-6;
    background-color: $color-border;
  }
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

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: $space-16;
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;

  :deep(.el-pagination) {
    --el-pagination-font-size: #{$font-size-sm};
    --el-pagination-bg-color: transparent;
    --el-pagination-button-bg-color: #{$color-surface-soft};
    --el-pagination-button-disabled-bg-color: #{$color-bg};
  }
}

.detail-content {
  padding: $space-12 0;
}

.detail-group {
  display: flex;
  flex-direction: column;
  gap: $space-12;

  .detail-label:first-child {
    font-weight: 600;
    color: $color-text;
    margin-bottom: $space-8;
  }
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $space-16;
}

.detail-label {
  flex: 0 0 auto;
  width: 100px;
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

.detail-value {
  flex: 1;
  color: $color-text;
  font-size: $font-size-sm;
  word-break: break-all;
}

.detail-reason {
  color: $color-text;
  font-size: $font-size-sm;
  line-height: 1.6;
  padding: $space-12;
  background: $color-surface-soft;
  border-radius: $radius-md;
  white-space: pre-wrap;
  word-break: break-all;
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
