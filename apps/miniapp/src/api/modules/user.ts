import { request } from '@/api/request'
import { fileApi } from '@/api/modules/file'
import type { User, Gender } from '@blisstribe/shared'

export interface UpdateUserParams {
  nickname?: string
  avatar?: string
  gender?: Gender
  birthday?: string
}

export interface SetPasswordParams {
  password: string // RSA 加密后
  confirmPassword: string // RSA 加密后
}

export const userApi = {
  getInfo(): Promise<User> {
    return request<User>({ url: '/user/info', method: 'GET' })
  },

  updateInfo(params: UpdateUserParams): Promise<User> {
    return request<User>({ url: '/user/info', method: 'PUT', data: params })
  },

  setPassword(params: SetPasswordParams): Promise<void> {
    return request<void>({ url: '/user/password', method: 'PUT', data: params })
  },

  uploadAvatar(filePath: string): Promise<{ url: string }> {
    return fileApi.uploadAvatar(filePath)
  },
}
