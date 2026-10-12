# 数据库设计文档

## 1. 概述

### 1.1 文档目的
本文档定义 BlissTribe 小程序的数据库表结构、字段说明、索引设计和关联关系。

### 1.2 数据库选型

| 项目 | 选型 | 说明 |
|------|------|------|
| 关系型数据库 | PostgreSQL 15 | 业务数据存储 |
| 缓存 | Redis 7.x | 会话、缓存、限流 |
| 文件存储 | 腾讯云 COS / 阿里云 OSS | 图片、文件 |

---

## 2. 数据库设计规范

### 2.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 数据库 | 小写，下划线分隔 | `blisstribe` |
| 表名 | 小写，下划线分隔，复数 | `users`, `user_profiles` |
| 字段名 | 小写，下划线分隔 | `phone_number`, `created_at` |
| 索引名 | `idx_表名_字段名` | `idx_users_phone` |
| 约束名 | `uk_表名_字段名` | `uk_users_phone` |
| 序列名 | `表名_id_seq` | `users_id_seq` |

### 2.2 字段规范

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| id | BIGINT | 主键，自增 | GENERATED ALWAYS AS IDENTITY |
| created_at | TIMESTAMPTZ | 创建时间 | CURRENT_TIMESTAMP |
| updated_at | TIMESTAMPTZ | 更新时间 | CURRENT_TIMESTAMP |
| deleted_at | TIMESTAMPTZ | 软删除时间 | NULL |
| status | SMALLINT | 状态 | 1 |

### 2.3 PostgreSQL 特有设计

- 使用 `GENERATED ALWAYS AS IDENTITY` 替代 `AUTO_INCREMENT`
- 使用 `TIMESTAMPTZ` 替代 `DATETIME`，带时区信息
- 使用 `TEXT` 替代 `VARCHAR`，无长度限制更灵活
- 使用 `SMALLINT` 替代 `TINYINT`
- 使用 `JSONB` 存储动态/扩展字段
- 使用 `UUID` 生成唯一标识
- 使用 `pgcrypto` 扩展进行数据加密

---

## 3. 表结构设计

### 3.1 用户表 (users)

存储用户基本信息。

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone_ciphertext BYTEA NOT NULL,
  phone_hash TEXT NOT NULL,
  phone_masked TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  gender SMALLINT DEFAULT 0,
  birthday DATE DEFAULT NULL,
  password_hash TEXT DEFAULT NULL,
  status SMALLINT DEFAULT 1,
  last_login_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT uk_users_phone_hash UNIQUE (phone_hash),
  CONSTRAINT chk_users_gender CHECK (gender IN (0, 1, 2)),
  CONSTRAINT chk_users_status CHECK (status IN (0, 1, 2))
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID';
COMMENT ON COLUMN users.phone_ciphertext IS '手机号密文（AES-256-GCM）';
COMMENT ON COLUMN users.phone_hash IS '手机号 HMAC 哈希（用于唯一性校验和精确查询）';
COMMENT ON COLUMN users.phone_masked IS '脱敏手机号（展示用）';
COMMENT ON COLUMN users.nickname IS '昵称';
COMMENT ON COLUMN users.avatar IS '头像URL';
COMMENT ON COLUMN users.gender IS '性别：0保密 1男 2女';
COMMENT ON COLUMN users.birthday IS '生日';
COMMENT ON COLUMN users.password_hash IS '密码哈希（可选）';
COMMENT ON COLUMN users.status IS '状态：0禁用 1正常 2待完善';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';

