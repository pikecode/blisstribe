# S2B2C 注册流程设计评审稿

## 1. 设计目标

本文档定义 BlissTribe 从现有微信小程序注册登录能力扩展到 S2B2C 模式时，S、B、C 三类角色的注册、入驻、审核与归属绑定流程。

核心目标：

- 保持用户登录注册流程简单，避免让 C 端用户理解复杂身份。
- 将账号身份、经营主体、客户归属拆开建模，降低后续佣金、结算、风控复杂度。
- 支持 B 端入驻审核、生成邀请入口、绑定 C 客户。
- 支持 S 端后台管理员独立账号体系，不与小程序 C 端账号混用。
- 为后续订单、佣金、结算、提现预留清晰的数据入口。

## 2. 核心原则

- 统一账号：所有小程序用户先注册为 `User`。
- 身份升级：B 不是另一套登录账号，而是 `User` 申请后生成的 `Partner` 主体。
- 后台独立：S 是平台管理人员，使用 `Admin / Role / Permission`，不走小程序注册。
- 关系独立：C 由哪个 B 带来或服务，使用 `CustomerRelation` 表表达，不依赖 `users.invited_by` 单字段。
- 邀请可审计：每次邀请码解析、注册、绑定都应记录来源和状态。

原则应用：

- KISS：C 注册保持微信授权 + 手机号授权，不增加身份选择。
- YAGNI：MVP 只做一级 B-C 归属，不做多级分销。
- SOLID：`User` 负责登录账号，`Partner` 负责 B 端主体，`CustomerRelation` 负责归属关系。
- DRY：身份枚举、状态枚举、错误码应沉淀到 `packages/shared`。

## 3. 角色定义

| 角色 | 系统对象 | 注册入口 | 说明 |
|------|----------|----------|------|
| S 平台方 | `Admin` | 后台创建 | 管理平台规则、B 审核、用户、佣金和结算 |
| B 渠道方 | `User + Partner` | 小程序入驻 / 后台创建 | 团长、达人、门店、服务商、主理人 |
| C 消费者 | `User` | 小程序微信授权 | 普通终端用户，可被 B 邀请和服务 |

## 4. 推荐总流程

```text
B 完成 User 注册
  ↓
B 提交 Partner 入驻申请
  ↓
S 后台审核
  ↓
审核通过后生成 B 专属邀请码/二维码
  ↓
C 扫 B 邀请码进入小程序
  ↓
C 微信授权 + 手机号授权完成 User 注册
  ↓
系统创建邀请记录和 CustomerRelation
  ↓
C 后续产生订单或业务行为
  ↓
系统按规则给 B 生成佣金台账
```

## 5. C 端注册流程

### 5.1 普通入口注册

```text
C 打开小程序
  ↓
调用 wx.login 获取 code
  ↓
调用 /auth/wechat-login
  ↓
后端判断 openid 是否已注册
  ├─ 已注册：返回 token，直接登录
  └─ 未注册：返回 tempToken
        ↓
      C 授权手机号
        ↓
      调用 /auth/wechat-phone
        ↓
      C 完善昵称/头像/协议
        ↓
      调用 /auth/register
        ↓
      创建 User，登录成功
```

数据写入：

- `users`：用户主体。
- `wechat_accounts`：微信账号绑定。
- `user_agreements`：协议确认记录。
- `user_sessions`：登录会话。

### 5.2 通过 B 邀请入口注册

```text
C 扫 B 的二维码或分享链接
  ↓
前端拿到 invitationCode / scene
  ↓
调用 /invitation/resolve
  ↓
后端校验邀请码有效性，写入注册临时态
  ↓
C 完成微信注册
  ↓
调用 /auth/register
  ↓
后端创建 User
  ↓
创建 invitation_record
  ↓
创建 CustomerRelation(partner_id -> customer_user_id)
  ↓
返回 token 和首页所需数据
```

关键约束：

- 邀请来源必须由服务端保存到 `tempToken` 对应的临时态，不能只依赖前端缓存。
- 注册成功后绑定关系应与创建用户放在同一个数据库事务内。
- 同一个 C 在 MVP 阶段只允许存在一个有效 B 归属。
- 如果邀请码失效，C 仍可注册，但不创建 B-C 关系。

## 6. B 端入驻流程

### 6.1 用户主动申请成为 B

