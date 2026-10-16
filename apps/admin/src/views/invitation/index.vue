<template>
  <div class="invitation-mgr">
    <el-row :gutter="16" class="invitation-mgr__stats">
      <el-col v-for="item in statItems" :key="item.label" :span="6">
        <el-card><div class="invitation-mgr__stat">
          <text class="invitation-mgr__stat-label">{{ item.label }}</text>
          <text class="invitation-mgr__stat-value">{{ item.value }}</text>
        </div></el-card>
      </el-col>
    </el-row>

    <el-card class="invitation-mgr__records">
      <template #header>
        <div>
          <strong>服务伙伴邀请记录</strong>
          <div class="invitation-mgr__hint">已解析指邀请码校验成功；已绑定指注册用户已建立客户关系。</div>
        </div>
      </template>
      <AdminListToolbar>
        <el-input
          v-model="keyword"
          placeholder="搜索伙伴、客户或邀请码"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="status" clearable placeholder="全部状态" style="width: 150px" @change="handleSearch">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </AdminListToolbar>

      <AdminListTable :data="list" :loading="loading" :error="listError" @retry="loadList">
        <el-table-column prop="partnerName" label="服务伙伴" min-width="160">
          <template #default="{ row }">{{ row.partnerName || '伙伴已删除' }}<small v-if="row.partnerNo"> · {{ row.partnerNo }}</small></template>
        </el-table-column>
        <el-table-column prop="userNickname" label="注册客户" min-width="150">
          <template #default="{ row }">{{ row.userNickname || '尚未注册' }}<small v-if="row.userPhoneMasked"> · {{ row.userPhoneMasked }}</small></template>
        </el-table-column>
        <el-table-column prop="code" label="邀请码" width="130" />
        <el-table-column label="结果" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failureReason" label="说明" min-width="170">
          <template #default="{ row }">{{ row.failureReason || '—' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="记录时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </AdminListTable>

      <AdminListPagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
      :disabled="loading" @change="loadList" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import AdminListTable from '@/components/AdminListTable.vue'
import AdminListToolbar from '@/components/AdminListToolbar.vue'
import AdminListPagination from '@/components/AdminListPagination.vue'
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { partnerApi } from '@/api/partner'

const listError = ref('')


const list = ref<Array<{
  id: number
  code: string
  partnerName: string | null
  partnerNo: string | null
  userNickname: string | null
  userPhoneMasked: string | null
  failureReason: string | null
  status: number
  createdAt: string
}>>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const status = ref<number>()
const stats = ref({ activeCodes: 0, parsed: 0, bound: 0, invalid: 0, skipped: 0 })
const statItems = computed(() => [
  { label: '启用中的伙伴邀请码', value: stats.value.activeCodes },
  { label: '成功解析次数', value: stats.value.parsed },
  { label: '已建立客户关系', value: stats.value.bound },
  { label: '无效 / 跳过绑定', value: stats.value.invalid + stats.value.skipped },
])
const statusOptions = [
  { value: 0, label: '已解析' },
  { value: 1, label: '已注册' },
  { value: 2, label: '已绑定' },
  { value: 3, label: '无效' },
  { value: 4, label: '跳过绑定' },
]

const loadList = async (): Promise<void> => {
  loading.value = true
  listError.value = ''
  try {
    const data = await partnerApi.allInvitations({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      status: status.value,
    })
    list.value = data.list
    total.value = data.total
  } catch {
    listError.value = '列表加载失败，请重试'
  } finally {
    loading.value = false
  }
}

const loadStats = async (): Promise<void> => {
  try {
    stats.value = await partnerApi.invitationStats()
  } catch {
    ElMessage.error('加载统计失败')
  }
}

const handleSearch = (): void => {
  page.value = 1
  loadList()
}

const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')
const statusText = (value: number): string => statusOptions.find((item) => item.value === value)?.label ?? '未知'
const statusType = (value: number): 'success' | 'warning' | 'danger' | 'info' | '' => ({
  0: 'info', 1: '', 2: 'success', 3: 'danger', 4: 'warning',
}[value] ?? '') as 'success' | 'warning' | 'danger' | 'info' | ''

onMounted(() => {
  loadList()
  loadStats()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.invitation-mgr {
  &__stats {
    margin-bottom: 16px;
  }

  &__stat {
    text-align: center;
    padding: 16px;

    &-label {
      display: block;
      font-size: 14px;
      color: $color-text-secondary;
      margin-bottom: 8px;
    }

    &-value {
      display: block;
      font-size: 32px;
      font-weight: bold;
      color: $color-primary;
    }
  }

  &__top {
    margin-bottom: 16px;
  }

  &__hint { margin-top: 6px; color: $color-text-secondary; font-size: 12px; font-weight: normal; }

  &__records {
    .invitation-mgr__toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
  }

  &__pager {
    margin-top: 16px;
    justify-content: flex-end;
  }
}
</style>
