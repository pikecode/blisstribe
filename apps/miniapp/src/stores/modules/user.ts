import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'
import type { User } from '@blisstribe/shared'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<User | null>(null)
  const isLogin = computed(() => !!userInfo.value)

  const displayName = computed(() => userInfo.value?.nickname || '未命名用户')
  const avatarUrl = computed(
    () => userInfo.value?.avatar || '/static/images/default-avatar.png'
  )

  const setUserInfo = (info: User): void => {
    userInfo.value = info
    storage.set('userInfo', info)
  }

  const clearUserInfo = (): void => {
    userInfo.value = null
    storage.remove('userInfo')
  }

  const init = (): void => {
    const stored = storage.get<User>('userInfo')
    if (stored) {
      userInfo.value = stored
    }
  }

  return {
    userInfo,
    isLogin,
    displayName,
    avatarUrl,
    setUserInfo,
    clearUserInfo,
    init,
  }
})
