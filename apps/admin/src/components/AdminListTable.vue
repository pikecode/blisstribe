<template>
  <section class="admin-list-table" :aria-busy="loading">
    <el-alert v-if="error" type="error" :closable="false" show-icon class="admin-list-table__error">
      <template #title>{{ error }}</template>
      <el-button link type="primary" :disabled="loading" @click="$emit('retry')">重新加载</el-button>
    </el-alert>
    <el-table v-bind="$attrs" :data="data" v-loading="loading">
      <slot />
      <template #empty>
        <slot name="empty"><el-empty :image-size="56" :description="loading ? '正在加载…' : error ? '列表加载失败，请重新加载' : emptyText" /></slot>
      </template>
      <template v-if="$slots.append" #append><slot name="append" /></template>
    </el-table>
  </section>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ data?: any[]; loading?: boolean; error?: string; emptyText?: string }>(), {
  data: () => [], loading: false, error: '', emptyText: '暂无数据，可调整筛选条件',
})
defineEmits<{ retry: [] }>()
</script>

<style scoped>
.admin-list-table { min-width: 0; width: 100%; }
.admin-list-table__error { margin-bottom: 12px; }
.admin-list-table :deep(.el-table__empty-text) { line-height: 1.5; width: 100%; }
.admin-list-table :deep(.el-empty) { padding: 24px 0; }
</style>
