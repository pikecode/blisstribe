# 前端架构设计文档

## 1. 概述

### 1.1 文档目的
本文档描述 BlissTribe 小程序前端项目的架构设计，包括目录结构、组件设计、状态管理、路由规划和工具链配置。

### 1.2 技术栈

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 框架 | UniApp | 3.x | 跨端开发框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| UI | uni-ui + 自定义 | - | 组件库 |
| 状态管理 | Pinia | 2.x | Vue 3 官方推荐 |
| 构建工具 | Vite | 4.x | 快速构建 |
| 样式 | SCSS | - | CSS 预处理器 |
| 加密 | jsencrypt | 3.x | RSA 加密 |
| 工具 | ESLint + Prettier | - | 代码规范 |

---

## 2. 目录结构

```
src/
├── api/                          # API 接口层
│   ├── modules/
│   │   ├── auth.ts              # 认证相关接口
│   │   ├── user.ts              # 用户相关接口
│   │   └── file.ts              # 文件上传接口
│   ├── request.ts               # 请求封装（拦截器）
│   └── types.ts                 # API 类型定义
│
├── components/                   # 公共组件
│   ├── ui/                      # 基础 UI 组件
│   │   ├── AppButton.vue
│   │   ├── AppInput.vue
│   │   ├── AppAvatar.vue
│   │   └── AppLoading.vue
│   ├── business/               # 业务组件
│   │   ├── UserAgreement.vue    # 用户协议勾选
│   │   ├── PhoneDisplay.vue     # 手机号展示
│   │   └── GenderPicker.vue     # 性别选择器
│   └── layout/                 # 布局组件
│       └── AppLayout.vue
│
├── composables/                 # 组合式函数
│   ├── useAuth.ts              # 认证逻辑
│   ├── useUser.ts              # 用户信息
│   ├── useUpload.ts            # 文件上传
│   ├── useForm.ts              # 表单校验
│   └── useCountdown.ts         # 倒计时
│
├── config/                      # 配置文件
│   ├── index.ts                # 全局配置
│   ├── api.ts                  # API 配置
│   └── theme.ts                # 主题配置
│
├── pages/                       # 页面
│   ├── index/
│   │   └── index.vue           # 首页（入口检测）
│   ├── auth/
│   │   └── auth.vue            # 微信授权页
│   ├── register/
│   │   ├── register.vue        # 完善信息页
│   │   └── password.vue        # 设置密码（可选）
│   ├── agreement/
│   │   ├── user-agreement.vue  # 用户协议
│   │   └── privacy-policy.vue  # 隐私政策
│   └── profile/
│       └── index.vue           # 个人中心
│
├── static/                      # 静态资源
│   ├── images/
│   │   ├── logo.png
│   │   └── default-avatar.png
│   └── icons/
│
├── stores/                      # Pinia 状态管理
│   ├── modules/
│   │   ├── auth.ts             # 认证状态
│   │   ├── user.ts             # 用户状态
│   │   └── app.ts              # 应用状态
│   └── index.ts                # Store 入口
│
├── styles/                      # 全局样式
│   ├── variables.scss          # SCSS 变量
│   ├── mixins.scss             # SCSS 混入
│   ├── global.scss             # 全局样式
│   └── uni-ui.scss             # uni-ui 主题覆盖
│
├── types/                       # 类型定义
│   ├── user.ts                 # 用户相关类型
│   ├── api.ts                  # API 类型
│   └── common.ts               # 通用类型
│
├── utils/                       # 工具函数
│   ├── auth.ts                 # 认证工具
│   ├── crypto.ts               # 加密工具（RSA）
│   ├── storage.ts              # 存储封装
│   ├── validate.ts             # 校验工具
│   ├── date.ts                 # 日期工具
│   └── request.ts              # 请求工具
│
├── App.vue                      # 应用入口
├── main.ts                      # 应用初始化
├── manifest.json               # 应用配置
├── pages.json                  # 页面路由配置
├── uni.scss                    # uni 全局样式
└── vite.config.ts              # Vite 配置
```

---

## 3. 组件设计

### 3.1 组件分层

