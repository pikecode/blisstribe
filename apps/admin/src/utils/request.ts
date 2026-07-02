import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { router } from '@/router'
import type { ApiResponse } from '@blisstribe/shared'

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

// 请求拦截：携带 Token
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = authStore.token
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截：统一处理 code，返回业务数据 T
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const body = response.data
    if (body.code === 200) {
      // 返回业务数据，覆盖 AxiosResponse 包装
      return body.data as unknown as AxiosResponse
    }
    // 401：跳登录
    if (body.code === 401001 || body.code === 401002 || body.code === 401003) {
      const authStore = useAuthStore()
      authStore.clear()
      router.replace('/login')
    }
    ElMessage.error(body.message || '请求失败')
    return Promise.reject(new Error(body.message))
  },
  (error) => {
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
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
