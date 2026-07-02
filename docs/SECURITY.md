# 安全设计文档

## 1. 概述

### 1.1 文档目的
本文档定义 BlissTribe 小程序的安全策略，包括认证授权、数据加密、传输安全、存储安全和防攻击措施。

### 1.2 安全原则

- **最小权限**：每个组件只拥有完成任务所需的最小权限
- **纵深防御**：多层安全防护，单点失效不导致整体崩溃
- **安全默认**：默认配置安全，不安全选项需显式开启
- **不可信输入**：所有外部输入都视为不可信，需校验和过滤

---

## 2. 认证与授权

### 2.1 认证流程

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  用户    │────►│ 小程序  │────►│ 后端服务 │────►│ 微信服务器│
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │                              │
     │ 1. 点击授权                   │ 2. 调用 wx.login
     │                              │    获取 code
     │                              │
     │                              │ 3. 发送 code + 可选 userInfo
     │                              │    到后端 /auth/wechat-login
     │                              │
     │                              │ 4. 后端调用微信接口
     │                              │    code2session
     │                              │    换取 openid/unionid/session_key
     │                              │
     │                              │ 5. 返回用户信息
     │                              │    + Token
     │                              │
     │ 6. 存储 Token                 │
     │    跳转首页                   │
```

### 2.2 Token 设计

| 类型 | 说明 | 有效期 | 存储位置 |
|------|------|--------|---------|
| Access Token | 访问令牌 | 2小时 | 内存 + Storage |
| Refresh Token | 刷新令牌 | 7天 | Storage（加密） |
| Temp Token | 临时令牌 | 10分钟 | 内存 |

### 2.3 Token 生成规则

```
Access Token:  JWT (HS256)
  Payload: { userId, jti, platform, iat, exp }
  Secret:  32位随机字符串
  说明:   不含手机号等敏感数据；需展示手机号时走 /user/info 返回脱敏值

Refresh Token: JWT (HS256)
  Payload: { userId, jti, iat, exp }
  Secret:  独立的32位随机字符串

Temp Token:    随机字符串
  Format: temp_{uuid}_{timestamp}
```

### 2.4 授权校验流程

```
用户请求 ──► API网关 ──► Token校验
                              │
                              ▼
                    ┌─────────────────┐
                    │ Token 是否有效？ │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                 有效               无效
                    │                 │
                    ▼                 ▼
              放行请求          是否 Refresh Token？
                                    │
                           ┌────────┴────────┐
                           ▼                 ▼
                        有                  无
                           │                 │
                           ▼                 ▼
                     刷新 Token         返回 401
                     重试请求           跳转登录
```

---

## 3. 数据加密

### 3.1 加密策略

| 数据 | 加密方式 | 说明 |
|------|---------|------|
| 密码 | RSA + bcrypt | 前端 RSA 加密，后端 bcrypt 哈希 |
| Token | JWT | HS256 签名 |
| 手机号 | AES-256-GCM | 数据库存储加密 |
| 敏感信息 | AES-256-GCM | 数据库字段级加密 |
| 传输数据 | TLS 1.3 | HTTPS 传输 |

### 3.2 RSA 加密流程

```
┌─────────────────────────────────────────┐
│              RSA 加密流程               │
└─────────────────────────────────────────┘

前端：
  1. 页面加载时请求 /auth/rsa-public-key
  2. 获取公钥 publicKey
  3. 用户输入密码
  4. 使用 jsencrypt 加密：
     encrypted = RSA_ENCRYPT(password, publicKey)
  5. Base64 编码后提交

后端：
  1. 接收加密后的密码
  2. 使用私钥解密：
     password = RSA_DECRYPT(encrypted, privateKey)
  3. bcrypt 哈希存储：
     passwordHash = BCRYPT_HASH(password, saltRounds=12)