-- 索引
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | 是 | 主键，自增 |
| phone_ciphertext | BYTEA | 是 | 手机号密文（AES-256-GCM） |
| phone_hash | TEXT | 是 | 手机号 HMAC 哈希（唯一性校验） |
| phone_masked | TEXT | 是 | 脱敏手机号（展示用） |
| nickname | TEXT | 是 | 用户昵称 |
| avatar | TEXT | 否 | 头像URL |
| gender | SMALLINT | 否 | 性别（CHECK约束） |
| birthday | DATE | 否 | 生日 |
| password_hash | TEXT | 否 | 密码哈希（可选） |
| status | SMALLINT | 否 | 用户状态（CHECK约束） |
| last_login_at | TIMESTAMPTZ | 否 | 最后登录时间 |
| created_at | TIMESTAMPTZ | 是 | 创建时间 |
| updated_at | TIMESTAMPTZ | 是 | 更新时间 |
| deleted_at | TIMESTAMPTZ | 否 | 删除时间（软删除） |

---

### 3.2 微信账号表 (wechat_accounts)

存储用户微信授权信息。

```sql
CREATE TABLE wechat_accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  wx_open_id_hash TEXT NOT NULL,
  wx_union_id TEXT DEFAULT NULL,
  wx_nickname TEXT DEFAULT NULL,
  wx_avatar TEXT DEFAULT NULL,
  wx_gender SMALLINT DEFAULT 0,
  wx_country TEXT DEFAULT NULL,
  wx_province TEXT DEFAULT NULL,
  wx_city TEXT DEFAULT NULL,
  status SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uk_wechat_accounts_wx_open_id_hash UNIQUE (wx_open_id_hash),
  CONSTRAINT uk_wechat_accounts_user_id UNIQUE (user_id),
  CONSTRAINT fk_wechat_accounts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_wechat_accounts_status CHECK (status IN (0, 1))
);

COMMENT ON TABLE wechat_accounts IS '微信账号表';
COMMENT ON COLUMN wechat_accounts.user_id IS '用户ID';
COMMENT ON COLUMN wechat_accounts.wx_open_id_hash IS '微信openid HMAC 哈希（用于唯一性校验）';
COMMENT ON COLUMN wechat_accounts.wx_union_id IS '微信unionid';
COMMENT ON COLUMN wechat_accounts.status IS '状态：0解绑 1绑定';

-- 索引
CREATE INDEX idx_wechat_accounts_wx_union_id ON wechat_accounts(wx_union_id);
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | 是 | 主键，自增 |
| user_id | BIGINT | 是 | 关联 users.id，外键级联删除 |
| wx_open_id_hash | TEXT | 是 | 微信openid HMAC 哈希（唯一性校验） |
| wx_union_id | TEXT | 否 | 微信unionid |
| wx_nickname | TEXT | 否 | 微信昵称 |
| wx_avatar | TEXT | 否 | 微信头像 |
| wx_gender | SMALLINT | 否 | 微信性别 |
| wx_country | TEXT | 否 | 国家 |
| wx_province | TEXT | 否 | 省份 |
| wx_city | TEXT | 否 | 城市 |
| status | SMALLINT | 否 | 绑定状态 |
| created_at | TIMESTAMPTZ | 是 | 创建时间 |
| updated_at | TIMESTAMPTZ | 是 | 更新时间 |

---

### 3.3 用户会话表 (user_sessions)

存储用户登录会话信息。

```sql
CREATE TABLE user_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  jti TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  platform TEXT DEFAULT NULL,
  status SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uk_user_sessions_jti UNIQUE (jti),
  CONSTRAINT chk_user_sessions_status CHECK (status IN (0, 1))
);

COMMENT ON TABLE user_sessions IS '用户会话表';
COMMENT ON COLUMN user_sessions.user_id IS '用户ID';
COMMENT ON COLUMN user_sessions.jti IS 'JWT ID（用于 Access Token 黑名单/撤销）';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'Refresh Token 哈希（bcrypt，不存原文）';
COMMENT ON COLUMN user_sessions.expires_at IS 'Access Token 过期时间';
COMMENT ON COLUMN user_sessions.ip_address IS '登录IP';
COMMENT ON COLUMN user_sessions.platform IS '平台：wechat-mp/h5/app';

