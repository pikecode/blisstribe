import request from '@/utils/request'

export const statsApi = {
  overview() {
    return request.get<{
      totalUsers: number
      activeUsers: number
      todayNewUsers: number
      disabledUsers: number
    }>('/stats/overview')
  },
  registerTrend() {
    return request.get<{ date: string; count: number }[]>('/stats/register-trend')
  },
}

export interface AgreementListResult {
  list: { id: number; type: string; version: string; title: string; isCurrent: boolean; effectiveAt: string }[]
  total: number
  page: number
  pageSize: number
}

export const agreementApi = {
  list(params: { page?: number; pageSize?: number; type?: string }) {
    return request.get<AgreementListResult>('/agreements', { params })
  },
  create(data: { type: string; version: string; title: string; content: string }) {
    return request.post('/agreements', data)
  },
  setCurrent(id: string) {
    return request.put(`/agreements/${id}/current`)
  },
}
