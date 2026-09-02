<template>
  <div class="user-mgr">
      <!-- 工具栏 -->
    <div class="toolbar" role="region" aria-label="搜索和操作工具栏">
      <div class="toolbar__left">
        <div class="toolbar__search">
          <label for="search-input" class="sr-only">搜索昵称、手机号</label>
          <el-input
            id="search-input"
            v-model="keyword"
            placeholder="搜索昵称、手机号..."
            clearable
            prefix-icon="Search"
            aria-label="搜索用户"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" @click="handleSearch" aria-label="执行搜索">搜索</el-button>
        </div>
      </div>

      <!-- 批量操作 -->
      <el-popover v-if="selected.length > 0" placement="top" :width="300">
        <template #reference>
          <el-button
            type="primary"
            :badge="{ content: selected.length, max: 99 }"
            :aria-label="`选中 ${selected.length} 个用户，点击查看批量操作`"
          >
            批量操作 ({{ selected.length }})
          </el-button>
        </template>
        <div class="batch-actions" role="menu" aria-label="批量操作菜单">
          <el-button
            type="danger"
            link
            size="small"
            @click="batchDisable"
            role="menuitem"
            aria-label="批量禁用选中的用户"
          >
            批量禁用
          </el-button>
          <el-divider />
          <el-button
            type="success"
            link
            size="small"
            @click="batchEnable"
            role="menuitem"
            aria-label="批量启用选中的用户"
          >
            批量启用
          </el-button>
          <el-divider />
          <el-button
            link
            size="small"
            @click="clearSelection"
            role="menuitem"
            aria-label="取消选择所有用户"
          >
            取消选择
          </el-button>
        </div>
      </el-popover>
    </div>

    <!-- 表格容器 -->
    <div class="table-wrapper">
      <!-- 桌面端表格 -->
      <el-table
        v-if="!isMobile"
        :data="list"
        v-loading="loading"
        stripe
        style="width: 100%"
        role="table"
        aria-label="用户列表表格"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="nickname" label="昵称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="140" show-overflow-tooltip />
        <el-table-column label="性别" width="80">
          <template #default="{ row }">{{ genderText(row.gender) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'active' ? 'success' : 'danger'"
              effect="light"
              round
            >
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
      <el-table-column label="操作" width="140" fixed="right" align="center">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" link size="small">
              查看
            </el-button>
            <el-divider direction="vertical" />
            <el-button
              :type="row.status === 'active' ? 'danger' : 'success'"
              link
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </div>
        </template>
      </el-table-column>
      </el-table>

      <!-- 移动端卡片列表 -->
      <div v-else v-loading="loading" class="user-cards">
        <div v-for="row in list" :key="row.id" class="user-card">
          <div class="user-card__header">
            <div>
              <div class="user-card__name">{{ row.nickname }}</div>
              <div class="user-card__phone">{{ row.phone }}</div>
            </div>
            <el-tag
              :type="row.status === 'active' ? 'success' : 'danger'"
              effect="light"
              round
              size="small"
            >
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </div>

          <div class="user-card__meta">
            <div class="user-card__meta-item">
              <span class="user-card__meta-label">性别</span>
              <span>{{ genderText(row.gender) }}</span>
            </div>
            <div class="user-card__meta-item">
              <span class="user-card__meta-label">注册</span>
              <span>{{ formatDate(row.createdAt) }}</span>
            </div>
          </div>

          <div class="user-card__actions">
            <el-button
              type="primary"
              link
              size="small"
            >
              查看
            </el-button>
            <el-button
              :type="row.status === 'active' ? 'danger' : 'success'"
              link
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!loading && list.length === 0" description="暂无用户数据" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/api/user'
import type { User } from '@blisstribe/shared'

const list = ref<User[]>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selected = ref<User[]>([])

// 移动端检测
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)

const updateWidth = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))

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

const handleSelectionChange = (rows: User[]): void => {
  selected.value = rows
}

const clearSelection = (): void => {
  selected.value = []
}

const batchDisable = async (): Promise<void> => {
  if (selected.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定禁用选中的 ${selected.value.length} 个用户？`,
      '批量禁用',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    for (const user of selected.value) {
      await userApi.updateStatus(String(user.id), 0)
    }
    ElMessage({
      message: `已禁用 ${selected.value.length} 个用户`,
      type: 'success',
      icon: 'CircleCheckFilled'
    })
    clearSelection()
    loadList()
  } catch {
    // 用户取消
  }
}

const batchEnable = async (): Promise<void> => {
  if (selected.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定启用选中的 ${selected.value.length} 个用户？`,
      '批量启用',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    for (const user of selected.value) {
      await userApi.updateStatus(String(user.id), 1)
    }
    ElMessage({
      message: `已启用 ${selected.value.length} 个用户`,
      type: 'success',
      icon: 'CircleCheckFilled'
    })
    clearSelection()
    loadList()
  } catch {
    // 用户取消
  }
}

const toggleStatus = async (row: User): Promise<void> => {
  const newStatus = row.status === 'active' ? 0 : 1
  const action = newStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定${action}用户「${row.nickname}」？`,
      '提示',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    await userApi.updateStatus(String(row.id), newStatus)
    ElMessage.success(`已${action}`)
    loadList()
  } catch {
    // 用户取消操作
  }
}

const genderText = (g: number): string => (g === 1 ? '男' : g === 2 ? '女' : '保密')
const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

onMounted(loadList)
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.user-mgr {
  display: flex;
  flex-direction: column;
  gap: $space-16;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-16;
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-20;

  &__left {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex: 1;
    min-width: 0;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: $space-12;
    flex: 1;
    max-width: 500px;

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

  &__actions {
    display: flex;
    gap: $space-12;
  }
}

.batch-actions {
  display: flex;
  flex-direction: column;
  gap: $space-8;

  :deep(.el-button) {
    justify-content: flex-start;
    padding: $space-8 0;
  }

  :deep(.el-divider) {
    margin: $space-4 0;
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

.user-cards {
  display: flex;
  flex-direction: column;
  gap: $space-12;
  min-height: 60px;
}

.user-card {
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

  &__name {
    font-size: $font-size-md;
    font-weight: 600;
    color: $color-text;
    line-height: 1.4;
  }

  &__phone {
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

  &__actions {
    display: flex;
    gap: $space-12;

    :deep(.el-button) {
      flex: 1;
      padding: $space-8 $space-12;
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

/* ── 平板端 ── */
@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;

    &__search,
    &__actions {
      width: 100%;
    }

    &__search {
      max-width: none;
    }
  }
}

/* ── 移动端 ── */
@media (max-width: 767px) {
  .user-mgr {
    gap: $space-12;
  }

  .toolbar {
    padding: $space-12;

    &__search {
      flex-direction: column;
      align-items: stretch;
      max-width: none;

      :deep(.el-input),
      :deep(.el-button) {
        width: 100%;
      }
    }

    &__actions {
      flex-direction: column;
      width: 100%;

      :deep(.el-button) {
        width: 100%;
      }
    }
  }

  .user-card {
    padding: $space-12;
    gap: $space-10;

    &__meta {
      gap: $space-10;
    }

    &__actions {
      :deep(.el-button) {
        font-size: $font-size-xs;
      }
    }
  }

  .pagination-wrapper {
    padding: $space-12;
    justify-content: center;
  }
}
</style>