-- 索引
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
-- jti 唯一约束已在表定义中声明（uk_user_sessions_jti），无需重复索引
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, status) WHERE status = 1;
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | 是 | 主键，自增 |
| user_id | BIGINT | 是 | 关联 users.id |
| jti | TEXT | 是 | JWT ID（Access Token 撤销用） |
| refresh_token_hash | TEXT | 是 | Refresh Token 哈希（bcrypt） |
| expires_at | TIMESTAMPTZ | 是 | Access Token 过期时间 |
| refresh_expires_at | TIMESTAMPTZ | 是 | Refresh Token 过期时间 |
| ip_address | INET | 否 | 登录IP（PostgreSQL特有类型） |
| user_agent | TEXT | 否 | User-Agent |
| platform | TEXT | 否 | 登录平台 |
| status | SMALLINT | 否 | 会话状态 |
| created_at | TIMESTAMPTZ | 是 | 创建时间 |
| updated_at | TIMESTAMPTZ | 是 | 更新时间 |

---

### 3.4 用户注册临时表 (user_register_temp)

存储注册过程中的临时数据。

```sql
CREATE TABLE user_register_temp (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  temp_token TEXT NOT NULL,
  wx_open_id_hash TEXT DEFAULT NULL,
  wx_union_id TEXT DEFAULT NULL,
  wx_nickname TEXT DEFAULT NULL,
  wx_avatar TEXT DEFAULT NULL,
  wx_gender SMALLINT DEFAULT 0,
  phone_ciphertext BYTEA DEFAULT NULL,
  phone_hash TEXT DEFAULT NULL,
  phone_masked TEXT DEFAULT NULL,
  status SMALLINT DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uk_user_register_temp_token UNIQUE (temp_token),
  CONSTRAINT chk_user_register_temp_status CHECK (status IN (0, 1))
);

COMMENT ON TABLE user_register_temp IS '用户注册临时表';
COMMENT ON COLUMN user_register_temp.temp_token IS '临时令牌';
COMMENT ON COLUMN user_register_temp.wx_open_id_hash IS '微信openid HMAC 哈希';
COMMENT ON COLUMN user_register_temp.phone_ciphertext IS '手机号密文（AES-256-GCM）';
COMMENT ON COLUMN user_register_temp.phone_hash IS '手机号 HMAC 哈希（唯一性校验）';
COMMENT ON COLUMN user_register_temp.phone_masked IS '脱敏手机号';
COMMENT ON COLUMN user_register_temp.expires_at IS '过期时间';

-- 索引
CREATE INDEX idx_user_register_temp_expires_at ON user_register_temp(expires_at);
CREATE INDEX idx_user_register_temp_status ON user_register_temp(status, expires_at);
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | 是 | 主键，自增 |
| temp_token | TEXT | 是 | 临时令牌，唯一 |
| wx_open_id_hash | TEXT | 否 | 微信openid HMAC 哈希 |
| wx_union_id | TEXT | 否 | 微信unionid |
| wx_nickname | TEXT | 否 | 微信昵称 |
| wx_avatar | TEXT | 否 | 微信头像 |
| wx_gender | SMALLINT | 否 | 微信性别 |
| phone_ciphertext | BYTEA | 否 | 手机号密文（AES-256-GCM） |
| phone_hash | TEXT | 否 | 手机号 HMAC 哈希 |
| phone_masked | TEXT | 否 | 脱敏手机号 |
| status | SMALLINT | 否 | 状态 |
| expires_at | TIMESTAMPTZ | 是 | 过期时间 |
| created_at | TIMESTAMPTZ | 是 | 创建时间 |

> **安全口径**：临时表与主表（users/wechat_accounts）保持一致的敏感数据处理方式 —— openid 用 HMAC 哈希，手机号用 AES 密文 + HMAC 哈希 + 脱敏。注册成功后临时记录应在 24 小时内物理删除或由定时任务清理。

---

### 3.5 用户协议记录表 (user_agreements)

记录用户同意协议的历史。

```sql
CREATE TABLE user_agreements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  agreement_type TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL,
  ip_address INET DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_agreements_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_user_agreements_type CHECK (agreement_type IN ('user', 'privacy'))
);

