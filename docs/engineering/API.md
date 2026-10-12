# API 设计文档

## 1. 概述

### 1.1 文档目的
本文档详细定义 BlissTribe 小程序后端 API 接口规范，包括请求/响应格式、参数说明、错误处理等。

### 1.2 基础信息

| 项目 | 说明 |
|------|------|
| 协议 | HTTPS |
| 格式 | JSON |
| 编码 | UTF-8 |
| 基础路径 | `https://api.blisstribe.com/api/v1` |
| 请求方式 | GET / POST / PUT / DELETE |

### 1.3 通用请求头

```
Content-Type: application/json
Authorization: Bearer {token}
X-Request-ID: {uuid}
X-App-Version: 1.0.0
X-Platform: wechat-mp
```

---

## 2. 认证模块 (Auth)

### 2.1 微信登录

**接口地址**
```
POST /auth/wechat-login
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | wx.login 获取的 code |
| userInfo | object | 否 | 用户基本信息（前端直接获取，非加密） |

**请求示例**
```json
{
  "code": "071kT10000xxxxxxxx",
  "userInfo": {
    "nickName": "微信用户",
    "avatarUrl": "https://thirdwx.qlogo.cn/xxx",
    "gender": 1,
    "country": "CN",
    "province": "Guangdong",
    "city": "Shenzhen"
  }
}
```

**响应参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| isNewUser | boolean | 是否新用户 |
| token | string | 访问令牌（老用户） |
| refreshToken | string | 刷新令牌（老用户） |
| tempToken | string | 临时令牌（新用户） |
| userInfo | object | 用户信息 |
| wxUserInfo | object | 微信用户信息（新用户） |

**响应示例（老用户）**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "isNewUser": false,
    "token": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
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

**响应示例（新用户）**
```json
{
  "code": 200,
  "message": "需要完善信息",
  "data": {
    "isNewUser": true,
    "tempToken": "temp_xxx...",
    "wxOpenId": "oXXXXX...",
    "wxUnionId": "oYYYYY...",
    "userInfo": {
      "nickName": "微信用户",
      "avatarUrl": "https://...",
      "gender": 1
    }
  }
}
```

---

### 2.2 获取微信手机号

**接口地址**
```
POST /auth/wechat-phone
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tempToken | string | 是 | 临时令牌 |
| code | string | 是 | getPhoneNumber 获取的 code |

> **说明**：后端使用 code 调用微信接口换取手机号，无需前端传递 encryptedData/iv。

**请求示例**
```json
{
  "tempToken": "temp_xxx...",
  "code": "e5f5c0e0..."
}
```

**响应示例**
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

---

### 2.3 用户注册

**接口地址**
```
POST /auth/register
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tempToken | string | 是 | 临时令牌 |
| nickname | string | 是 | 用户昵称（2-20字符） |
| avatar | string | 是 | 头像URL |
| gender | number | 否 | 性别（0保密 1男 2女） |
| birthday | string | 否 | 生日（YYYY-MM-DD） |
| agreement | boolean | 是 | 是否同意协议 |

> **注意**：手机号由后端从临时注册态读取，客户端不提交 phone 字段。

**请求示例**
```json
{
  "tempToken": "temp_xxx...",
  "nickname": "小明",
  "avatar": "https://cdn.example.com/avatar/xxx.jpg",
  "gender": 1,
  "birthday": "1990-01-01",
  "agreement": true
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": {
      "id": 10001,
      "phone": "138****8000",
      "nickname": "小明",
      "avatar": "https://...",
      "gender": 1,
      "birthday": "1990-01-01",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### 2.4 获取 RSA 公钥

**接口地址**
```
GET /auth/rsa-public-key
```

**请求参数**: 无

**响应示例**
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
    "keyId": "key_xxx"
  }
}
```

---

### 2.5 刷新 Token

**接口地址**
```
POST /auth/refresh-token
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

**响应示例**
```json
{
  "code": 200,
  "message": "刷新成功",
  "data": {
    "token": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200
  }
}
```

---

### 2.6 退出登录

**接口地址**
```
POST /auth/logout
```

**请求头**
```
Authorization: Bearer {token}
```

**响应示例**
```json
{
  "code": 200,
  "message": "退出成功",
  "data": null
}
```

---

## 3. 用户模块 (User)

### 3.1 获取用户信息

**接口地址**
```
GET /user/info
```

**请求头**
```
Authorization: Bearer {token}
```

