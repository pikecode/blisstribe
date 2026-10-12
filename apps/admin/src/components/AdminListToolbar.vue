<template>
  <div class="admin-list-toolbar" role="region" aria-label="列表筛选和操作">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
.admin-list-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: white;
  :deep(.page-toolbar__right), :deep(.toolbar__right) { margin-left: auto; }
  :deep(.toolbar__left), :deep(.toolbar__filters), :deep(.toolbar__search), :deep(.toolbar__right) { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
  :deep(.toolbar__search .el-input) { width: 240px; }
  :deep(.el-button + .el-button) { margin-left: 0; }
  @media (max-width: 767px) { padding: 12px; gap: 8px; :deep(.toolbar__right), :deep(.page-toolbar__right) { margin-left: 0; width: 100%; } }
}
</style>
