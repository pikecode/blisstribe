// 请求封装：统一拦截、Token 刷新（并发锁）、skipAuthRefresh 避免递归
import { useAuthStore } from '@/stores/modules/auth'
import { APP_CONFIG } from '@/config'
import type { ApiResponse } from '@blisstribe/shared'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown> | unknown
  header?: Record<string, string>
  loading?: boolean
  // 为 true 时，该请求 401 不触发刷新，直接抛错（用于刷新接口本身）
  skipAuthRefresh?: boolean
}

const TOKEN_EXPIRED_CODES = new Set([401001, 401002])

let isRefreshing = false
let refreshPromise: Promise<void> | null = null

// 统一返回业务数据 T（已从 ApiResponse.data 中提取）
export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const authStore = useAuthStore()

    if (options.loading) {
      uni.showLoading({ title: '加载中...', mask: true })
    }

    uni.request({
      url: `${APP_CONFIG.apiBaseUrl}${options.url}`,
      method: options.method || 'GET',
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

        if (
          TOKEN_EXPIRED_CODES.has(envelope.code) &&
          !options.skipAuthRefresh &&
          authStore.refreshToken
        ) {
          refreshToken()
            .then(() => {
              request<T>(options).then(resolve).catch(reject)
            })
            .catch(() => {
              authStore.clearToken()
              uni.redirectTo({ url: '/pages/auth/auth' })
              reject(new Error('登录已过期'))
            })
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

async function refreshToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = new Promise<void>((resolve, reject) => {
    const authStore = useAuthStore()
    // 裸请求，避免递归触发刷新
    uni.request({
      url: `${APP_CONFIG.apiBaseUrl}/auth/refresh-token`,
      method: 'POST',
      data: { refreshToken: authStore.refreshToken } as never,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const data = res.data as ApiResponse<{ token: string; refreshToken: string; expiresIn?: number }>
        if (data.code === 200) {
          authStore.setToken(data.data.token, data.data.refreshToken)
          resolve()
        } else {
          authStore.clearToken()
          uni.redirectTo({ url: '/pages/auth/auth' })
          reject(new Error('登录已过期'))
        }
      },
      fail: () => {
        authStore.clearToken()
        uni.redirectTo({ url: '/pages/auth/auth' })
        reject(new Error('刷新失败'))
      },
      complete: () => {
        isRefreshing = false
        refreshPromise = null
      },
    })
  })

  return refreshPromise
}
