// 认证工具
import { storage } from '@/utils/storage'

export function checkLogin(): boolean {
  return !!storage.get<string>('token')
}

export function redirectToLogin(): void {
  uni.redirectTo({ url: '/pages/auth/auth' })
}

export function redirectToHome(): void {
  uni.switchTab({ url: '/pages/index/index' })
}