```
┌─────────────────────────────────────────────┐
│              页面层 (Pages)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │ 首页     │ │ 授权页   │ │ 注册页   │     │
│  │ index   │ │  auth   │ │register │     │
│  └────┬────┘ └────┬────┘ └────┬────┘     │
│       └───────────┼───────────┘           │
│                   ▼                        │
│  ┌─────────────────────────────────────┐  │
│  │         业务组件层 (Business)        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌────────┐ │  │
│  │  │协议勾选  │ │手机号   │ │性别选择 │ │  │
│  │  │Agreement│ │Phone    │ │Gender  │ │  │
│  │  └─────────┘ └─────────┘ └────────┘ │  │
│  └─────────────────────────────────────┘  │
│                   ▼                        │
│  ┌─────────────────────────────────────┐  │
│  │         基础组件层 (UI)              │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐  │  │
│  │  │ Button │ │ Input  │ │ Avatar │  │  │
│  │  └────────┘ └────────┘ └────────┘  │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 3.2 基础组件规范

#### AppButton

```typescript
interface AppButtonProps {
  type?: 'primary' | 'default' | 'success' | 'warning' | 'danger';
  size?: 'large' | 'medium' | 'small';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}

// 使用示例
<AppButton type="primary" block loading={isSubmitting}>
  完成注册
</AppButton>
```

#### AppInput

```typescript
interface AppInputProps {
  modelValue: string;
  type?: 'text' | 'password' | 'number' | 'tel';
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  maxlength?: number;
  clearable?: boolean;
  error?: string;
}

// 使用示例
<AppInput
  v-model="form.nickname"
  placeholder="请输入昵称"
  :maxlength="20"
  :error="errors.nickname"
/>
```

#### AppAvatar

```typescript
interface AppAvatarProps {
  src?: string;
  size?: 'small' | 'medium' | 'large';
  editable?: boolean;
  defaultSrc?: string;
}

// 使用示例
<AppAvatar
  :src="form.avatar"
  size="large"
  editable
  @change="onAvatarChange"
/>
```

---

## 4. 状态管理 (Pinia)

### 4.1 Store 结构

```
┌─────────────────────────────────────────────┐
│              Pinia Store                     │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   Auth Store │  │   User Store │        │
│  │              │  │              │        │
│  │ • token      │  │ • userInfo   │        │
│  │ • refreshToken│  │ • isLogin    │        │
│  │ • isLogin    │  │ • permissions│        │
│  │ • tempToken  │  │              │        │
│  │              │  │              │        │
│  │ Actions:     │  │ Actions:     │        │
│  │ • login()    │  │ • fetchInfo()│        │
│  │ • logout()   │  │ • updateInfo()│       │
│  │ • refresh()  │  │ • clear()    │        │
│  └──────────────┘  └──────────────┘        │
│                                              │
│  ┌──────────────┐                          │
│  │   App Store   │                          │
│  │              │                          │
│  │ • theme      │                          │
│  │ • platform   │                          │
│  │ • version    │                          │
│  │              │                          │
│  │ Actions:     │                          │
│  │ • init()     │                          │
│  │ • setTheme() │                          │
│  └──────────────┘                          │
└─────────────────────────────────────────────┘
```

### 4.2 Auth Store

```typescript
// stores/modules/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { storage } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string>('')
  const refreshToken = ref<string>('')
  const tempToken = ref<string>('')
  const isLogin = computed(() => !!token.value)

  // Actions
  const setToken = (newToken: string, newRefreshToken: string) => {
    token.value = newToken
    refreshToken.value = newRefreshToken
    storage.set('token', newToken, { expireSeconds: 7200 })
    storage.set('refreshToken', newRefreshToken, { expireSeconds: 7 * 24 * 3600 })
  }

  const setTempToken = (newTempToken: string) => {
    tempToken.value = newTempToken
    storage.set('tempToken', newTempToken, { expireSeconds: 600 })
  }

  const clearToken = () => {
    token.value = ''
    refreshToken.value = ''
    tempToken.value = ''
    storage.remove('token')
    storage.remove('refreshToken')
    storage.remove('tempToken')
  }

  const init = () => {
    token.value = storage.get('token') || ''
    refreshToken.value = storage.get('refreshToken') || ''
    tempToken.value = storage.get('tempToken') || ''
  }

  return {
    token,
    refreshToken,
    tempToken,
    isLogin,
    setToken,
    setTempToken,
    clearToken,
    init
  }
})
```

### 4.3 User Store

```typescript
// stores/modules/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  // State
  const userInfo = ref<User | null>(null)
  const isLogin = computed(() => !!userInfo.value)

  // Getters
  const displayName = computed(() => {
    return userInfo.value?.nickname || '未命名用户'
  })

  const avatarUrl = computed(() => {
    return userInfo.value?.avatar || '/static/images/default-avatar.png'
  })

  // Actions
  const setUserInfo = (info: User) => {
    userInfo.value = info
    storage.set('userInfo', info)
  }

  const clearUserInfo = () => {
    userInfo.value = null
    storage.remove('userInfo')
  }

  const init = () => {
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
    init
  }
})
```

---

## 5. 路由设计

### 5.1 页面路由配置

```json
// pages.json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "BlissTribe"
      }
    },
    {
      "path": "pages/auth/auth",
      "style": {
        "navigationBarTitleText": "授权登录",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/register/register",
      "style": {
        "navigationBarTitleText": "完善信息"
      }
    },
    {
      "path": "pages/register/password",
      "style": {
        "navigationBarTitleText": "设置密码"
      }
    },
    {
      "path": "pages/agreement/user-agreement",
      "style": {
        "navigationBarTitleText": "用户协议"
      }
    },
    {
      "path": "pages/agreement/privacy-policy",
      "style": {
        "navigationBarTitleText": "隐私政策"
      }
    }
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的"
      }
    ]
  }
}
```

### 5.2 鉴权策略（三层防护）

```typescript
// utils/auth-guard.ts

