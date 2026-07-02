import request from '@/utils/request'
import type { User } from '@blisstribe/shared'

export interface UserListResult {
  list: User[]
  total: number
  page: number
  pageSize: number
}

export const userApi = {
  list(params: { page?: number; pageSize?: number; keyword?: string }) {
    return request.get<UserListResult>('/admin/users', { params })
  },
  get(id: string) {
    return request.get<User>(`/admin/users/${id}`)
  },
  create(data: { nickname: string; phone: string; gender?: number; avatar?: string }) {
    return request.post<User>('/admin/users', data)
  },
  update(id: string, data: { nickname?: string; avatar?: string; gender?: number }) {
    return request.put<User>(`/admin/users/${id}`, data)
  },
  updateStatus(id: string, status: number) {
    return request.put<{ status: number }>(`/admin/users/${id}/status`, { status })
  },
}
