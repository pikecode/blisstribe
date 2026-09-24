<template>
  <div class="order-mgr">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar__filters">
        <!-- 搜索 -->
        <div class="toolbar__search">
          <el-input
            v-model="keyword"
            placeholder="搜索订单号、用户昵称、手机号..."
            clearable
            prefix-icon="Search"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </div>

        <!-- 状态筛选 -->
        <el-select
          v-model="statusFilter"
          placeholder="订单状态"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option label="待支付" value="pending_payment" />
          <el-option label="确认支付状态中" value="closing" />
          <el-option label="已支付" value="paid" />
          <el-option label="处理中" value="processing" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>

        <!-- 支付状态筛选 -->
        <el-select
          v-model="paymentStatusFilter"
          placeholder="支付状态"
          clearable
          style="width: 120px"
          @change="handleSearch"
        >
          <el-option label="未支付" value="unpaid" />
          <el-option label="已支付" value="paid" />
          <el-option label="已退款" value="refunded" />
        </el-select>

        <!-- 履约状态筛选 -->
        <el-select
          v-model="fulfillmentStatusFilter"
          placeholder="履约状态"
          clearable
          style="width: 120px"
          @change="handleSearch"
        >
          <el-option label="待处理" value="pending" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已完成" value="completed" />
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
      <el-table
        :data="orders"
        v-loading="loading"
        stripe
        style="width: 100%"
        row-key="id"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="orderNo" label="订单号" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              {{ row.orderNo }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="140">
          <template #default="{ row }">
            <div>
              <div>{{ row.user?.nickname || '-' }}</div>
              <div style="color: #909399; font-size: 12px">{{ row.user?.phoneMasked || '-' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="订单金额" width="100" align="right">
          <template #default="{ row }">
            ¥{{ (row.totalAmountFen / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="支付状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getPaymentStatusType(row.paymentStatus)" effect="light" round>
              {{ getPaymentStatusText(row.paymentStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="履约状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getFulfillmentStatusType(row.fulfillmentStatus)" effect="light" round>
              {{ getFulfillmentStatusText(row.fulfillmentStatus) }}
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
              <el-button type="primary" link size="small" @click="viewDetail(row)">查看</el-button>
              <el-divider direction="vertical" />
              <el-button
                v-if="row.paymentStatus === 'paid' && row.fulfillmentStatus === 'pending'"
                type="success"
                link
                size="small"
                @click="openShipDialog(row)"
              >
                发货
              </el-button>
              <el-button
                v-if="row.status === 'pending_payment'"
                type="danger"
                link
                size="small"
                @click="cancelOrderConfirm(row)"
              >
                取消
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && orders.length === 0" description="暂无订单数据" />
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadOrders"
        @size-change="loadOrders"
      />
    </div>

    <!-- 订单详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="订单详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedOrder" class="order-detail">
        <!-- 基本信息 -->
        <el-divider>基本信息</el-divider>
        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">订单号</div>
            <div class="detail-value">{{ selectedOrder.orderNo }}</div>
          </div>
          <div class="detail-col">
            <div class="detail-label">订单状态</div>
            <div class="detail-value">
              <el-tag :type="getOrderStatusType(selectedOrder.status)" effect="light">
                {{ getOrderStatusText(selectedOrder.status) }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">支付状态</div>
            <div class="detail-value">
              <el-tag :type="getPaymentStatusType(selectedOrder.paymentStatus)" effect="light">
                {{ getPaymentStatusText(selectedOrder.paymentStatus) }}
              </el-tag>
            </div>
          </div>
          <div class="detail-col">
            <div class="detail-label">履约状态</div>
            <div class="detail-value">
              <el-tag :type="getFulfillmentStatusType(selectedOrder.fulfillmentStatus)" effect="light">
                {{ getFulfillmentStatusText(selectedOrder.fulfillmentStatus) }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">创建时间</div>
            <div class="detail-value">{{ formatDate(selectedOrder.createdAt) }}</div>
          </div>
          <div class="detail-col">
            <div class="detail-label">支付时间</div>
            <div class="detail-value">{{ selectedOrder.paidAt ? formatDate(selectedOrder.paidAt) : '-' }}</div>
          </div>
        </div>

        <!-- 用户信息 -->
        <el-divider>用户信息</el-divider>
        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">用户昵称</div>
            <div class="detail-value">{{ selectedOrder.user?.nickname || '-' }}</div>
          </div>
          <div class="detail-col">
            <div class="detail-label">手机号</div>
            <div class="detail-value">{{ selectedOrder.user?.phoneMasked || '-' }}</div>
          </div>
        </div>

        <!-- 收货信息 -->
        <el-divider>收货信息</el-divider>
        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">收货人</div>
            <div class="detail-value">{{ selectedOrder.receiverName || '-' }}</div>
          </div>
          <div class="detail-col">
            <div class="detail-label">收货电话</div>
            <div class="detail-value">{{ selectedOrder.receiverPhone || '-' }}</div>
          </div>
        </div>

        <div class="detail-row full-width">
          <div class="detail-label">收货地址</div>
          <div class="detail-value">{{ selectedOrder.shippingAddress || '-' }}</div>
        </div>

        <div class="detail-row full-width">
          <div class="detail-label">物流单号</div>
          <div class="detail-value">{{ selectedOrder.trackingNo || '-' }}</div>
        </div>

        <!-- 订单商品 -->
        <el-divider>订单商品</el-divider>
        <el-table :data="selectedOrder.items" stripe size="small">
          <el-table-column prop="productName" label="商品名称" min-width="150" />
          <el-table-column label="单价" width="100" align="right">
            <template #default="{ row }">
              ¥{{ (row.unitPriceFen / 100).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" align="center" />
          <el-table-column label="小计" width="100" align="right">
            <template #default="{ row }">
              ¥{{ (row.subtotalFen / 100).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>

        <!-- 金额信息 -->
        <el-divider>金额信息</el-divider>
        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">订单总额</div>
            <div class="detail-value">¥{{ (selectedOrder.totalAmountFen / 100).toFixed(2) }}</div>
          </div>
          <div class="detail-col">
            <div class="detail-label">折扣金额</div>
            <div class="detail-value">¥{{ (selectedOrder.discountAmountFen / 100).toFixed(2) }}</div>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-col">
            <div class="detail-label">支付金额</div>
            <div class="detail-value">¥{{ (selectedOrder.paymentAmountFen / 100).toFixed(2) }}</div>
          </div>
          <div class="detail-col">
            <div class="detail-label">已退款金额</div>
            <div class="detail-value">¥{{ (selectedOrder.refundedAmountFen / 100).toFixed(2) }}</div>
          </div>
        </div>

        <!-- 备注 -->
        <div v-if="selectedOrder.remark" class="detail-row full-width">
          <div class="detail-label">备注</div>
          <div class="detail-value">{{ selectedOrder.remark }}</div>
        </div>
      </div>
    </el-dialog>

    <!-- 发货对话框 -->
    <el-dialog
      v-model="shipDialogVisible"
      title="发货"
      width="500px"
      :close-on-click-modal="false"
      @close="resetShipForm"
    >
      <el-form ref="shipFormRef" :model="shipForm" :rules="shipRules" label-width="100px">
        <el-form-item label="物流单号" prop="trackingNo">
          <el-input
            v-model="shipForm.trackingNo"
            placeholder="请输入物流单号"
          />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select v-model="shipForm.logisticsCompany" placeholder="请选择物流公司（可选）" clearable>
            <el-option label="顺丰" value="shunfeng" />
            <el-option label="圆通" value="yuantong" />
            <el-option label="韵达" value="yunda" />
            <el-option label="中通" value="zhongtong" />
            <el-option label="申通" value="shentong" />
            <el-option label="EMS" value="ems" />
            <el-option label="邮政" value="youzheng" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="shipDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmShip" :loading="shipLoading">确认发货</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { shopOrderApi, ShopOrder } from '@/api/shop-order'

interface ShipForm {
  trackingNo: string
  logisticsCompany?: string
}

// 列表数据
const orders = ref<ShopOrder[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 过滤条件
const keyword = ref('')
const statusFilter = ref('')
const paymentStatusFilter = ref('')
const fulfillmentStatusFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)

// 详情对话框
const detailDialogVisible = ref(false)
const selectedOrder = ref<ShopOrder | null>(null)

// 发货对话框
const shipDialogVisible = ref(false)
const shipFormRef = ref<FormInstance>()
const shipLoading = ref(false)
const shipForm = reactive<ShipForm>({
  trackingNo: '',
  logisticsCompany: '',
})

const shipRules = {
  trackingNo: [
    { required: true, message: '物流单号不能为空', trigger: 'blur' },
    { min: 1, max: 100, message: '物流单号长度必须在 1 到 100 之间', trigger: 'blur' },
  ],
}

// 加载订单列表
const loadOrders = async () => {
  loading.value = true
  try {
    const [startDate, endDate] = dateRange.value || [null, null]
    const result = await shopOrderApi.listOrders({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value,
      paymentStatus: paymentStatusFilter.value,
      fulfillmentStatus: fulfillmentStatusFilter.value,
      keyword: keyword.value,
      startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
      endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
    })
    orders.value = result.orders
    total.value = result.total
  } catch (error) {
    ElMessage.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  page.value = 1
  loadOrders()
}

// 重置搜索
const resetSearch = () => {
  keyword.value = ''
  statusFilter.value = ''
  paymentStatusFilter.value = ''
  fulfillmentStatusFilter.value = ''
  dateRange.value = null
  page.value = 1
  loadOrders()
}

// 查看详情
const viewDetail = async (row: ShopOrder) => {
  try {
    selectedOrder.value = await shopOrderApi.getOrder(row.id)
    detailDialogVisible.value = true
  } catch (error) {
    ElMessage.error('加载订单详情失败')
  }
}

// 打开发货对话框
const openShipDialog = (row: ShopOrder) => {
  selectedOrder.value = row
  shipForm.trackingNo = ''
  shipForm.logisticsCompany = ''
  shipDialogVisible.value = true
}

// 确认发货
const confirmShip = async () => {
  await shipFormRef.value?.validate()
  if (!selectedOrder.value) return

  shipLoading.value = true
  try {
    await shopOrderApi.shipOrder(selectedOrder.value.id, {
      trackingNo: shipForm.trackingNo,
      logisticsCompany: shipForm.logisticsCompany,
    })
    ElMessage.success('发货成功')
    shipDialogVisible.value = false
    loadOrders()
  } catch (error) {
    ElMessage.error('发货失败')
  } finally {
    shipLoading.value = false
  }
}

// 重置发货表单
const resetShipForm = () => {
  shipForm.trackingNo = ''
  shipForm.logisticsCompany = ''
  shipFormRef.value?.clearValidate()
}

// 取消订单确认
const cancelOrderConfirm = (row: ShopOrder) => {
  ElMessageBox.confirm('确认取消此订单吗？', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    cancelOrder(row)
  }).catch(() => {
    // 用户取消操作
  })
}

// 取消订单
const cancelOrder = async (order: ShopOrder) => {
  try {
    await shopOrderApi.cancelOrder(order.id, '后台取消')
    ElMessage.success('取消订单成功')
    loadOrders()
  } catch (error) {
    ElMessage.error('取消订单失败')
  }
}

// 状态文本映射
const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending_payment: '待支付',
    closing: '确认支付状态中',
    paid: '已支付',
    processing: '处理中',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

const getOrderStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending_payment: 'warning',
    closing: 'warning',
    paid: 'info',
    processing: 'info',
    shipped: 'success',
    completed: 'success',
    cancelled: 'danger',
  }
  return typeMap[status] || 'info'
}

const getPaymentStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    unpaid: '未支付',
    paid: '已支付',
    refunded: '已退款',
  }
  return statusMap[status] || status
}

const getPaymentStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    unpaid: 'warning',
    paid: 'success',
    refunded: 'info',
  }
  return typeMap[status] || 'info'
}

const getFulfillmentStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    shipped: '已发货',
    completed: '已完成',
  }
  return statusMap[status] || status
}

const getFulfillmentStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    shipped: 'info',
    completed: 'success',
  }
  return typeMap[status] || 'info'
}

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped lang="scss">
.order-mgr {
  padding: 16px;
}

.toolbar {
  margin-bottom: 16px;

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  &__search {
    display: flex;
    gap: 8px;
    flex: 1;
    min-width: 300px;

    :deep(.el-input) {
      flex: 1;
    }
  }
}

.table-wrapper {
  background: white;
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: auto;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.order-detail {
  padding: 16px 0;

  .detail-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 12px;

    &.full-width {
      grid-template-columns: 1fr;
    }
  }

  .detail-col {
    min-height: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .detail-label {
    font-size: 12px;
    color: #909399;
    margin-bottom: 4px;
  }

  .detail-value {
    font-size: 14px;
    color: #303133;
    word-break: break-word;
  }
}
</style>
