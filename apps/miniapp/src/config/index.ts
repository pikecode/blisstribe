// 全局配置
export const APP_CONFIG = {
  appName: 'BlissTribe',
  version: '1.0.0',
  // API 基础地址，通过环境变量注入
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.blisstribe.com/api/v1',
  // 微信小程序 appid（需在 manifest.json 同步配置）
  wxAppId: '',
} as const
