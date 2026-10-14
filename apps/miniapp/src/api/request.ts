// 请求封装：统一拦截、Token 刷新（并发锁）、skipAuthRefresh 避免递归
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { storage } from '@/utils/storage'
import { APP_CONFIG } from '@/config'
import type { ApiResponse } from '@blisstribe/shared'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: Record<string, unknown> | unknown
  header?: Record<string, string>
  loading?: boolean
  // 为 true 时，该请求 401 不触发刷新，直接抛错（用于刷新接口本身）
  skipAuthRefresh?: boolean
}

const TOKEN_EXPIRED_CODES = new Set([401002])
const AUTH_REQUIRED_CODES = new Set([401001, 401003])

let refreshPromise: Promise<void> | null = null

// 统一返回业务数据 T（已从 ApiResponse.data 中提取）
export async function request<T>(options: RequestOptions, retried = false): Promise<T> {
  if (!options.skipAuthRefresh) {
    try {
      await restoreSession()
    } catch (error) {
      uni.showToast({ title: error instanceof Error ? error.message : '恢复登录失败', icon: 'none' })
      throw error
    }
  }
  return new Promise<T>((resolve, reject) => {
    const authStore = useAuthStore()
    const sentToken = authStore.token

    if (options.loading) {
      uni.showLoading({ title: '加载中...', mask: true })
    }

    uni.request({
      url: `${APP_CONFIG.apiBaseUrl}${options.url}`,
      method: (options.method || 'GET') as never,
      data: options.data as never,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token.replace(/^Bearer\s+/i, '')}`,
        ...options.header,
      },
      success: (res) => {
        const envelope = res.data as ApiResponse<T>

        if (envelope.code === 200) {
          resolve(envelope.data)
          return
        }

        // 并发请求可能在续期后才返回旧令牌的错误，直接使用新令牌重试。
        if (!options.skipAuthRefresh && !retried && authStore.token && authStore.token !== sentToken &&
            (TOKEN_EXPIRED_CODES.has(envelope.code) || AUTH_REQUIRED_CODES.has(envelope.code))) {
          request<T>(options, true).then(resolve).catch(reject)
          return
        }

        if ((TOKEN_EXPIRED_CODES.has(envelope.code) || (envelope.code === 401003 && !!sentToken)) &&
            !options.skipAuthRefresh && !retried && authStore.refreshToken) {
          refreshToken()
            .then(() => {
              request<T>(options, true).then(resolve).catch(reject)
            })
            .catch((error) => {
              uni.showToast({ title: error instanceof Error ? error.message : '恢复登录失败', icon: 'none' })
              reject(error)
            })
          return
        }

        if ((AUTH_REQUIRED_CODES.has(envelope.code) || TOKEN_EXPIRED_CODES.has(envelope.code)) && !options.skipAuthRefresh) {
          clearSession()
          uni.showToast({ title: '请先登录', icon: 'none' })
          uni.redirectTo({ url: '/pages/auth/auth' })
          reject(new Error('请先登录'))
          return
        }

        uni.showToast({ title: envelope.message || '请求失败', icon: 'none' })
        reject(new Error(envelope.message))
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
      complete: () => {
        if (options.loading) {
          uni.hideLoading()
        }
      },
    })
  })
}

// 缓存中的访问令牌过期后，用仍有效的刷新令牌恢复会话。
export async function restoreSession(): Promise<void> {
  const authStore = useAuthStore()
  if (refreshPromise) return refreshPromise
  authStore.token = storage.get<string>('token') || ''
  authStore.refreshToken = storage.get<string>('refreshToken') || ''
  if (!authStore.token && authStore.refreshToken) await refreshToken()
}

function clearSession(): void {
  useAuthStore().clearToken()
  useUserStore().clearUserInfo()
}

async function refreshToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  const authStore = useAuthStore()
  const originalRefreshToken = authStore.refreshToken
  refreshPromise = new Promise<void>((resolve, reject) => {
    uni.request({
      url: `${APP_CONFIG.apiBaseUrl}/auth/refresh-token`,
      method: 'POST',
      data: { refreshToken: originalRefreshToken } as never,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const data = res.data as ApiResponse<{ token: string; refreshToken: string; expiresIn?: number }>
        // 退出或重新登录后，忽略旧会话的刷新响应。
        if (authStore.refreshToken !== originalRefreshToken) {
          reject(new Error('登录状态已变更'))
          return
        }
        if (data.code === 200 && data.data?.token && data.data?.refreshToken) {
          authStore.setToken(data.data.token, data.data.refreshToken, data.data.expiresIn)
          resolve()
        } else if (TOKEN_EXPIRED_CODES.has(data.code) || AUTH_REQUIRED_CODES.has(data.code)) {
          clearSession()
          reject(new Error('登录已过期，请重新登录'))
        } else {
          reject(new Error(data.message || '暂时无法恢复登录，请稍后重试'))
        }
      },
      fail: () => reject(new Error('网络异常，请稍后重试')),
    })
  }).finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}
