<template>
  <div class="cover-upload">
    <div class="cover-upload__row">
      <el-upload
        :action="uploadAction"
        :headers="uploadHeaders"
        :show-file-list="false"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        :before-upload="beforeUpload"
        accept="image/jpeg,image/png,image/webp"
      >
        <el-button size="small" type="primary">上传图片</el-button>
      </el-upload>
      <el-button v-if="modelValue" size="small" text @click="clearImage">清除图片</el-button>
    </div>
    <el-input
      :model-value="modelValue"
      class="cover-upload__input"
      maxlength="300"
      placeholder="也可以直接填写图片 URL"
      clearable
      @update:model-value="emit('update:modelValue', String($event || ''))"
    />
    <el-image
      v-if="modelValue"
      :src="modelValue"
      class="cover-upload__preview"
      fit="cover"
    />
    <div class="cover-upload__tip">{{ tip }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, type UploadRawFile } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import request from '@/utils/request'

const props = withDefaults(defineProps<{
  modelValue?: string
  tip?: string
}>(), {
  modelValue: '',
  tip: '支持 jpg/png/webp，建议使用横图，文件不超过 5MB',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const authStore = useAuthStore()
const uploadAction = `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/upload/cover`
const uploadHeaders = computed(() => ({ Authorization: authStore.token }))
const sessionUploadedUrl = ref('')

function beforeUpload(file: UploadRawFile) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    ElMessage.error('仅支持 jpg/png/webp 格式')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片不能超过 5MB')
    return false
  }
  return true
}

function handleUploadSuccess(res: { code: number; data?: { url?: string }; message?: string }) {
  if (res.code !== 200 || !res.data?.url) {
    ElMessage.error(res.message || '上传失败')
    return
  }
  if (sessionUploadedUrl.value && sessionUploadedUrl.value !== res.data.url) {
    request.delete(`/upload/file?url=${encodeURIComponent(sessionUploadedUrl.value)}`).catch(() => {})
  }
  sessionUploadedUrl.value = res.data.url
  emit('update:modelValue', res.data.url)
  ElMessage.success('上传成功')
}

function handleUploadError() {
  ElMessage.error('上传失败，请重试')
}

function clearImage() {
  if (sessionUploadedUrl.value && sessionUploadedUrl.value === props.modelValue) {
    request.delete(`/upload/file?url=${encodeURIComponent(sessionUploadedUrl.value)}`).catch(() => {})
    sessionUploadedUrl.value = ''
  }
  emit('update:modelValue', '')
}
</script>

<style scoped>
.cover-upload {
  width: 100%;
}

.cover-upload__row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cover-upload__input {
  margin-bottom: 8px;
}

.cover-upload__preview {
  width: 220px;
  height: 132px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  background: #f5f7fa;
}

.cover-upload__tip {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
</style>
