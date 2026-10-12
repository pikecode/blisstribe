<template>
  <div class="admin-list-actions">
    <slot />
    <el-dropdown v-if="$slots.more && showMore" trigger="click">
      <el-button link size="small" title="更多操作" aria-label="更多操作" :icon="MoreFilled" />
      <template #dropdown><el-dropdown-menu><slot name="more" /></el-dropdown-menu></template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { MoreFilled } from '@element-plus/icons-vue'
withDefaults(defineProps<{ showMore?: boolean }>(), { showMore: true })
</script>

<style scoped>
.admin-list-actions { display: flex; align-items: center; justify-content: center; gap: 0; white-space: nowrap; }
.admin-list-actions :deep(.el-button) { margin: 0; min-width: 0; width: 24px; height: 28px; padding: 0; font-size: 16px; border-radius: 6px; }
.admin-list-actions :deep(.el-button:hover) { background: var(--el-color-primary-light-9); }
</style>
