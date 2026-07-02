import request from '@/utils/request'

export const authApi = {
  login(username: string, password: string) {
    return request.post<{ token: string; admin: { id: number; username: string; nickname: string } }>(
      '/admin/login',
      { username, password }
    )
  },
  getProfile() {
    return request.get<{ id: number; username: string; nickname: string; avatar: string }>(
      '/admin/profile'
    )
  },
}
