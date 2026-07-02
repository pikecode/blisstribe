import { authApi, type WechatLoginResult } from '@/api/modules/auth'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { redirectToHome } from '@/utils/auth'

export function useAuth() {
  const authStore = useAuthStore()
  const userStore = useUserStore()

  /**
   * 微信授权登录
   * wx.login 获取 code + 可选 userInfo，调用后端
   */
  const wechatLogin = async (userInfo?: WechatLoginResult['wxUserInfo']): Promise<WechatLoginResult> => {
    const { code } = await uni.login({ provider: 'weixin' })
    if (!code) throw new Error('微信登录 code 获取失败')

    const result = await authApi.wechatLogin({ code, userInfo })

    if (!result.isNewUser && result.token && result.userInfo) {
      // 老用户：直接登录
      authStore.setToken(result.token, result.refreshToken!)
      userStore.setUserInfo(result.userInfo)
      redirectToHome()
    } else if (result.isNewUser && result.tempToken) {
      // 新用户：保存 tempToken，跳转注册页
      authStore.setTempToken(result.tempToken)
    }

    return result
  }

  /**
   * 微信授权获取手机号（getPhoneNumber 回调中调用）
   */
  const getPhoneNumber = async (phoneCode: string): Promise<string> => {
    const result = await authApi.wechatPhone({
      tempToken: authStore.tempToken,
      code: phoneCode,
    })
    return result.phoneEncrypted
  }

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout()
    } finally {
      authStore.clearToken()
      userStore.clearUserInfo()
      redirectToHome()
    }
  }

  return {
    wechatLogin,
    getPhoneNumber,
    logout,
  }
}
