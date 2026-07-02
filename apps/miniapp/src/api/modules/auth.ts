import { request } from '@/api/request'
import type { User } from '@blisstribe/shared'

export interface WechatLoginParams {
  code: string
  userInfo?: {
    nickName: string
    avatarUrl: string
    gender: number
    country?: string
    province?: string
    city?: string
  }
}

export interface WechatLoginResult {
  isNewUser: boolean
  token?: string
  refreshToken?: string
  tempToken?: string
  userInfo?: User
  wxUserInfo?: {
    nickName: string
    avatarUrl: string
    gender: number
  }
  wxOpenId?: string
  wxUnionId?: string
}

export interface WechatPhoneParams {
  tempToken: string
  code: string
}

export interface WechatPhoneResult {
  phone: string
  phoneEncrypted: string
}

export interface RegisterParams {
  tempToken: string
  nickname: string
  avatar: string
  gender: number
  birthday?: string
  agreement: boolean
  realName?: string
  wechatId?: string
  email?: string
  age?: number
  favoriteColor?: string
  occupation?: string
  tags?: string[]
  identity?: string
  inviteCode?: string
}

export interface RegisterResult {
  token: string
  refreshToken: string
  userInfo: User
}

export interface RefreshTokenResult {
  token: string
  refreshToken: string
  expiresIn?: number
}

export const authApi = {
  wechatLogin(params: WechatLoginParams): Promise<WechatLoginResult> {
    return request<WechatLoginResult>({
      url: '/auth/wechat-login',
      method: 'POST',
      data: params,
      skipAuthRefresh: true,
    })
  },

  wechatPhone(params: WechatPhoneParams): Promise<WechatPhoneResult> {
    return request<WechatPhoneResult>({
      url: '/auth/wechat-phone',
      method: 'POST',
      data: params,
      skipAuthRefresh: true,
    })
  },

  register(params: RegisterParams): Promise<RegisterResult> {
    return request<RegisterResult>({
      url: '/auth/register',
      method: 'POST',
      data: params,
      skipAuthRefresh: true,
    })
  },

  refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    return request<RefreshTokenResult>({
      url: '/auth/refresh-token',
      method: 'POST',
      data: { refreshToken },
      skipAuthRefresh: true,
    })
  },

  logout(): Promise<void> {
    return request<void>({ url: '/auth/logout', method: 'POST' })
  },
}
