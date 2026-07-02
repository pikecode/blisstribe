# 小程序注册功能 PRD

## 1. 项目概述

### 1.1 项目背景
基于 UniApp 框架开发微信小程序，实现用户注册功能。注册流程采用微信授权优先：用户先通过微信授权获取基本信息和手机号，然后补充填写个人资料完成注册。

### 1.2 目标平台
- 微信小程序（主平台）
- 后续可扩展：H5、App

### 1.3 核心功能
- 微信授权登录（获取 openid/unionid）
- 微信授权获取手机号（免短信验证码）
- 填写用户基本信息（昵称、头像等）
- 用户协议与隐私政策确认
- 注册成功后的自动登录

---

## 2. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | UniApp 3.x + Vue 3 | 跨端开发框架 |
| 语言 | TypeScript | 类型安全 |
| UI 组件 | uni-ui / 自定义组件 | 官方组件库 + 自定义 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 网络请求 | uni.request 封装 | 统一请求拦截 |
| 样式 | SCSS / CSS Variables | 主题色管理 |

---

## 3. 注册流程

### 3.1 注册流程图

```
┌─────────────┐
│  进入小程序  │
└──────┬──────┘
       ▼
┌─────────────┐
│ 微信授权登录 │ ←── 调用 wx.login + getUserProfile
│ 获取 openid │
└──────┬──────┘
       ▼
┌─────────────┐
│ 是否已注册？ │
└──────┬──────┘
       │
   是 ─┼─→ 直接登录 → 跳转首页
       │
   否 ─┘
       ▼
┌─────────────┐
│ 授权获取手机号│ ←── 调用 getPhoneNumber
│ 获取手机号   │
└──────┬──────┘
       ▼
┌─────────────┐
│ 填写基本信息 │ ←── 昵称、头像、性别等
│ （可选）     │
└──────┬──────┘
       ▼
┌─────────────┐
│ 同意用户协议 │
└──────┬──────┘
       ▼
┌─────────────┐
│  提交注册    │ ──→ 注册 API（密码 RSA 加密，可选）
└──────┬──────┘
       ▼
┌─────────────┐
│  注册成功    │ ──→ 自动登录 → 跳转首页
└─────────────┘
```

### 3.2 页面流程

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页/入口 | `/pages/index/index` | 小程序首页，检测登录状态 |
| 授权页 | `/pages/auth/auth` | 微信授权引导页（获取用户信息） |
| 注册页 | `/pages/register/register` | 填写基本信息 + 同意协议 |
| 用户协议 | `/pages/agreement/user-agreement` | 用户服务协议 |
| 隐私政策 | `/pages/agreement/privacy-policy` | 隐私保护政策 |

---

## 4. 页面设计

### 4.1 授权页（auth.vue）

引导用户进行微信授权，获取基本信息。

#### 布局结构
```
┌─────────────────────────────┐
│                             │
│         Logo / 品牌图        │
│                             │
│    欢迎使用 BlissTribe     │
│                             │
│  授权后即可体验完整功能       │
│                             │
│  ┌───────────────────────┐  │
│  │    微信一键授权       │  │  ← 绿色按钮
│  └───────────────────────┘  │
│                             │
│  登录即表示您同意             │
│  《用户协议》和《隐私政策》   │
│                             │
└─────────────────────────────┘
```

#### 交互行为

1. **微信一键授权按钮**
   - 使用 `<button open-type="getUserInfo">` 或 `uni.getUserProfile`
   - 获取用户昵称、头像、性别等基本信息
   - 同时调用 `uni.login` 获取 code，换取 openid/unionid
   - 授权成功后调用后端 `/api/v1/auth/wechat-login` 接口

2. **登录状态检测**
   - 页面加载时检测本地是否有 token
   - 有 token 且有效：直接跳转首页
   - 无 token 或过期：显示授权引导

### 4.2 注册页（register.vue）

微信新用户补充基本信息完成注册。

