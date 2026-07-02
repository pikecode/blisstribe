// 用户相关共享类型（小程序 + 后台 + API 共用）

export type Gender = 0 | 1 | 2 // 0保密 1男 2女

export type UserStatus = 'active' | 'disabled' | 'pending'

export interface User {
  id: number
  phone: string // 脱敏展示
  nickname: string
  avatar: string
  gender: Gender
  birthday?: string
  status: UserStatus
  wxOpenId?: string
  wxUnionId?: string
  createdAt: string
  updatedAt: string
}

export interface RegisterForm {
  nickname: string
  avatar: string
  gender: Gender
  birthday?: string
  agreement: boolean
}
