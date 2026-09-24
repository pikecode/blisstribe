import request from '@/utils/request'

export interface AdminLoginParams {
  username: string
  password: string
}

export interface AdminLoginResult {
  token: string
  admin: {
    id: number
    username: string
    nickname: string
  }
}

export interface AdminProfile {
  id: number
  username: string
  nickname: string
  avatar: string
}

export const authApi = {
  async login(params: AdminLoginParams): Promise<AdminLoginResult> {
    return request.post<AdminLoginResult>('/admin/login', params)
  },

  async getProfile(): Promise<AdminProfile> {
    return request.get<AdminProfile>('/admin/profile')
  },
}
