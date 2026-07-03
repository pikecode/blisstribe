<template>
  <div class="invitation-mgr">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="invitation-mgr__stats">
      <el-col :span="8">
        <el-card>
          <div class="invitation-mgr__stat">
            <text class="invitation-mgr__stat-label">邀请人数</text>
            <text class="invitation-mgr__stat-value">{{ stats.totalInviters }}</text>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="invitation-mgr__stat">
            <text class="invitation-mgr__stat-label">被邀请人数</text>
            <text class="invitation-mgr__stat-value">{{ stats.totalInvitees }}</text>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="invitation-mgr__stat">
            <text class="invitation-mgr__stat-label">邀请转化率</text>
            <text class="invitation-mgr__stat-value">{{ conversionRate }}%</text>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 邀请排行榜 -->
    <el-card class="invitation-mgr__top">
      <template #header>
        <span>邀请排行榜 TOP10</span>
      </template>
      <el-table :data="stats.topInviters" stripe size="small">
        <el-table-column type="index" label="排名" width="60" />
        <el-table-column prop="nickname" label="邀请人" />
        <el-table-column prop="inviteCount" label="邀请人数" width="100">
          <template #default="{ row }">
            <el-tag type="success">{{ row.inviteCount }}人</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 邀请记录 -->
    <el-card class="invitation-mgr__records">
      <template #header>
        <span>邀请记录</span>
      </template>
      <div class="page-toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索邀请人/被邀请人"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="inviterNickname" label="邀请人" />
        <el-table-column prop="inviteeNickname" label="被邀请人" />
        <el-table-column prop="inviteCode" label="邀请码" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 2 ? 'success' : 'warning'">
              {{ row.status === 2 ? '已入会' : '待注册' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
        class="invitation-mgr__pager"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { invitationApi } from '@/api/invitation'

const list = ref<Array<{
  id: number
  inviterNickname: string
  inviteeNickname: string
  inviteCode: string
  status: number
  createdAt: string
}>>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const stats = ref<{
  totalInviters: number
  totalInvitees: number
  topInviters: Array<{ id: number; nickname: string; inviteCount: number }>
}>({
  totalInviters: 0,
  totalInvitees: 0,
  topInviters: [],
})

const conversionRate = computed(() => {
  if (stats.value.totalInviters === 0) return 0
  return Math.round((stats.value.totalInvitees / stats.value.totalInviters) * 100)
})

const loadList = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await invitationApi.getRecords({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const loadStats = async (): Promise<void> => {
  try {
    stats.value = await invitationApi.getStats()
  } catch {
    ElMessage.error('加载统计失败')
  }
}

const handleSearch = (): void => {
  page.value = 1
  loadList()
}

const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

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
