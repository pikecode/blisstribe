// 用户相关共享类型（小程序 + 后台 + API 共用）

export type Gender = 0 | 1 | 2 // 0保密 1男 2女

export type UserStatus = 'active' | 'disabled' | 'pending'

export type UserIdentity = 'C' | 'B' | 'S' // C消费者 B产品供应商 S服务供应商

export type UserLevel = 'normal' | 'vip' | 'star1' | 'star2' // 普通/VIP/一星/二星共建会员

export interface User {
  id: number
  phone: string
  nickname: string
  avatar: string
  gender: Gender
  birthday?: string
  realName?: string
  wechatId?: string
  email?: string
  age?: number
  favoriteColor?: string
  occupation?: string
  tags: string[]
  identity?: UserIdentity
  level: UserLevel
  douyinPayCode?: string
  status: UserStatus
  inviteCode?: string
  invitedBy?: number
  createdAt: string
  updatedAt: string
}

export interface RegisterForm {
  nickname: string
  avatar: string
  gender: Gender
  birthday?: string
  realName?: string
  wechatId?: string
  email?: string
  age?: number
  favoriteColor?: string
  occupation?: string
  tags?: string[]
  identity?: UserIdentity
  inviteCode?: string
  agreement: boolean
}