/**
 * 第一层：启动态恢复
 * 应用启动时从 Storage 恢复登录态
 */
export function restoreAuthState(): void {
  const authStore = useAuthStore()
  authStore.init()
  const userStore = useUserStore()
  userStore.init()
}

/**
 * 第二层：页面级鉴权
 * 在需要登录的页面 onLoad 中调用
 */
export function requireAuth(): boolean {
  const authStore = useAuthStore()
  if (!authStore.isLogin) {
    uni.redirectTo({ url: '/pages/auth/auth' })
    return false
  }
  return true
}

/**
 * 第三层：请求 401 兜底
 * 已在 request.ts 拦截器中实现
 * Token 过期时自动刷新，刷新失败跳转登录
 */

// 页面使用示例
// pages/profile/index.vue
onLoad(() => {
  if (!requireAuth()) return
  // 加载用户数据
})
```

---

## 6. 请求封装

### 6.1 请求拦截器

```typescript
// api/request.ts
import { useAuthStore } from '@/stores/modules/auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  loading?: boolean
}

export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const authStore = useAuthStore()

    if (options.loading) {
      uni.showLoading({ title: '加载中...' })
    }

    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': authStore.token,
        ...options.header
      },
      success: (res) => {
        const data = res.data as any

        if (data.code === 200) {
          resolve(data.data)
        } else if (data.code === 401001 || data.code === 401002) {
          // Token 过期，尝试刷新
          refreshToken().then(() => {
            // 重试原请求
            request(options).then(resolve).catch(reject)
          }).catch(() => {
            authStore.clearToken()
            uni.redirectTo({ url: '/pages/auth/auth' })
            reject(new Error('登录已过期'))
          })
        } else {
          uni.showToast({
            title: data.message || '请求失败',
            icon: 'none'
          })
          reject(new Error(data.message))
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络错误',
          icon: 'none'
        })
        reject(err)
      },
      complete: () => {
        if (options.loading) {
          uni.hideLoading()
        }
      }
    })
  })
}

let isRefreshing = false
let refreshPromise: Promise<void> | null = null

async function refreshToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = new Promise((resolve, reject) => {
    const authStore = useAuthStore()
    // 使用裸请求，避免递归触发刷新
    uni.request({
      url: `${BASE_URL}/auth/refresh-token`,
      method: 'POST',
      data: { refreshToken: authStore.refreshToken },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const data = res.data as any
        if (data.code === 200) {
          authStore.setToken(data.data.token, data.data.refreshToken)
          resolve()
        } else {
          authStore.clearToken()
          uni.redirectTo({ url: '/pages/auth/auth' })
          reject(new Error('登录已过期'))
        }
      },
      fail: () => {
        authStore.clearToken()
        uni.redirectTo({ url: '/pages/auth/auth' })
        reject(new Error('刷新失败'))
      },
      complete: () => {
        isRefreshing = false
        refreshPromise = null
      }
    })
  })

  return refreshPromise
}
```

---

## 7. 工具函数

### 7.1 认证工具

```typescript
// utils/auth.ts
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
```

### 7.2 加密工具

```typescript
// utils/crypto.ts
import { JSEncrypt } from 'jsencrypt'

