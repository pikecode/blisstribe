<template>
  <el-tooltip :content="label" placement="top">
    <el-button v-bind="$attrs" link type="primary" size="small" :aria-label="label" :icon="icons[icon]" />
  </el-tooltip>
</template>

<script setup lang="ts">
import { Calendar, DocumentChecked, Edit, View } from '@element-plus/icons-vue'
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; icon: 'Edit' | 'View' | 'Calendar' | 'DocumentChecked' }>()
const icons = { Edit, View, Calendar, DocumentChecked }
</script>