```text
用户已完成基础注册
  ↓
进入 /pages/partner/apply
  ↓
填写 B 端资料
  ↓
调用 POST /partner/apply
  ↓
创建 Partner，状态 pending
  ↓
后台审核
  ├─ 通过：Partner active，生成邀请码
  └─ 拒绝：Partner rejected，记录拒绝原因
```

B 入驻资料建议：

| 字段 | 必填 | 说明 |
|------|------|------|
| displayName | 是 | 对外展示名称 |
| type | 是 | 团长、达人、门店、服务商 |
| contactName | 是 | 联系人 |
| contactPhone | 是 | 联系手机号，后端加密存储 |
| regionCode | 否 | 所在地区 |
| profile | 否 | 简介、渠道信息、补充资料 |
| qualificationFiles | 否 | 资质文件，P2 可启用 |

### 6.2 后台创建 B

```text
S 后台登录
  ↓
填写 B 基础信息
  ↓
选择绑定已有 User 或创建邀请入驻链接
  ↓
创建 Partner
  ↓
设置等级和状态
```

适用场景：

- 线下已签约渠道。
- 平台主动招募达人或团长。
- 批量导入服务商。

### 6.3 B 状态机

```text
pending   待审核
  ↓ approve
active    正常
  ↓ freeze
frozen    冻结
  ↓ unfreeze
active
  ↓ disable
disabled  停用

pending
  ↓ reject
rejected  拒绝
  ↓ resubmit
pending
```

状态含义：

| 状态 | 是否可邀请 C | 是否可产生佣金 | 说明 |
|------|---------------|----------------|------|
| pending | 否 | 否 | 等待审核 |
| active | 是 | 是 | 正常经营 |
| rejected | 否 | 否 | 审核拒绝 |
| frozen | 否 | 否或冻结 | 风控冻结 |
| disabled | 否 | 否 | 停用 |

## 7. S 端账号流程

S 是平台运营和管理角色，不应通过小程序注册产生。

```text
超级管理员登录后台
  ↓
创建 Admin
  ↓
分配 Role
  ↓
绑定 Permission
  ↓
管理员登录后台处理审核、配置和结算
```

建议权限码：

| 权限码 | 说明 |
|--------|------|
| `partner:read` | 查看 B |
| `partner:approve` | 审核 B |
| `partner:freeze` | 冻结 B |
| `relation:read` | 查看 B-C 关系 |
| `relation:transfer` | 转移客户归属 |
| `commission:read` | 查看佣金 |
| `commission:adjust` | 手工调账 |
| `settlement:create` | 创建结算批次 |

## 8. 注册入口设计

| 入口 | URL / 场景 | 访问者 | 结果 |
|------|------------|--------|------|
| 普通首页 | `/pages/index/index` | C | 普通 User 注册或登录 |
| B 邀请入口 | 带 `invitationCode` | C | User 注册 + 绑定 B-C |
| B 入驻入口 | `/pages/partner/apply` | 潜在 B | User 登录 + Partner 申请 |
| 后台入口 | Admin Web | S | Admin 登录，不创建 User |

前端需要统一处理启动参数：

```text
onLaunch / onLoad
  ↓
解析 scene / invitationCode
  ↓
调用 /invitation/resolve
  ↓
服务端返回来源摘要
  ↓
前端展示邀请人或渠道信息
  ↓
注册完成后由后端绑定关系
```

## 9. 后端接口建议

### 9.1 认证注册

| 接口 | 说明 |
|------|------|
| `POST /auth/wechat-login` | 微信登录，返回 token 或 tempToken |
| `POST /auth/wechat-phone` | 获取手机号并写入注册临时态 |
| `POST /auth/register` | 完成 User 注册，可同时处理邀请绑定 |

### 9.2 邀请

| 接口 | 说明 |
|------|------|
| `POST /invitation/resolve` | 解析邀请码，保存来源到临时态 |
| `POST /invitation/bind` | 特殊场景下手动绑定关系 |
| `GET /partner/invitation-code` | B 获取自己的邀请码 |

### 9.3 B 入驻

| 接口 | 说明 |
|------|------|
| `POST /partner/apply` | 提交 B 申请 |
| `GET /partner/me` | 查询我的 B 状态 |
| `PUT /partner/me` | 修改待审核或被拒绝资料 |

