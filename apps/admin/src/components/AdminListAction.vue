<template>
  <el-tooltip :content="label" placement="top">
    <el-button v-bind="$attrs" link type="primary" size="small" :aria-label="label" :icon="icons[icon]" />
  </el-tooltip>
</template>

<script setup lang="ts">
import { Calendar, DocumentChecked, Edit, Plus, View } from '@element-plus/icons-vue'
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; icon: 'Edit' | 'View' | 'Calendar' | 'DocumentChecked' | 'Plus' }>()
const icons = { Edit, View, Calendar, DocumentChecked, Plus }
</script>
