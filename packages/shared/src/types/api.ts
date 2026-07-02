// API 相关共享类型

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp?: number
  requestId?: string
}

export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
  keyword?: string
}