### 9.4 S 后台

| 接口 | 说明 |
|------|------|
| `GET /admin/partners` | B 列表 |
| `POST /admin/partners/:id/approve` | 审核通过 |
| `POST /admin/partners/:id/reject` | 审核拒绝 |
| `POST /admin/partners/:id/freeze` | 冻结 |
| `POST /admin/customer-relations/transfer` | 转移 B-C 归属 |

## 10. 数据写入时序

### 10.1 邀请注册事务

```text
BEGIN
  创建 users
  创建 wechat_accounts
  创建 user_agreements
  如果存在有效 invitationCode:
    创建 invitation_record
    创建 customer_relation
    更新 invitation_codes.used_count
  创建 user_sessions
COMMIT
```

失败处理：

- 用户创建失败：整体回滚。
- 邀请码失效：允许用户注册，但不绑定关系，记录失效原因。
- 关系已存在：不重复创建，按规则返回当前归属。

### 10.2 B 审核事务

```text
BEGIN
  更新 partners.status = active
  更新 partners.approved_at
  如果没有有效邀请码:
    创建 invitation_codes
  写入 audit_log
COMMIT
```

## 11. 异常场景

| 场景 | 处理策略 |
|------|----------|
| C 扫无效邀请码 | 正常注册，不绑定 B |
| C 已有归属又扫新 B 码 | MVP 不覆盖原归属，提示已绑定 |
| B 被冻结后邀请 C | 邀请码解析失败或显示渠道不可用 |
| B 审核拒绝 | 保留申请记录，允许修改后重提 |
| 手机号已注册 | 走登录逻辑，不重复注册 |
| tempToken 过期 | 要求重新授权登录 |
| 后台转移归属 | 必须记录 audit_log 和操作原因 |

## 12. 页面改造建议

### 12.1 小程序页面

| 页面 | 路径 | 说明 |
|------|------|------|
| B 入驻申请 | `/pages/partner/apply` | 填写和提交 B 资料 |
| B 审核状态 | `/pages/partner/status` | 展示 pending/rejected/active |
| B 工作台 | `/pages/partner/dashboard` | 邀请数、客户数、收益概览 |
| B 邀请页 | `/pages/partner/invite` | 邀请码、二维码、海报 |
| B 客户列表 | `/pages/partner/customers` | 查看名下 C |

### 12.2 后台页面

| 页面 | 说明 |
|------|------|
| B 主体管理 | 列表、详情、审核、冻结 |
| B 等级配置 | 等级、权益、佣金比例 |
| 客户归属管理 | 查询、转移、争议处理 |
| 邀请记录 | 查看扫码、注册、绑定转化 |
| 审计日志 | 查看后台关键操作 |

## 13. 验收标准

### 13.1 C 注册

- 未登录用户可通过普通入口完成注册。
- C 通过有效 B 邀请码注册后，后台能看到 B-C 归属关系。
- C 通过无效邀请码注册时，不影响基础注册。
- 同一个 C 不会重复创建多个有效归属。

### 13.2 B 入驻

- 已注册用户可提交 B 入驻申请。
- 后台可审核通过、拒绝、冻结 B。
- 审核通过后自动生成 B 专属邀请码。
- 被拒绝的 B 可修改资料后重新提交。

### 13.3 S 后台

- 管理员账号不走小程序注册。
- 不同角色只能访问授权菜单和接口。
- 审核、冻结、归属转移均有审计日志。

## 14. 待评审问题

- B 是否只允许个人，还是要同时支持门店/企业/服务商？
- C 是否允许更换归属 B？如果允许，冷却期和审批规则是什么？
- B 入驻是否需要实名、资质、合同或保证金？
- B 审核通过后是否立即可产生佣金，还是需要签约状态？
- 邀请码是否需要区分注册邀请、活动邀请、B 招募邀请？
- MVP 是否需要佣金展示，还是只先展示客户和邀请数据？

## 15. 推荐实施顺序

1. 新增 `Partner` 和 B 入驻审核流程。
2. 新增 `InvitationCode` 和邀请码解析流程。
3. 改造注册流程，支持邀请来源写入临时态。
4. 新增 `CustomerRelation`，完成 C 注册后的 B-C 绑定。
5. 新增后台 B 管理和客户归属管理。
6. 后续再接入佣金台账和结算。