let publicKey = ''

export async function getPublicKey(): Promise<string> {
  if (publicKey) return publicKey

  const res = await request({ url: '/auth/rsa-public-key' })
  publicKey = res.publicKey
  return publicKey
}

export async function encryptPassword(password: string): Promise<string> {
  const key = await getPublicKey()
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(key)
  const encrypted = encryptor.encrypt(password)
  if (!encrypted) throw new Error('加密失败')
  return encrypted
}
```

### 7.3 存储工具

```typescript
// utils/storage.ts
// 统一本地存储封装：key 前缀 + 过期时间 + 清理
// 不提供强加密；敏感数据不放本地，靠服务端短有效期 Token + 可吊销保障安全

const PREFIX = 'blisstribe_'

interface StorageMeta {
  value: any
  expireAt?: number  // 时间戳(ms)，undefined 表示永不过期
}

export const storage = {
  set<T>(key: string, value: T, opts?: { expireSeconds?: number }): void {
    const meta: StorageMeta = { value }
    if (opts?.expireSeconds) {
      meta.expireAt = Date.now() + opts.expireSeconds * 1000
    }
    uni.setStorageSync(PREFIX + key, JSON.stringify(meta))
  },

  get<T>(key: string): T | null {
    const raw = uni.getStorageSync(PREFIX + key)
    if (!raw) return null
    try {
      const meta: StorageMeta = JSON.parse(raw)
      if (meta.expireAt && meta.expireAt < Date.now()) {
        uni.removeStorageSync(PREFIX + key)
        return null
      }
      return meta.value as T
    } catch {
      return null
    }
  },

  remove(key: string): void {
    uni.removeStorageSync(PREFIX + key)
  },

  clear(): void {
    // 只清除带本项目前缀的 key
    const info = uni.getStorageInfoSync()
    info.keys.forEach((k) => {
      if (k.startsWith(PREFIX)) uni.removeStorageSync(k)
    })
  }
}
```

> **安全声明**：小程序 `uni.getStorageSync` 不提供强加密保证。本封装只做 key 隔离、过期管理和清理，不承诺加密。敏感数据（手机号、openid）不存储在本地。

### 7.4 校验工具

```typescript
// utils/validate.ts
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function isValidNickname(nickname: string): boolean {
  return nickname.length >= 2 && nickname.length <= 20
}

export function isValidPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password)
}

export function isSensitiveWord(word: string): boolean {
  // 敏感词检测（可对接敏感词服务）
  const sensitiveWords = ['敏感词1', '敏感词2']
  return sensitiveWords.some(w => word.includes(w))
}
```

---

## 8. 主题设计

### 8.1 CSS 变量

```scss
// styles/variables.scss
:root {
  // 主色调
  --color-primary: #07c160;
  --color-primary-light: #4cd964;
  --color-primary-dark: #06ad56;

  // 辅助色
  --color-success: #07c160;
  --color-warning: #ffbe00;
  --color-danger: #fa5151;
  --color-info: #10aeff;

  // 文字色
  --color-text: #333333;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-text-placeholder: #cccccc;

  // 背景色
  --color-bg: #f5f5f5;
  --color-bg-white: #ffffff;
  --color-bg-gray: #f2f2f2;

  // 边框色
  --color-border: #e5e5e5;

  // 间距
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  // 圆角
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-round: 9999px;

  // 字体
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;

  // 阴影
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

### 8.2 混入

```scss
// styles/mixins.scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 9. 构建配置

### 9.1 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  build: {
    minify: true,
    sourcemap: false
  }
})
```

### 9.2 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ESNext", "DOM"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

---

**文档版本**: v1.0
**创建日期**: 2026-07-01
**作者**: AI Assistant
