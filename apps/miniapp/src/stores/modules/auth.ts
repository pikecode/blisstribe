import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'

export interface RegisterWxUserInfo {
  nickName: string
  avatarUrl: string
  gender: number
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const refreshToken = ref<string>('')
  const tempToken = ref<string>('')
  const registerWxUserInfo = ref<RegisterWxUserInfo | null>(null)
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

  const setRegisterWxUserInfo = (info?: RegisterWxUserInfo): void => {
    registerWxUserInfo.value = info || null
    if (info) {
      storage.set('registerWxUserInfo', info, { expireSeconds: 600 })
    } else {
      storage.remove('registerWxUserInfo')
    }
  }

  const clearToken = (): void => {
    token.value = ''
    refreshToken.value = ''
    tempToken.value = ''
    registerWxUserInfo.value = null
    storage.remove('token')
    storage.remove('refreshToken')
    storage.remove('tempToken')
    storage.remove('registerWxUserInfo')
  }

  const init = (): void => {
    token.value = storage.get<string>('token') || ''
    refreshToken.value = storage.get<string>('refreshToken') || ''
    tempToken.value = storage.get<string>('tempToken') || ''
    registerWxUserInfo.value = storage.get<RegisterWxUserInfo>('registerWxUserInfo') || null
  }

  return {
    token,
    refreshToken,
    tempToken,
    registerWxUserInfo,
    isLogin,
    setToken,
    setTempToken,
    setRegisterWxUserInfo,
    clearToken,
    init,
  }
})
