import { ref } from 'vue'
import { fileApi } from '@/api/modules/file'
import { useAuthStore } from '@/stores/modules/auth'

export function useUpload() {
  const uploading = ref(false)

  const chooseAndUploadAvatar = async (): Promise<string | null> => {
    const authStore = useAuthStore()
    if (!authStore.isLogin) {
      // 注册流程中暂不传头像，注册后可在个人中心设置
      return null
    }

    uploading.value = true
    try {
      const { tempFilePaths } = await uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      if (!tempFilePaths.length) return null

      const filePath = tempFilePaths[0]
      const result = await fileApi.uploadAvatar(filePath)
      return result.url
    } finally {
      uploading.value = false
    }
  }

  return {
    uploading,
    chooseAndUploadAvatar,
  }
}