**响应示例**
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "id": 10001,
    "phone": "138****8000",
    "nickname": "小明",
    "avatar": "https://...",
    "gender": 1,
    "birthday": "1990-01-01",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 3.2 更新用户信息

**接口地址**
```
PUT /user/info
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称（2-20字符） |
| avatar | string | 否 | 头像URL |
| gender | number | 否 | 性别 |
| birthday | string | 否 | 生日 |

**响应示例**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 10001,
    "nickname": "新昵称",
    "avatar": "https://...",
    "gender": 1,
    "birthday": "1990-01-01"
  }
}
```

### 3.3 设置密码

**接口地址**
```
PUT /user/password
```

**请求头**
```
Authorization: Bearer {token}
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| password | string | 是 | 密码（RSA加密后） |
| confirmPassword | string | 是 | 确认密码（RSA加密后） |

> **注意**：密码需先使用 RSA 公钥加密，再提交密文。

**请求示例**
```json
{
  "password": "encryptedPasswordBase64",
  "confirmPassword": "encryptedPasswordBase64"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "密码设置成功",
  "data": null
}
```

---

## 4. 文件模块 (File)

### 4.1 上传头像

**接口地址**
```
POST /upload/avatar
```

**请求头**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 图片文件（jpg/png，最大2MB） |

**响应示例**
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://cdn.example.com/avatar/xxx.jpg",
    "width": 200,
    "height": 200,
    "size": 10240
  }
}
```

---

## 5. 错误码定义

### 5.1 认证错误 (4xx)

| 错误码 | 含义 | HTTP 状态码 | 场景 |
|--------|------|------------|------|
| 400001 | 微信授权失败 | 400 | code 无效或过期 |
| 400002 | 获取手机号失败 | 400 | 用户拒绝授权或 code 无效 |
| 400003 | 昵称格式错误 | 400 | 昵称不符合规则 |
| 400004 | 昵称包含敏感词 | 400 | 昵称包含违禁词汇 |
| 400005 | 头像上传失败 | 400 | 图片格式/大小不符合 |
| 400006 | 未同意用户协议 | 400 | 未勾选协议 |
| 400007 | 手机号已注册 | 400 | 该手机号已绑定 |
| 400008 | 密码强度不足 | 400 | 密码不符合规则 |
| 400009 | tempToken 无效 | 400 | 临时令牌失效或过期 |
| 400010 | 参数校验失败 | 400 | 请求参数错误 |
| 401001 | Token 无效 | 401 | Token 格式错误或已过期 |
| 401002 | Token 已过期 | 401 | 需要刷新 Token |
| 401003 | 未登录 | 401 | 缺少 Token |
| 403001 | 权限不足 | 403 | 无权限访问 |
| 404001 | 用户不存在 | 404 | 用户未找到 |
| 404002 | 资源不存在 | 404 | 请求的资源不存在 |
| 429001 | 请求过于频繁 | 429 | 触发限流 |

### 5.2 系统错误 (5xx)

| 错误码 | 含义 | HTTP 状态码 | 场景 |
|--------|------|------------|------|
| 500001 | 微信服务异常 | 500 | 微信接口调用失败 |
| 500002 | 文件上传失败 | 500 | 存储服务异常 |
| 500003 | 数据库错误 | 500 | 数据库操作失败 |
| 500004 | 缓存错误 | 500 | Redis 操作失败 |
| 500005 | 系统内部错误 | 500 | 未知异常 |

---

## 6. 数据模型

### 6.1 统一响应

```typescript
interface ApiResponse<T> {
  code: number;       // 业务状态码
  message: string;     // 提示信息
  data: T;            // 业务数据
  timestamp: number;   // 时间戳
  requestId: string;   // 请求追踪ID
}
```

### 6.2 分页响应

```typescript
interface PageResponse<T> {
  list: T[];          // 数据列表
  total: number;      // 总记录数
  page: number;       // 当前页码
  pageSize: number;   // 每页数量
  totalPages: number; // 总页数
}
```

### 6.3 用户信息

```typescript
interface User {
  id: number;
  phone: string;        // 脱敏展示
  nickname: string;
  avatar: string;
  gender: number;       // 0保密 1男 2女
  birthday?: string;
  status: 'active' | 'disabled' | 'pending';
  wxOpenId?: string;
  wxUnionId?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

**文档版本**: v1.0
**创建日期**: 2026-07-01
**作者**: AI Assistant