COMMENT ON TABLE user_agreements IS '用户协议记录表';
COMMENT ON COLUMN user_agreements.user_id IS '用户ID';
COMMENT ON COLUMN user_agreements.agreement_type IS '协议类型：user/privacy';
COMMENT ON COLUMN user_agreements.agreement_version IS '协议版本';
COMMENT ON COLUMN user_agreements.agreed_at IS '同意时间';

-- 索引
CREATE INDEX idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_agreed_at ON user_agreements(agreed_at);
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | BIGINT | 是 | 主键，自增 |
| user_id | BIGINT | 是 | 关联 users.id |
| agreement_type | TEXT | 是 | 协议类型（CHECK约束） |
| agreement_version | TEXT | 是 | 协议版本 |
| agreed_at | TIMESTAMPTZ | 是 | 同意时间 |
| ip_address | INET | 否 | IP地址 |
| created_at | TIMESTAMPTZ | 是 | 创建时间 |

---

### 3.6 协议版本表 (agreements)

存储协议内容版本。

```sql
CREATE TABLE agreements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  effective_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uk_agreements_type_version UNIQUE (type, version),
  CONSTRAINT chk_agreements_type CHECK (type IN ('user', 'privacy'))
);

COMMENT ON TABLE agreements IS '协议版本表';
COMMENT ON COLUMN agreements.type IS '协议类型';
COMMENT ON COLUMN agreements.version IS '版本号';
COMMENT ON COLUMN agreements.is_current IS '是否当前版本';
COMMENT ON COLUMN agreements.effective_at IS '生效时间';

-- 索引
CREATE INDEX idx_agreements_type_current ON agreements(type, is_current) WHERE is_current = TRUE;
```

---

## 4. 表关系图

```
┌─────────────────────────────────────────────────────────────┐
│                         数据库关系图                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────────┐
│   users     │◄──1:1──│ wechat_accounts │
│             │         │                 │
│  id (PK)    │         │  id (PK)        │
│  phone_hash │         │  user_id (FK)   │
│  nickname   │         │  wx_open_id_hash│
│  avatar     │         │  wx_union_id    │
│  gender     │         └─────────────────┘
│  birthday   │
│  status     │         ┌─────────────────┐
│  password   │◄──1:N──│ user_sessions   │
│  ...        │         │                 │
└─────────────┘         │  id (PK)        │
                        │  user_id (FK)   │
                        │  jti            │
                        │  refresh_token  │
                        │  ...            │
                        └─────────────────┘

┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────┐   ┌─────────────┐ │
│  │user_register_temp│   │user_agreements│
│  │                 │   │             │ │
│  │  id (PK)        │   │  id (PK)    │ │
│  │  temp_token     │   │  user_id(FK)│ │
│  │  wx_open_id     │   │  agreement  │ │
│  │  phone          │   │  version    │ │
│  │  ...            │   │  agreed_at  │ │
│  └─────────────────┘   └─────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. 索引设计

### 5.1 索引汇总

| 表名 | 索引名 | 类型 | 字段 | 说明 |
|------|--------|------|------|------|
| users | uk_users_phone_hash | UNIQUE | phone_hash | 手机号哈希唯一 |
| users | idx_users_status | INDEX | status | 状态查询 |
| users | idx_users_created_at | INDEX | created_at | 时间查询 |
| users | idx_users_deleted_at | PARTIAL | deleted_at | 未删除用户查询 |
| wechat_accounts | uk_wechat_accounts_wx_open_id_hash | UNIQUE | wx_open_id_hash | openid哈希唯一 |
| wechat_accounts | uk_wechat_accounts_user_id | UNIQUE | user_id | 用户唯一 |
| wechat_accounts | idx_wechat_accounts_wx_union_id | INDEX | wx_union_id | unionid查询 |
| user_sessions | idx_user_sessions_user_id | INDEX | user_id | 用户会话查询 |
| user_sessions | uk_user_sessions_jti | UNIQUE | jti | JTI 唯一（Access Token 撤销/审计） |
| user_sessions | idx_user_sessions_expires_at | INDEX | expires_at | 过期时间查询 |
| user_sessions | idx_user_sessions_active | PARTIAL | user_id, status | 有效会话查询 |
| user_register_temp | uk_user_register_temp_token | UNIQUE | temp_token | 临时令牌唯一 |
| user_register_temp | idx_user_register_temp_expires_at | INDEX | expires_at | 过期时间查询 |
| user_register_temp | idx_user_register_temp_status | INDEX | status, expires_at | 有效临时数据 |
| user_agreements | idx_user_agreements_user_id | INDEX | user_id | 用户协议查询 |
| agreements | uk_agreements_type_version | UNIQUE | type, version | 版本唯一 |
| agreements | idx_agreements_type_current | PARTIAL | type, is_current | 当前版本查询 |

---

## 6. 视图与函数

### 6.1 活跃用户视图

```sql
CREATE VIEW active_users AS
SELECT id, phone_encrypted, nickname, avatar, gender, status, last_login_at, created_at
FROM users
WHERE deleted_at IS NULL AND status = 1;
```

### 6.2 自动更新 updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wechat_accounts_updated_at
  BEFORE UPDATE ON wechat_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 6.3 清理过期临时数据

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_temp()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_register_temp
  WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 每小时执行一次清理
-- 可通过 pg_cron 或应用层定时任务调用
```