#### 布局结构
```
┌─────────────────────────────┐
│                             │
│         完善个人信息         │
│                             │
│        ┌─────────┐          │
│        │  头像   │          │ ← 点击选择/拍摄头像
│        │  (相机) │          │
│        └─────────┘          │
│                             │
│  ┌───────────────────────┐  │
│  │ 👤 昵称               │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 📱 手机号 (已授权)    │  │ ← 从微信获取，不可编辑
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ ⚧ 性别               │  │ ← 单选：男/女/保密
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🎂 生日（可选）       │  │
│  └───────────────────────┘  │
│                             │
│  [ ] 我已阅读并同意          │
│      《用户协议》和《隐私政策》│
│                             │
│  ┌───────────────────────┐  │
│  │      完成注册         │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

#### 表单字段

| 字段 | 类型 | 必填 | 来源/说明 |
|------|------|------|----------|
| 头像 | image | 是 | 从微信获取或用户上传 |
| 昵称 | text | 是 | 从微信获取，可修改 |
| 手机号 | text | 是 | 微信授权获取，只读展示 |
| 性别 | radio | 否 | 男/女/保密 |
| 生日 | date | 否 | 日期选择器 |
| 用户协议 | checkbox | 是 | 必须勾选 |

#### 交互行为

1. **头像**
   - 默认显示微信头像
   - 点击弹出选择：相册选取 / 拍照
   - 选择后上传至服务器获取 URL

2. **昵称**
   - 默认填充微信昵称
   - 支持修改，2-20 个字符
   - 实时校验敏感词

3. **手机号**
   - 从微信 `getPhoneNumber` 授权获取
   - 页面只读展示，不可编辑
   - 显示格式：`138****8000`

4. **性别**
   - 默认从微信获取
   - 支持修改：男 / 女 / 保密

5. **生日**
   - 可选填写
   - 使用 uni-datetime-picker
   - 限制范围：1900-01-01 至今天

6. **完成注册按钮**
   - 必填项校验通过前禁用
   - 点击后显示 loading 状态
   - 防止重复提交
   - 密码不在注册流程中设置，注册后通过独立接口设置（见 4.3）

### 4.3 密码设置（注册后独立接口）

注册成功后，用户可在个人设置中独立设置登录密码（用于非微信场景登录）。

```
┌─────────────────────────────┐
│       设置登录密码          │
│                             │
│  ┌───────────────────────┐  │
│  │ 🔒 设置密码           │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🔒 确认密码           │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │      确认设置         │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

- 密码 8-20 位，含字母+数字
- 提交前 RSA 加密
- 独立接口：`PUT /api/v1/user/password`
- 需要登录态（携带 Access Token）

### 4.4 用户协议 / 隐私政策页

- 富文本展示协议内容
- 支持滚动阅读
- 底部"我已阅读并同意"按钮（可选）

---

## 5. API 接口

### 5.1 微信登录/检测

```
POST /api/v1/auth/wechat-login
```

**请求参数：**
```json
{
  "code": "wx_login_code_xxx",
  "userInfo": {
    "nickName": "微信用户",
    "avatarUrl": "https://...",
    "gender": 1,
    "country": "CN",
    "province": "...",
    "city": "..."
  }
}
```

**响应（老用户 - 直接登录）：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "isNewUser": false,
    "token": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "...",
    "userInfo": {
      "id": 10001,
      "phone": "138****8000",
      "nickname": "微信用户",
      "avatar": "https://...",
      "gender": 1,
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**响应（新用户 - 需要完善信息）：**
```json
{
  "code": 200,
  "message": "需要完善信息",
  "data": {
    "isNewUser": true,
    "wxOpenId": "oXXXXX...",
    "wxUnionId": "oYYYYY...",
    "tempToken": "temp_xxx...",
    "userInfo": {
      "nickName": "微信用户",
      "avatarUrl": "https://...",
      "gender": 1
    }
  }
}
```

### 5.2 获取微信手机号

```
POST /api/v1/auth/wechat-phone
```

**请求参数：**
```json
{
  "tempToken": "temp_xxx...",
  "code": "getPhoneNumber_code_xxx"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "phone": "13800138000",
    "phoneEncrypted": "138****8000"
  }
}
```

### 5.3 用户注册（完善信息）

```
POST /api/v1/auth/register
```

**请求参数：**
```json
{
  "tempToken": "temp_xxx...",
  "nickname": "用户昵称",
  "avatar": "https://cdn.example.com/avatar/xxx.jpg",
  "gender": 1,
  "birthday": "1990-01-01",
  "agreement": true
}
```

> **注意**：手机号由后端从临时注册态读取，客户端不提交 phone 字段。密码不在注册流程中设置，注册后通过独立接口设置。

**响应：**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "...",
    "userInfo": {
      "id": 10001,
      "phone": "138****8000",
      "nickname": "用户昵称",
      "avatar": "https://...",
      "gender": 1,
      "birthday": "1990-01-01",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 5.4 上传头像

```
POST /api/v1/upload/avatar
```

**请求参数：**
- Content-Type: multipart/form-data
- file: 图片文件

**响应：**
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://cdn.example.com/avatar/xxx.jpg"
  }
}
```

### 5.5 获取 RSA 公钥

```
GET /api/v1/auth/rsa-public-key
```

**响应：**
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
  }
}
```

### 5.6 错误码定义

| 错误码 | 含义 | 场景 |
|--------|------|------|
| 400001 | 微信授权失败 | code 无效或过期 |
| 400002 | 获取手机号失败 | 用户拒绝授权或 code 无效 |
| 400003 | 昵称格式错误 | 昵称不符合规则（2-20字符） |
| 400004 | 昵称包含敏感词 | 昵称包含违禁词汇 |
| 400005 | 头像上传失败 | 图片格式/大小不符合要求 |
| 400006 | 未同意用户协议 | 未勾选协议 |
| 400007 | 手机号已注册 | 该手机号已绑定其他账号 |
| 400008 | 密码强度不足 | 密码不符合规则（注册后设置） |
| 400009 | tempToken 无效或过期 | 临时令牌失效 |
| 500001 | 微信服务异常 | 微信接口调用失败 |
| 500002 | 文件上传失败 | 存储服务异常 |

