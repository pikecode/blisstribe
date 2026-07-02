import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const refreshToken = ref<string>('')
  const tempToken = ref<string>('')
  const isLogin = computed(() => !!token.value)

  const setToken = (newToken: string, newRefreshToken: string): void => {
    token.value = newToken
    refreshToken.value = newRefreshToken
    storage.set('token', newToken, { expireSeconds: 7200 })
    storage.set('refreshToken', newRefreshToken, { expireSeconds: 7 * 24 * 3600 })
  }

  const setTempToken = (newTempToken: string): void => {
    tempToken.value = newTempToken
    storage.set('tempToken', newTempToken, { expireSeconds: 600 })
  }

  const clearToken = (): void => {
    token.value = ''
    refreshToken.value = ''
    tempToken.value = ''
    storage.remove('token')
    storage.remove('refreshToken')
    storage.remove('tempToken')
  }

  const init = (): void => {
    token.value = storage.get<string>('token') || ''
    refreshToken.value = storage.get<string>('refreshToken') || ''
    tempToken.value = storage.get<string>('tempToken') || ''
  }

  return {
    token,
    refreshToken,
    tempToken,
    isLogin,
    setToken,
    setTempToken,
    clearToken,
    init,
  }
})
