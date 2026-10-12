<template>
  <div class="admin-list-pagination">
    <span class="admin-list-pagination__total">共 {{ total }} 条</span>
    <el-pagination
      :current-page="currentPage" :page-size="pageSize" :total="total"
      :page-sizes="[10, 20, 50, 100]" :pager-count="5" :disabled="disabled"
      layout="sizes, prev, pager, next, jumper"
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
const props = defineProps<{ currentPage: number; pageSize: number; total: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:currentPage': [value: number]; 'update:pageSize': [value: number]; change: [] }>()
function changeSize(value: number) {
  if (value === props.pageSize) return
  emit('update:pageSize', value)
  emit('update:currentPage', 1)
  notifyChange()
}
function changePage(value: number) {
  if (value === props.currentPage) return
  emit('update:currentPage', value)
  notifyChange()
}
// 页容量变化可能同时触发页码变化，合并为一次查询。
let pending = false
async function notifyChange() {
  if (pending) return
  pending = true
  await nextTick()
  emit('change')
  pending = false
}
</script>

<style scoped>
.admin-list-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 16px 0; width: 100%; }
.admin-list-pagination__total { color: #667085; font-size: 13px; }
@media (max-width: 767px) { .admin-list-pagination :deep(.el-pagination__jump) { display: none; } .admin-list-pagination :deep(.el-pagination) { flex-wrap: wrap; gap: 6px; } }
</style>
