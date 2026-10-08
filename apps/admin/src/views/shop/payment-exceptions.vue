<template>
  <section class="exceptions">
    <div class="toolbar">
      <el-select v-model="status" clearable placeholder="全部状态" @change="load">
        <el-option label="待核查" value="pending_review" />
      </el-select>
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" row-key="id">
      <el-table-column prop="outTradeNo" label="商户订单号" min-width="170" />
      <el-table-column prop="wechatTransactionId" label="微信交易号" min-width="190" />
      <el-table-column label="金额" width="110" align="right">
        <template #default="{ row }">¥{{ (row.amountFen / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="订单状态" width="150">
        <template #default="{ row }">{{ row.order.status }} / {{ row.order.paymentStatus }}</template>
      </el-table-column>
      <el-table-column label="异常状态" width="110">
        <template #default="{ row }"><el-tag type="warning">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="核查结果" width="120">
        <template #default="{ row }">{{ resultLabel(row.reviews[0]?.channelCheckResult) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="发生时间" min-width="170" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openReview(row)">记录核查</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @change="load"
    />
    <el-dialog v-model="dialogVisible" title="记录渠道核查" width="520px">
      <div v-if="selected" class="review-context">
        <div>订单：{{ selected.order.orderNo }}</div>
        <div>微信交易号：{{ selected.wechatTransactionId }}</div>
        <div>当前异常状态：{{ selected.status }}（记录核查不会关闭异常或变更账务）</div>
        <div v-for="(review, index) in selected.reviews" :key="`${review.createdAt}-${index}`" class="review-history">
          {{ review.createdAt }} · {{ resultLabel(review.channelCheckResult) }} · 管理员 {{ review.reviewedByAdminId }}
          <div>{{ review.resolutionNote }}</div>
        </div>
      </div>
      <el-form label-position="top">
        <el-form-item label="渠道核对结果" required>
          <el-select v-model="form.channelCheckResult" style="width: 100%">
            <el-option label="渠道确认已支付" value="paid" />
            <el-option label="渠道确认已退款" value="refunded" />
            <el-option label="渠道确认已关闭" value="closed" />
            <el-option label="渠道查无记录" value="not_found" />
            <el-option label="结果仍未知" value="unknown" />
          </el-select>
        </el-form-item>
        <el-form-item label="核查说明 / 证据摘要" required>
          <el-input v-model="form.resolutionNote" type="textarea" :rows="4" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveReview">保存核查记录</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { paymentExceptionApi, type ChannelCheckResult, type PaymentException } from '@/api/payment-exception'

const rows = ref<PaymentException[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref('')
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const selected = ref<PaymentException>()
const form = reactive<{ channelCheckResult: ChannelCheckResult; resolutionNote: string }>({
  channelCheckResult: 'unknown',
  resolutionNote: '',
})

async function load() {
  loading.value = true
  try {
    const result = await paymentExceptionApi.list({
      page: page.value,
      pageSize: pageSize.value,
      ...(status.value ? { status: status.value } : {}),
    })
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function openReview(row: PaymentException) {
  selected.value = row
  form.channelCheckResult = row.reviews[0]?.channelCheckResult || 'unknown'
  form.resolutionNote = ''
  dialogVisible.value = true
}

async function saveReview() {
  if (!selected.value || !form.resolutionNote.trim()) {
    ElMessage.warning('请填写核查说明')
    return
  }
  saving.value = true
  try {
    await paymentExceptionApi.review(selected.value.id, {
      channelCheckResult: form.channelCheckResult,
      resolutionNote: form.resolutionNote,
    })
    ElMessage.success('核查记录已保存，异常仍需后续处理')
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

function resultLabel(result?: ChannelCheckResult) {
  return ({ paid: '已支付', refunded: '已退款', closed: '已关闭', not_found: '无记录', unknown: '未知' } as const)[result || 'unknown']
}

onMounted(load)
</script>

<style scoped>
.exceptions { display: grid; gap: 16px; }
.toolbar { display: flex; justify-content: flex-end; gap: 8px; }
.review-context { display: grid; gap: 8px; margin-bottom: 18px; color: #606266; overflow-wrap: anywhere; }
.review-history { padding-top: 8px; border-top: 1px solid #ebeef5; }
</style>