```

### 3.3 密钥管理

| 密钥 | 生成方式 | 存储位置 | 轮换周期 |
|------|---------|---------|---------|
| RSA 公钥 | OpenSSL 生成 | 数据库 + 缓存 | 30天 |
| RSA 私钥 | OpenSSL 生成 | 服务器环境变量 | 30天 |
| JWT Secret | 随机生成 | 服务器环境变量 | 90天 |
| AES Key | 随机生成 | 服务器环境变量 + KMS | 90天 |

---

## 4. 传输安全

### 4.1 HTTPS 配置

```nginx
# Nginx SSL 配置
server {
    listen 443 ssl http2;
    server_name api.blisstribe.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:...;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4.2 安全响应头

| 响应头 | 值 | 说明 |
|--------|-----|------|
| Strict-Transport-Security | max-age=31536000 | HSTS |
| X-Content-Type-Options | nosniff | 防止 MIME 嗅探 |
| X-Frame-Options | DENY | 防止点击劫持 |
| X-XSS-Protection | 1; mode=block | XSS 防护 |
| Content-Security-Policy | default-src 'self' | CSP |
| Referrer-Policy | strict-origin-when-cross-origin |  referrer 策略 |

---

## 5. 存储安全

### 5.1 本地存储策略

> **安全声明**：小程序 `uni.getStorageSync` 不提供强加密保证。安全策略以"服务端可控、缩短有效期、敏感信息不放本地"为核心。

| 数据 | 存储方式 | 说明 |
|------|---------|------|
| Access Token | uni.getStorageSync | 短期（2小时），内存优先 |
| Refresh Token | uni.getStorageSync | 有效期 7 天，服务端可吊销 |
| 用户信息 | uni.getStorageSync | 非敏感信息（昵称、头像） |
| 配置信息 | uni.getStorageSync | 应用配置 |

**安全策略：**
- Access Token 有效期短（2小时），减少泄露风险
- Refresh Token 服务端存储哈希值，支持主动吊销
- 敏感数据（手机号、openid）不存储在本地
- 退出登录时清除所有本地存储
- 异常设备登录触发 Refresh Token 失效

### 5.2 存储封装

存储封装实现见 [前端架构 - 7.3 存储工具](./FRONTEND.md#73-存储工具)。封装只提供 **key 前缀隔离 + 过期时间 + 清理**，不提供强加密。所有 Store（Auth/User）统一通过 `storage` 工具读写本地数据，不直接调用 `uni.setStorageSync`。

**关键约束：**
- 不在前端存储敏感数据（手机号、openid、session_key）
- Token 靠短有效期 + 服务端吊销保障安全，不依赖前端加密
- 退出登录时调用 `storage.clear()` 清除本项目所有 key

---

## 6. 防攻击措施

### 6.1 常见攻击防护

| 攻击类型 | 防护措施 | 实现方式 |
|---------|---------|---------|
| SQL 注入 | 参数化查询 | ORM + Prepared Statement |
| XSS | 输入过滤 + 输出编码 | 富文本过滤 + HTML 转义 |
| CSRF | Token 校验 | 请求头携带 Token |
| 中间人攻击 | HTTPS + 证书校验 | TLS 1.3 + 证书固定 |
| 重放攻击 | 时间戳 + nonce | 请求包含 timestamp + nonce |
| 暴力破解 | 限流 + 验证码 | Redis 计数 + 图形验证码 |

### 6.2 限流策略

```
┌─────────────────────────────────────────┐
│              限流策略                     │
└─────────────────────────────────────────┘

全局限流：
  - 单 IP：100 次/分钟
  - 单用户：60 次/分钟

接口限流（MVP）：
  - 微信登录接口：5 次/分钟
  - 获取手机号接口：5 次/分钟
  - 注册接口：3 次/分钟
  - 上传文件：10 次/分钟

后续短信能力限流（仅 P1 短信登录/注册启用后生效）：
  - 发送验证码：1 次/60秒，同一手机号每天最多 10 次

实现方式：
  - 使用 Redis 滑动窗口计数
  - 超过阈值返回 429
```

### 6.3 防刷机制

| 场景 | 策略 | 实现 |
|------|------|------|
| 微信授权 | 同一 openid 限制 | 24小时内最多3次 |
| 注册 | 设备指纹 + IP | 同一设备/IP限制 |
| 上传 | 文件哈希去重 | 相同文件秒传 |
| 敏感操作 | 图形验证码 | 高频触发时启用 |

---

## 7. 微信安全

### 7.1 微信登录安全

```
┌─────────────────────────────────────────┐
│           微信登录安全流程               │
└─────────────────────────────────────────┘

1. 前端调用 wx.login() 获取 code
   ↓
2. code 只能使用一次，5分钟过期
   ↓
3. 后端调用微信接口 code2session
   换取 openid + session_key
   ↓
4. session_key 不返回前端
   仅用于后端解密敏感数据
   ↓
5. 使用 openid/unionid 关联用户
   生成业务 Token 返回前端
```

### 7.2 手机号获取安全

```
┌─────────────────────────────────────────┐
│         手机号获取安全流程               │
└─────────────────────────────────────────┘

1. 前端调用 <button open-type="getPhoneNumber">
   获取 code（新版手机号能力）
   ↓
2. 将 code + tempToken 发送到后端
   ↓
3. 后端调用微信接口（phonenumber/userPhoneNumber）
   使用 code 换取真实手机号
   ↓
4. 换取的手机号存储到数据库
   使用 AES-256-GCM 加密存储
   phone_ciphertext: AES 密文
   phone_hash: HMAC 哈希（用于唯一性校验）
   phone_masked: 脱敏展示
```

### 7.3 敏感数据存储

| 数据 | 存储方式 | 说明 |
|------|---------|------|
| 手机号 | AES-256-GCM 加密 + HMAC 哈希 | phone_ciphertext + phone_hash + phone_masked |
| openid | HMAC 哈希 | wx_open_id_hash（用于唯一性校验） |
| unionid | 明文存储 | 非敏感，可公开 |
| session_key | 内存存储 | 不持久化，仅用于单次请求 |

---

## 8. 日志与监控

### 8.1 安全日志

| 日志类型 | 记录内容 | 保留时间 |
|---------|---------|---------|
| 登录日志 | 时间、IP、设备、结果 | 90天 |
| 操作日志 | 时间、用户、操作、参数 | 30天 |
| 异常日志 | 时间、类型、堆栈、上下文 | 90天 |
| 安全事件 | 攻击类型、来源、处理结果 | 180天 |

### 8.2 安全监控

| 监控项 | 阈值 | 告警方式 |
|--------|------|---------|
| 登录失败率 | > 10% | 企业微信 |
| 注册频率 | > 100/分钟 | 企业微信 + 短信 |
| 异常请求 | > 500/分钟 | 企业微信 |
| Token 异常 | > 50/分钟 | 企业微信 |

---

## 9. 应急响应

### 9.1 安全事件分级

| 级别 | 定义 | 响应时间 | 示例 |
|------|------|---------|------|
| P0 | 严重 | 15分钟 | 数据泄露、服务瘫痪 |
| P1 | 高危 | 1小时 | 大量异常登录、API 滥用 |
| P2 | 中危 | 4小时 | 个别用户异常、小范围攻击 |
| P3 | 低危 | 24小时 | 潜在风险、安全建议 |

### 9.2 应急流程

```
发现安全事件
     │
     ▼
┌─────────────┐
│  事件确认    │
│ 评估影响范围 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  紧急处理    │
│ • 阻断攻击   │
│ • 保护数据   │
│ • 保留证据   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  根因分析    │
│ 修复漏洞     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  复盘总结    │
│ 更新安全策略 │
└─────────────┘
```

---

**文档版本**: v1.0
**创建日期**: 2026-07-01
**作者**: AI Assistant