---

## 7. Redis 设计

### 7.1 Key 设计

| Key | 类型 | 说明 | 过期时间 |
|-----|------|------|---------|
| `auth:token:{token}` | STRING | Token 对应的用户信息 | 2小时 |
| `auth:refresh:{refreshToken}` | STRING | RefreshToken 信息 | 7天 |
| `auth:rsa:public:{keyId}` | STRING | RSA 公钥 | 24小时 |
| `rate:limit:phone:{phone}` | STRING | 手机号限流计数 | 60秒 |
| `rate:limit:ip:{ip}` | STRING | IP 限流计数 | 60秒 |
| `register:temp:{tempToken}` | HASH | 注册临时数据 | 10分钟 |

### 7.2 数据结构

```
# Token 缓存
auth:token:Bearer_xxx
{
  "userId": 10001,
  "phone": "13800138000",
  "expiresAt": "2024-01-15T12:30:00Z"
}

# 限流计数
rate:limit:phone:13800138000
"5"  # 60秒内请求次数

# 注册临时数据
register:temp:temp_xxx
{
  "wxOpenId": "oXXXXX...",
  "wxUnionId": "oYYYYY...",
  "phone": "13800138000",
  "nickname": "微信用户",
  "avatar": "https://...",
  "gender": 1
}
```

---

## 8. 数据迁移

### 8.1 初始化脚本

```sql
-- 创建数据库
CREATE DATABASE blisstribe
  WITH ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8';

\c blisstribe;

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 执行上述建表语句...

-- 插入初始协议数据
INSERT INTO agreements (type, version, title, content, is_current, effective_at)
VALUES
  ('user', '1.0', '用户服务协议', '...协议内容...', TRUE, NOW()),
  ('privacy', '1.0', '隐私保护政策', '...政策内容...', TRUE, NOW());
```

### 8.2 连接配置示例

```
# .env
DATABASE_URL=postgresql://username:password@localhost:5432/blisstribe?sslmode=require

# 连接池配置
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

---

**文档版本**: v2.0
**更新日期**: 2026-07-01
**作者**: AI Assistant
