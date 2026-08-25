// 认证工具
import { storage } from '@/utils/storage'

const AUTH_REDIRECT_KEY = 'authRedirectUrl'

export function checkLogin(): boolean {
  return !!storage.get<string>('token')
}

export function redirectToLogin(): void {
  uni.redirectTo({ url: '/pages/auth/auth' })
}

export function redirectToHome(): void {
  uni.switchTab({ url: '/pages/index/index' })
}

export function setAuthRedirect(url: string): void {
  storage.set(AUTH_REDIRECT_KEY, url, { expireSeconds: 30 * 60 })
}

export function consumeAuthRedirect(): string | null {
  const url = storage.get<string>(AUTH_REDIRECT_KEY)
  if (url) storage.remove(AUTH_REDIRECT_KEY)
  return url
}

export function redirectAfterLogin(): void {
  const url = consumeAuthRedirect()
  if (!url) {
    redirectToHome()
    return
  }
  if (url.startsWith('/pages/index/')) {
    uni.switchTab({ url })
    return
  }
  uni.redirectTo({ url })
}
