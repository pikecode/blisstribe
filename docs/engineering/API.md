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


## 服务方案一期接口（2026-10-14）

当前线上基址为 `https://api.ytxybl.com/api/v1`。公开方案接口无需登录；患者接口校验本人会话，管理接口仅供平台管理后台使用。

| 用途 | 方法与路径 |
| --- | --- |
| 产品可售方案／方案详情 | GET `/service-products/:productId/offerings`、GET `/service-offerings/:id` |
| 购买资格和最早时段 | GET `/service-offerings/:id/eligibility` |
| 下单、本人订单和取消 | POST／GET `/service-orders`、GET `/service-orders/:id`、POST `/service-orders/:id/cancel` |
| 创建支付／主动确认 | POST `/service-orders/:id/payment`、POST `/service-orders/:id/payment/query` |
| 本人服务计划 | GET `/service-plans`、GET `/service-plans/:id` |
| 时段与提交预约 | GET `/service-institutions/:id/slots`、POST `/service-plans/:planId/appointments` |
| 本人预约和改约确认 | GET `/service-appointments`、GET `/service-appointments/:id`、POST `/service-appointments/:id/accept-reschedule` |
| 患者取消 | POST `/service-appointments/:id/cancel` |
| 服务退款 | POST `/service-orders/:orderId/refunds`、GET `/service-refunds`、GET `/service-refunds/:id`、POST `/service-refunds/:id/withdraw` |
| 站内消息与已读 | GET `/service-notices`、POST `/service-notices/:id/read` |
| 机构、方案和资格 | `/admin/service-institutions`、`/admin/service-offerings`、`/admin/product-leads/:leadId/service-qualifications` |
| 管理预约 | GET `/admin/service-appointments`，POST `/:id/confirm`、`/:id/arrive`、`/:id/complete`、`/:id/no-show`、`/:id/cancel`、`/:id/restore-booking`、`/:id/propose-reschedule` |
| 开放／关闭时段 | GET／POST `/admin/service-appointments/slots`、POST `/admin/service-appointments/slots/:id/close` |
| 管理退款 | GET `/admin/service-refunds`、GET `/:id`、POST `/:id/review`、`/:id/query-provider`、`/:id/resolve-closed` |
| 管理订单／延期 | GET `/admin/service-orders`、GET `/:id`、POST `/:id/extend-plan` |
| 微信支付／退款通知 | POST `/service-program/webhooks/wechat-pay`、POST `/service-program/webhooks/wechat-refund` |

预约提交必须提供 `slotId`、`entitlementId`、`requestedStartAt` 和 `clientRequestId`；时间和时长以机构时段为准。完成履约需提供 `performedByName`。资格登记需填写 `professionalName` 和业务依据 `note`。退款金额由后端计算，患者仅提交项目次数和需取消的关联预约编号。

站内提醒由业务事务生成；微信客服沿用小程序客服能力。当前没有启用微信订阅消息模板推送。

### 套餐明细与随访（2026-10-14 后续阶段）

方案 `items` 支持 1 至 50 个服务项目，`allocatedAmountFen` 为该项目全部次数的成交分摊总额，`institutionSettlementFen` 为每次机构结算单价。全部分摊合计必须等于售价；付费套餐的机构结算合计与默认推广收益不能超过售价。下架后编辑保留旧项目，新购买只使用当前明细，历史订单不受调整影响。

| 用途 | 路由 |
| --- | --- |
| 运营查看／安排随访 | GET／POST `/admin/service-plans/:id/follow-ups` |
| 完成或取消随访 | POST `/admin/service-follow-ups/:id/resolve` |
| 患者查看本人随访 | GET `/service-plans/:id/follow-ups` |
| 患者提交一次反馈 | POST `/service-follow-ups/:id/feedback` |

安排请求：`clientRequestId`、`scheduledAt`（含时区的未来时间）、`contactName`、`purpose`。处理请求：`status`（`completed`／`cancelled`）、`outcome`（患者可见）。患者反馈请求：`feedback`，最多 500 字，仅已完成随访可提交。重复安排使用相同请求编号返回同一记录，重复相同处理不重复通知；其他状态冲突需刷新。

随访只登记服务联系与体验反馈，不保存专业诊疗资料。当前运营入口仍使用平台管理权限，多机构隔离账号将在权限阶段建设。

### 套餐实物交付与退货

方案项目增加 `kind`（`service`／`goods`）；实物需提供 `skuId`、`deliveryMethod`（`pickup`／`shipping`）、`returnNotice`。商品名、规格和图片由服务端从商城保存快照；库存由服务端共用商城计数，患者不能上传自定商品快照。

