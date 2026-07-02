import request from '@/utils/request'

export interface AdminItem {
  id: number
  username: string
  nickname: string
  avatar: string
  status: number
  roles: { id: number; code: string; name: string }[]
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminListResult {
  list: AdminItem[]
  total: number
  page: number
  pageSize: number
}

export interface RoleItem {
  id: number
  code: string
  name: string
  status: number
}

export const adminApi = {
  list(params: { page?: number; pageSize?: number; keyword?: string }) {
    return request.get<AdminListResult>('/admin/admins', { params })
  },
  create(data: { username: string; password: string; nickname: string; avatar?: string; roleIds?: string[] }) {
    return request.post<{ id: number; username: string }>('/admin/admins', data)
  },
  update(id: string, data: { nickname?: string; avatar?: string }) {
    return request.put<{ id: number }>(`/admin/admins/${id}`, data)
  },
  updateStatus(id: string, status: number) {
    return request.put<{ status: number }>(`/admin/admins/${id}/status`, { status })
  },
  resetPassword(id: string, password: string) {
    return request.put(`/admin/admins/${id}/password`, { password })
  },
  assignRoles(id: string, roleIds: string[]) {
    return request.put<{ roleIds: number[] }>(`/admin/admins/${id}/roles`, { roleIds })
  },
  listRoles() {
    return request.get<RoleItem[]>('/admin/roles')
  },
  createRole(code: string, name: string) {
    return request.post<{ id: number; code: string; name: string }>('/admin/roles', { code, name })
  },
}
