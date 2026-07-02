import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'blisstribe_admin_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const adminInfo = ref<{ id: number; username: string; nickname: string } | null>(null)

  const isLogin = computed(() => !!token.value)

  const setToken = (newToken: string): void => {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  const setAdminInfo = (info: { id: number; username: string; nickname: string }): void => {
    adminInfo.value = info
  }

  const clear = (): void => {
    token.value = ''
    adminInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, adminInfo, isLogin, setToken, setAdminInfo, clear }
})