---

## 6. 数据模型

### 6.1 用户信息 (User)

```typescript
interface User {
  id: number;           // 用户ID
  phone: string;        // 手机号（脱敏展示）
  nickname: string;     // 昵称
  avatar: string;       // 头像URL
  gender: Gender;       // 性别
  birthday?: string;    // 生日（可选）
  status: UserStatus;   // 用户状态
  wxOpenId?: string;   // 微信 openid
  wxUnionId?: string;  // 微信 unionid
  createdAt: string;    // 注册时间
}

enum Gender {
  UNKNOWN = 0,  // 保密
  MALE = 1,     // 男
  FEMALE = 2,   // 女
}

enum UserStatus {
  ACTIVE = 'active',     // 正常
  DISABLED = 'disabled', // 禁用
  PENDING = 'pending',   // 待完善信息
}
```

### 6.2 注册表单

```typescript
interface RegisterForm {
  nickname: string;
  avatar: string;
  gender: Gender;
  birthday?: string;
  agreement: boolean;
}
```

### 6.3 微信授权信息

```typescript
interface WechatUserInfo {
  nickName: string;
  avatarUrl: string;
  gender: Gender;
  country: string;
  province: string;
  city: string;
}

interface WechatLoginResponse {
  isNewUser: boolean;
  token?: string;
  refreshToken?: string;
  tempToken?: string;
  userInfo?: User;
  wxUserInfo?: WechatUserInfo;
  wxOpenId?: string;
  wxUnionId?: string;
}
```

### 6.4 API 响应

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface RegisterResponse {
  token: string;
  refreshToken: string;
  userInfo: User;
}
```

---

## 7. 安全要求

### 7.1 数据传输
- 所有接口使用 HTTPS
- Token 存储使用 uni.getStorageSync（微信基础存储，非强加密）
- tempToken 有效期 10 分钟，仅用于注册流程

### 7.2 密码安全（注册后独立设置）
- 密码不在注册流程中提交，注册成功后通过独立接口设置
- 设置密码时，前端传输前必须进行 RSA 加密
- 流程：
  1. 页面加载时调用 `/api/v1/auth/rsa-public-key` 获取 RSA 公钥
  2. 用户输入密码后，使用 JSEncrypt 库进行 RSA 加密
  3. 提交时传输加密后的密文（Base64 编码）
  4. 后端使用私钥解密后处理
- 密码强度校验：8-20位，必须包含字母和数字

### 7.3 微信授权安全
- 微信 code 只能使用一次，5分钟过期
- 后端使用 code 调用微信接口换取手机号（新版手机号能力）
- session_key 不在前端暴露

### 7.4 防刷机制
- 同一微信 openid 注册频率限制
- IP 频率限制
- 图形验证码（高频触发时可选）

---

## 8. 性能要求

| 指标 | 目标 |
|------|------|
| 页面首屏加载 | < 1.5s |
| 微信授权响应 | < 2s |
| 注册提交响应 | < 3s |
| 头像上传 | < 5s |
| 表单校验反馈 | 即时（< 100ms） |

---

## 9. 兼容性

| 平台 | 版本要求 |
|------|---------|
| 微信基础库 | >= 2.19.0 |
| iOS | >= 10 |
| Android | >= 5.0 |

---

## 10. 验收标准

### 10.1 功能验收

- [ ] 未登录用户进入小程序显示授权引导页
- [ ] 已登录用户直接进入首页
- [ ] 微信授权成功获取用户基本信息（昵称、头像、性别）
- [ ] 微信授权获取手机号成功
- [ ] 新用户跳转完善信息页面，预填微信信息
- [ ] 昵称可修改，实时校验长度和敏感词
- [ ] 头像默认微信头像，支持重新上传
- [ ] 手机号只读展示，不可编辑
- [ ] 性别默认微信性别，支持修改
- [ ] 生日可选填写
- [ ] 未勾选协议无法注册
- [ ] 注册成功后自动登录并跳转首页
- [ ] Token 正确存储，后续请求携带 Token
- [ ] 密码不在注册流程中设置，注册后通过独立接口设置

### 10.2 体验验收

- [ ] 授权引导页简洁明了，用户理解操作
- [ ] 微信授权弹窗触发正常
- [ ] 表单输入流畅，无卡顿
- [ ] 头像上传有进度提示
- [ ] 错误提示清晰，位置合理
- [ ] 加载状态明确
- [ ] 页面适配不同屏幕尺寸
- [ ] 弱网环境下有友好提示

---

## 11. 后续迭代计划

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | 短信验证码注册 | 非微信场景的手机号+验证码注册 |
| P1 | 图形验证码 | 高频场景防刷 |
| P2 | 邀请码注册 | 支持邀请码机制 |
| P2 | 注册奖励 | 新用户注册送优惠券 |
| P3 | 多语言支持 | 中英文切换 |

---

**文档版本**: v2.1
**更新日期**: 2026-07-01
**修订说明**: 根据评审意见修订 — 统一微信手机号 code 模式、注册接口去掉 phone 字段、密码改为注册后独立接口设置
