<template>
  <div class="user-mgr">
    <el-card>
      <div class="user-mgr__toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索昵称"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column label="性别" width="80">
          <template #default="{ row }">{{ genderText(row.gender) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 'active' ? 'danger' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
        class="user-mgr__pager"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api/user'
import type { User } from '@blisstribe/shared'

const list = ref<User[]>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const loadList = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await userApi.list({
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

const handleSearch = (): void => {
  page.value = 1
  loadList()
}

const toggleStatus = async (row: User): Promise<void> => {
  const newStatus = row.status === 'active' ? 0 : 1
  await userApi.updateStatus(String(row.id), newStatus)
  ElMessage.success(newStatus === 1 ? '已启用' : '已禁用')
  loadList()
}

const genderText = (g: number): string => (g === 1 ? '男' : g === 2 ? '女' : '保密')
const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

onMounted(loadList)
</script>

<style lang="scss" scoped>
.user-mgr {
  &__toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__pager {
    margin-top: 16px;
    justify-content: flex-end;
  }
}
</style>