| 用途 | 路由 |
| --- | --- |
| 患者／运营查看实物交付 | GET `/service-plans/:id/goods`、`/admin/service-plans/:id/goods` |
| 患者地址／收货 | POST `/service-goods/:id/action`：`address`＋本人 `addressId`，或 `receive` |
| 运营交付登记 | POST `/admin/service-goods/:id/action`：`ready`、`ship`＋快递公司单号、`receive`＋交付依据、`recover`＋实物取回依据 |
| 患者／运营查看退货 | GET `/service-plans/:id/goods-returns`、`/admin/service-plans/:id/goods-returns` |
| 患者申请退货 | POST `/service-goods/:id/return`：`quantity`、`reason`、`reasonType`、`clientRequestId`、可选 `images`（最多 6 张） |
| 患者撤回／寄回 | POST `/service-goods-returns/:id/action`：`withdraw` 或 `shipped`＋物流 |
| 运营审核／核验 | POST `/admin/service-goods-returns/:id/action`：`approve`＋地址／说明、`reject`＋说明、`inspect`＋核验说明及 `reusable`、`dispute`＋依据 |
| 患者上传商品问题照片 | POST `/upload/service-goods-evidence`，jpg／png，2 MB 上限 |

退货核验不直接发放退款：有金额时创建服务退款申请，由财务继续审核、渠道确认；零元赠品记录本地退回结果，不产生微信资金退款。不可重售商品不自动恢复库存。已寄送商品只能在有实物取回依据后撤回寄送，不能仅取消物流标记便释放库存。

### 已完成服务的异议与例外退费

| 用途 | 路由 |
| --- | --- |
| 患者提交记录异议 | POST `/service-appointments/:id/disputes` |
| 查询某条记录已有异议 | GET `/service-appointments/:id/dispute` |
| 患者列表／详情 | GET `/service-disputes?planId=&page=`、GET `/service-disputes/:id` |
| 患者接受／复核／不接受 | POST `/service-disputes/:id/action` |
| 后台列表／详情 | GET `/admin/service-disputes?status=&keyword=&overdue=&page=`、GET `/admin/service-disputes/:id` |
| 后台处理 | POST `/admin/service-disputes/:id/action` |

提交字段：`reasonType`（`not_received`／`wrong_item`／`wrong_quantity`／`other`）、`description`、`clientRequestId`。每条原服务记录只对应一个异议工单；已有开放工单返回原记录，已结案后不通过重复提交再次恢复次数。

患者动作：`accept`、`review`、`disagree`；后台动作：`contact`、`evidence`、`propose`、`review`、`extend`、`retry_refund`、`finish_rearrange`。双方动作均提交读取时的 `expectedUpdatedAt`，状态变化后需刷新。复核／不接受需原因，后台所有动作需说明。方案结果为 `maintain`、`restore`、`correct_item`、`rearrange`、`refund`。

实际项目修正需 `correctedEntitlementId`，仅支持同一计划的其他有未使用次数的服务项目。重新安排在恢复权益后保持 `awaiting_rebooking`，运营提交 `replacementAppointmentId`，服务端确认属于同一计划、同一项目、患者接受方案后建立且已确认，才结案；同一新预约不能终结多个异议。

例外退费提供整数分 `refundAmountFen`、`costBearer`（平台／机构／共同承担）及 `clawbackNote`。患者接受后生成补偿退款明细 `compensation=true`、`quantity=0`，只退款资金，不结转服务次数。单次分摊上限按整数分向上取整，并受订单剩余实付限制。原登记人、方案提出人及复核人不能审批该补偿退款；微信成功后结案，失败时继续协调或重新提出方案。待患者确认的方案可更新，患者须按新的版本明确接受。

患者响应隐藏管理账号编号、冲回口径和其他内部资金字段。所有阶段保留事件、审计和站内提醒，患者沉默不自动结案。结算暂停标记供后续财务账本使用，当前尚未执行真实机构／主理人账本冻结。

### 套餐检查与服务工作台（2026-10-15）

以下接口均要求后台管理员登录：

- `GET /admin/service-offerings/:id/readiness`：返回 `checkedAt`、`canPublish`、`availableNow`、`requiresQualification`、`summary` 和 `checks`；检查项包含 `key`、`label`、`passed`、`blocking`、`message`、`target`。后台套餐列表同时返回每行 `readiness`。
- 套餐上架复用服务端检查，阻止缺少必填配置的上架请求；时段、库存和展示状态作为运营提示。`availableNow` 为资源及展示检查结果，不替代用户购买资格和实际下单校验。
- `GET /admin/service-operations/workbench`：返回 `checkedAt`、北京时间 `date` 和 `items`，每项含 `key`、`label`、`count`、`path`、`query`。六类计数口径及边界见 [实施说明](../plans/2026-10-15-service-readiness-workbench.md)。
