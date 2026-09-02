import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/router/routes'
import type { ApiResponse } from '@blisstribe/shared'
import { performanceMonitor } from './performance'

const requestMeasureNames = new WeakMap<object, string>()

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
})

// 请求拦截：携带 Token + 性能监控
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = authStore.token
    }

    // 开始性能测量
    const requestId = `${config.method?.toUpperCase()}_${config.url}_${Date.now()}`
    const measureName = `api_${requestId}`
    requestMeasureNames.set(config, measureName)
    performanceMonitor.startMeasure(measureName, {
      method: config.method,
      url: config.url,
    })

    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截：统一处理 code，返回业务数据 T + 性能记录
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    // 记录 API 响应时间
    const measureName = requestMeasureNames.get(response.config)
    if (measureName) {
      performanceMonitor.endMeasure(measureName)
      requestMeasureNames.delete(response.config)
    }

    const body = response.data
    if (body.code === 200) {
      // 返回业务数据，覆盖 AxiosResponse 包装
      return body.data as unknown as AxiosResponse
    }
    // 401：跳登录（登录页本身不跳）
    if (body.code === 401001 || body.code === 401002 || body.code === 401003) {
      const authStore = useAuthStore()
      authStore.clear()
      if (router.currentRoute.value.path !== '/login') {
        router.replace('/login')
      }
    }
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message))
  },
  (error) => {
    const config = error.config
    if (config) {
      const measureName = requestMeasureNames.get(config)
      if (measureName) {
        performanceMonitor.endMeasure(measureName)
        requestMeasureNames.delete(config)
      }
    }

    const body = error.response?.data
    if (body?.code === 401001 || body?.code === 401002 || body?.code === 401003) {
      const authStore = useAuthStore()
      authStore.clear()
      if (router.currentRoute.value.path !== '/login') {
        router.replace('/login')
      }
      ElMessage.error(body.message || '未登录')
      return Promise.reject(new Error(body.message))
    }
    const message = body?.message || error.message || '网络错误'
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  }
)

// 封装请求方法，返回类型直接为业务数据 T
export default {
  get<T>(url: string, config?: Parameters<AxiosInstance['get']>[1]): Promise<T> {
    return service.get(url, config) as unknown as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: Parameters<AxiosInstance['post']>[2]): Promise<T> {
    return service.post(url, data, config) as unknown as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: Parameters<AxiosInstance['put']>[2]): Promise<T> {
    return service.put(url, data, config) as unknown as Promise<T>
  },
  delete<T>(url: string, config?: Parameters<AxiosInstance['delete']>[1]): Promise<T> {
    return service.delete(url, config) as unknown as Promise<T>
  },
}
