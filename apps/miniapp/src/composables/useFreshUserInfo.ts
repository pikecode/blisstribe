import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { userApi } from '@/api/modules/user'
import type { User } from '@blisstribe/shared'

export function useFreshUserInfo() {
  const authStore = useAuthStore()
  const userStore = useUserStore()

  async function refreshUserInfo(): Promise<User | null> {
    if (!authStore.isLogin) return userStore.userInfo
    try {
      const user = await userApi.getInfo()
      userStore.setUserInfo(user)
      return user
    } catch {
      return userStore.userInfo
    }
  }

  return { refreshUserInfo }
}
