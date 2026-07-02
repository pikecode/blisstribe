import { request } from '@/api/request'
import { useAuthStore } from '@/stores/modules/auth'
import { APP_CONFIG } from '@/config'

export interface UploadAvatarResult {
  url: string
  width?: number
  height?: number
  size?: number
}

export const fileApi = {
  uploadAvatar(filePath: string): Promise<UploadAvatarResult> {
    return new Promise<UploadAvatarResult>((resolve, reject) => {
      const authStore = useAuthStore()
      uni.uploadFile({
        url: `${APP_CONFIG.apiBaseUrl}/upload/avatar`,
        filePath,
        name: 'file',
        header: {
          Authorization: `Bearer ${authStore.token}`,
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data) as {
              code: number
              message: string
              data: UploadAvatarResult
            }
            if (data.code === 200) {
              resolve(data.data)
            } else {
              uni.showToast({ title: data.message || '上传失败', icon: 'none' })
              reject(new Error(data.message))
            }
          } catch {
            reject(new Error('上传响应解析失败'))
          }
        },
        fail: (err) => {
          uni.showToast({ title: '上传失败', icon: 'none' })
          reject(err)
        },
      })
    })
  },
}
