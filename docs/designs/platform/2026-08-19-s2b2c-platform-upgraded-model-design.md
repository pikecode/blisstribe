# S2B2C 平台升级建模方案评审稿

## 1. 背景

前两份文档已经给出 S2B2C 平台扩展和注册流程设计，核心方案是 `User + Partner + CustomerRelation`。这个方案适合 MVP，但如果 BlissTribe 的目标是长期平台，而不是简单邀请分销，还需要进一步处理三个问题：

- B 不一定是单个用户，可能是门店、团队、服务商、达人机构。
- 一个 B 主体可能有多个操作者，例如负责人、运营、财务。
- C 与 B 的关系会发生绑定、转移、解绑、争议，需要完整历史，而不是只存当前状态。

因此，本方案将模型升级为：

```text
User 账号
  ↓
Partner B 端经营主体
  ↓
PartnerMember B 端成员
  ↓
CustomerRelation 当前客户归属
  ↓
RelationEvent 关系事件账本
```

## 2. 设计目标

- 支持个人 B、门店 B、机构 B、服务商 B 的统一建模。
- 支持一个 B 主体下多个成员协作。
- 保持 C 注册体验不变，不要求 C 理解平台角色。
- 保留当前有效 B-C 归属，同时记录完整关系事件。
- 为佣金、结算、风控、归属争议提供可审计依据。
- 控制 MVP 复杂度，先实现 owner 单成员，表结构支持后续多人协作。

## 3. 方案对比

### 3.1 方案 A：User 身份字段

```text
users.identity = B / C
users.invited_by = inviter_user_id
```

优点：

- 开发最快。
- 对当前注册流程改动小。

缺点：

- B 的审核、等级、经营资料、结算信息都会污染 `users`。
- 不支持门店、机构和多人协作。
- 邀请关系和服务归属混在一起。
- 归属转移和佣金争议缺少审计依据。

结论：不推荐作为平台方案，只适合短期活动。

### 3.2 方案 B：User + Partner + CustomerRelation

```text
User
Partner
CustomerRelation
```

优点：

- 边界比方案 A 清晰。
- 适合快速实现 S2B2C MVP。
- 能支持 B 审核、等级和基础归属。

缺点：

- 如果默认 `Partner.user_id` 就是唯一操作者，后续增加 B 团队成员会返工。
- 只能看到当前归属，历史变化需要额外补表。

结论：适合第一版，但建议直接补上 `PartnerMember` 和 `RelationEvent`，避免短期节省导致中期迁移。

### 3.3 方案 C：User + Organization + Membership + Relation Ledger

```text
User
Organization
Membership
CustomerRelation
RelationEvent
```

优点：

- 抽象最完整，可同时表达 S、B、门店、品牌、服务商。
- 长期扩展性最好。

缺点：

- MVP 命名和权限模型更抽象。
- 当前业务未必需要完整组织/租户系统。

结论：长期可演进方向，但当前不建议一步到位。

### 3.4 推荐折中方案

```text
User
Partner
PartnerMember
CustomerRelation
RelationEvent
```

该方案不引入完整 `Organization` 抽象，但保留组织化能力。它比方案 B 多两张关键表，能显著降低后续 B 端多人协作和归属争议的返工风险。

## 4. 核心模型

| 模型 | 职责 | 说明 |
|------|------|------|
| User | 登录账号 | 微信登录、手机号、自然人资料 |
| Partner | B 端经营主体 | 个人、门店、服务商、机构 |
| PartnerMember | B 成员关系 | 负责人、运营、财务、客服 |
| InvitationCode | 邀请入口 | 谁发起邀请、用途、有效期 |
| CustomerRelation | 当前客户归属 | 当前哪个 Partner 服务哪个 C |
| RelationEvent | 关系事件账本 | 邀请、绑定、转移、解绑、争议 |
| CommissionLedger | 佣金台账 | 按订单或业务事件生成收益 |
| SettlementBatch | 结算批次 | 后续提现或打款管理 |

## 5. 推荐注册与入驻流程

### 5.1 C 注册

```text
C 进入小程序
  ↓
微信授权 + 手机号授权
  ↓
创建 User
  ↓
如果有 invitationCode:
    解析到 Partner
    创建 RelationEvent(invited)
    创建 CustomerRelation(active)
    创建 RelationEvent(bound)
  ↓
登录成功
```

C 不需要选择身份，也不需要知道自己归属哪个 B。可以在体验层展示“由某某服务”或不展示，具体由产品决定。

### 5.2 B 注册总原则

B 的注册不应设计成一套独立账号系统。B 首先仍然是一个小程序 `User`，完成微信授权和手机号授权后，再申请创建或加入一个 `Partner` 经营主体。

```text
User 注册解决：谁在登录
Partner 申请解决：这个人要经营什么主体
PartnerMember 解决：这个人在主体里是什么角色
后台审核解决：平台是否允许该主体经营
```

这样设计可以同时支持个人团长、达人、门店、服务商和机构，不会把 B 锁死为 `users.identity = B`。

### 5.3 B 主动申请注册流程

```text
用户进入小程序
  ↓
微信授权 + 手机号授权
  ↓
如果 User 不存在：创建 User
如果 User 已存在：直接登录
  ↓
进入 B 入驻申请页
  ↓
提交 B 入驻资料
  ↓
创建 Partner(pending)
  ↓
创建 PartnerMember(role = owner)
  ↓
S 后台审核
  ├─ 通过：Partner active，生成邀请码
  └─ 拒绝：Partner rejected，允许修改重提
```

提交资料建议：

| 字段 | 必填 | 说明 |
|------|------|------|
| displayName | 是 | B 对外展示名称，例如团长名、门店名、服务商名 |
| type | 是 | `individual`、`store`、`creator`、`agency`、`service_provider` |
| contactName | 是 | 负责人姓名 |
| contactPhone | 是 | 联系手机号，后端按敏感信息加密存储 |
| regionCode | 否 | 所在地区 |
| profile | 否 | 经营简介、渠道说明、社群规模等 |
| qualificationFiles | 否 | 资质材料，MVP 可暂缓 |

数据写入：

- `users`：如果用户首次进入，创建登录账号。
- `partners`：创建 B 端经营主体，状态为 `pending`。
- `partner_members`：创建 owner 成员关系。
- `relation_events` 或 `audit_logs`：记录 B 申请事件。

关键约束：

- `Partner` 是经营主体，不是登录账号。
- `PartnerMember` 记录哪个 `User` 能操作这个 B。
- MVP 只创建一个 owner 成员，但表结构允许后续增加运营、财务、客服。
- 同一个 `User` 在 MVP 阶段最多只能拥有一个 active 或 pending 的 `Partner`。
- 审核通过前，B 不能生成正式邀请码，也不能产生佣金。

### 5.4 B 受邀入驻流程

平台可能会通过定向邀请招募 B，例如邀请某个团长、达人或门店入驻。此时推荐使用“B 招募邀请码”，与 C 注册邀请码区分。

```text
S 后台创建 B 招募邀请
  ↓
生成 invitationCode(scene = partner_apply)
  ↓
候选 B 打开邀请链接或扫码
  ↓
微信授权 + 手机号授权
  ↓
创建或登录 User
  ↓
系统解析招募邀请码，预填渠道来源
  ↓
候选 B 提交 Partner 入驻资料
  ↓
创建 Partner(pending, source_invitation_code)
  ↓
创建 PartnerMember(owner)
  ↓
S 后台审核
```

与 C 邀请注册的区别：

| 项目 | C 邀请注册 | B 受邀入驻 |
|------|------------|------------|
| scene | `register` | `partner_apply` |
| 目标 | 创建 C 并绑定 B-C 关系 | 创建 B 经营主体 |
| 归属对象 | `CustomerRelation` | `Partner` 来源 |
| 是否产生 B 权限 | 否 | 审核通过后产生 |

### 5.5 后台代创建 B 流程

线下签约、批量招商或运营代录时，可以由 S 后台先创建 `Partner`。

```text
S 后台填写 B 资料
  ↓
选择：
  ├─ 绑定已有 User 为 owner
  └─ 生成 owner 绑定邀请链接
  ↓
创建 Partner
  ↓
如果绑定已有 User：创建 PartnerMember(owner)
  ↓
设置状态：
  ├─ pending：仍需审核
  └─ active：线下已审核，直接启用
```

适用场景：

- 平台已经在线下完成签约。
- 运营批量导入门店或服务商。
- B 负责人暂未登录小程序，需要后续绑定 owner。

风险控制：

- 后台直接创建 active Partner 必须有独立权限，例如 `partner:create-active`。
- 后台代创建和 owner 绑定都必须写入审计日志。
- 未绑定 owner 的 Partner 不能登录 B 工作台。

### 5.6 B 审核与启用流程

```text
Partner(pending)
  ↓ S 审核资料
  ├─ approve
  │    ↓
  │  Partner(active)
  │    ↓
  │  生成正式 InvitationCode(scene = register, owner_type = partner)
  │    ↓
  │  开通 B 工作台
  │
  └─ reject
       ↓
     Partner(rejected)
       ↓
     B 修改资料后重新提交
       ↓
     Partner(pending)
```

审核通过后开通能力：

- B 工作台。
- B 专属邀请码/二维码。
- 客户列表。
- 邀请数据概览。
- 佣金概览，若佣金模块已上线。

审核拒绝后：

- 保留拒绝原因。
- 允许 B 修改资料后重新提交。
- 不生成正式 C 注册邀请码。
- 不允许进入 B 工作台。

### 5.7 B 状态机

```text
draft     草稿，资料未提交
  ↓ submit
pending   待审核
  ↓ approve
active    正常经营
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

| 状态 | 是否有 B 工作台 | 是否可邀请 C | 是否可产生佣金 | 说明 |
|------|-----------------|---------------|----------------|------|
| draft | 否 | 否 | 否 | 已开始填写但未提交 |
| pending | 否 | 否 | 否 | 等待后台审核 |
| active | 是 | 是 | 是 | 正常经营 |
| rejected | 否 | 否 | 否 | 审核拒绝，可重提 |
| frozen | 有限 | 否 | 冻结 | 风控冻结，可只允许查看历史 |
| disabled | 否 | 否 | 否 | 停用 |

### 5.8 S 后台账号

```text
超级管理员创建 Admin
  ↓
分配 Role 和 Permission
  ↓
Admin 审核 Partner、管理关系、处理佣金和结算
```

S 继续使用当前后台 `Admin` 体系，不与 `User` 混用。

## 6. 数据库设计建议

### 6.1 Partner

```sql
CREATE TABLE partners (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  partner_no TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL,                  -- individual / store / creator / agency / service_provider
  level_id BIGINT,
  status SMALLINT NOT NULL DEFAULT 0,  -- 0待审 1正常 2拒绝 3冻结 4停用
  audit_status SMALLINT NOT NULL DEFAULT 0,
  audit_reason TEXT,
  contact_name TEXT,
  contact_phone_ciphertext BYTEA,
  contact_phone_hash TEXT,
  contact_phone_masked TEXT,
  region_code TEXT,
  profile JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);
```

说明：

- 不强制把 `user_id` 放到 `partners` 上，避免把主体和操作者绑定死。
- owner 关系由 `partner_members` 表表达。
- 如果 MVP 查询频繁，也可以冗余 `owner_user_id`，但权威关系仍以 `partner_members` 为准。

### 6.2 PartnerMember

```sql
CREATE TABLE partner_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role TEXT NOT NULL,                  -- owner / operator / finance / customer_service
  status SMALLINT NOT NULL DEFAULT 1,  -- 0禁用 1启用
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (partner_id, user_id, role)
);
```

MVP 约束：

- 一个 `Partner` 只允许一个有效 owner。
- 一个 `User` 默认只允许拥有一个 active Partner。
- 后续如支持团队，可放开 operator、finance、customer_service。

### 6.3 CustomerRelation

```sql
CREATE TABLE customer_relations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  customer_user_id BIGINT NOT NULL,
  source_invitation_code TEXT,
  status SMALLINT NOT NULL DEFAULT 1,  -- 0失效 1有效 2争议中
  bound_at TIMESTAMPTZ NOT NULL,
  unbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

推荐索引：

```sql
CREATE UNIQUE INDEX uk_customer_relations_active_customer
ON customer_relations(customer_user_id)
WHERE status = 1;

CREATE INDEX idx_customer_relations_partner_status
ON customer_relations(partner_id, status);
```

这个设计明确 MVP 中一个 C 只能有一个有效归属。如果未来要支持多个 B 服务同一 C，可以新增关系类型或放宽部分唯一索引。

### 6.4 RelationEvent

```sql
CREATE TABLE relation_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  relation_id BIGINT,
  partner_id BIGINT,
  customer_user_id BIGINT,
  event_type TEXT NOT NULL,          -- invited / bound / transferred / unbound / disputed / resolved
  source_type TEXT,                  -- invitation / admin / system / order
  source_id TEXT,
  operator_type TEXT NOT NULL,       -- user / admin / system
  operator_id BIGINT,
  reason TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

用途：

- 记录 C 是通过哪个 B 的哪个入口进入。
- 记录后台是否手工转移归属。
- 记录解绑和争议处理原因。
- 作为佣金争议和客服处理依据。

## 7. 权限设计

### 7.1 小程序 B 端权限

用户访问 B 端接口时，后端应验证：

```text
当前 user_id
  ↓
是否存在 partner_members.status = active
  ↓
角色是否具备接口权限
  ↓
Partner 是否 active
```

MVP 角色建议：

| 角色 | 权限 |
|------|------|
| owner | 全部 B 端权限 |
| operator | 查看客户、生成邀请 |
| finance | 查看佣金和结算 |
| customer_service | 查看客户基础信息 |

MVP 可以只实现 owner，但接口鉴权预留角色判断。

### 7.2 后台权限

继续使用 `Admin / Role / Permission`：

- `partner:read`
- `partner:approve`
- `partner:freeze`
- `partner-member:manage`
- `relation:read`
- `relation:transfer`
- `relation:dispute`
- `commission:read`
- `commission:adjust`

## 8. 邀请与归属规则

### 8.1 邀请码归属

邀请码应归属于 `Partner`，而不是直接归属于 `User`。

```text
InvitationCode.owner_type = partner
InvitationCode.owner_id = partner_id
```

原因：

- 如果 B 有多个成员，成员分享的入口仍属于同一个经营主体。
- 佣金和客户归属应进入 Partner，不应进入某个成员 User。
- 后续可以追加 `created_by_user_id` 记录哪个成员生成了码。

### 8.2 归属绑定规则

MVP 推荐规则：

- C 未注册时，通过有效邀请码注册，绑定到对应 Partner。
- C 已注册且无有效归属时，可绑定到 Partner。
- C 已有有效归属时，不自动覆盖。
- 后台可以手工转移归属，但必须填写原因并写入 `RelationEvent`。
- Partner 非 active 时，其邀请码不可绑定新 C。

## 9. 对现有表的影响

### 9.1 users

现有 `identity`、`level`、`invitedBy` 可以保留为兼容字段，但不建议继续作为核心判断依据。

建议迁移方向：

- `identity`：仅作为注册意向或展示标签。
- `level`：如果指 B 等级，应迁移到 `partner_levels`。
- `invitedBy`：历史邀请人字段，后续由 `relation_events` 和 `customer_relations` 替代。

### 9.2 member_invitations

可以保留并演进为邀请记录表，也可以新增 `invitation_records`。

推荐：

- `InvitationCode` 负责可复用的邀请码。
- `InvitationRecord` 负责每一次扫码、解析、注册、绑定转化。
- `RelationEvent` 负责客户归属变化事件。

三者不要混用。

## 10. API 调整建议

### 10.1 B 端

| 接口 | 说明 |
|------|------|
| `POST /partner/apply` | 创建 Partner + owner PartnerMember |
| `GET /partner/me` | 查询当前用户可操作的 Partner |
| `GET /partner/members` | 查询 B 成员，P2 开放 |
| `POST /partner/members` | 添加成员，P2 开放 |
| `GET /partner/customers` | 查询 Partner 名下 C |
| `GET /partner/invitation-code` | 获取 Partner 邀请码 |

### 10.2 C 注册

| 接口 | 说明 |
|------|------|
| `POST /invitation/resolve` | 解析 Partner 邀请码 |
| `POST /auth/register` | 注册 User 后按临时态创建 CustomerRelation |

### 10.3 后台

| 接口 | 说明 |
|------|------|
| `GET /admin/partners` | B 主体列表 |
| `GET /admin/partners/:id` | B 详情，包括成员和客户概览 |
| `POST /admin/partners/:id/approve` | 审核通过 |
| `POST /admin/partners/:id/reject` | 审核拒绝 |
| `POST /admin/partners/:id/freeze` | 冻结 |
| `GET /admin/relations` | 客户归属列表 |
| `POST /admin/relations/:id/transfer` | 转移归属 |
| `GET /admin/relation-events` | 查看关系事件 |

## 11. 实施路径

### 阶段 1：补建模，不开放复杂能力

- 新增 `partners`。
- 新增 `partner_members`。
- 新增 `customer_relations`。
- 新增 `relation_events`。
- B 入驻时只创建 owner。

验收标准：

- 用户可申请 B。
- 审核通过后生成 Partner 邀请码。
- C 通过 B 邀请码注册后绑定到 Partner。
- 关系事件可查。

### 阶段 2：后台治理

- 后台 B 列表和详情。
- B 审核、拒绝、冻结。
- 客户归属查询。
- 关系转移和事件审计。

验收标准：

- 后台能完成 B 生命周期管理。
- 所有关键操作有事件或审计记录。

### 阶段 3：B 工作台

- B 查看邀请数据。
- B 查看客户列表。
- B 查看收益摘要。
- 暂不开放成员管理。

验收标准：

- owner 可以使用 B 端基础经营能力。

### 阶段 4：多人协作与佣金结算

- 开放 `PartnerMember` 多角色。
- 引入佣金台账和结算批次。
- 成员权限按角色控制。

验收标准：

- 一个 Partner 可由多人协作。
- 财务角色可看收益，运营角色不可看敏感结算信息。

## 12. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 模型比 MVP 稍重 | 初期开发量增加 | 阶段 1 只实现 owner，不开放成员管理 |
| Partner 与 User 查询多一步 | 接口复杂度增加 | 提供 `PartnerContext` 鉴权封装 |
| 关系事件过多 | 数据增长 | 按 partner_id、created_at 建索引，后续归档 |
| 归属转移产生佣金争议 | 财务风险 | 订单生成时快照 partner_id，RelationEvent 仅解释关系历史 |
| 邀请码归属不清 | 业绩统计错误 | 邀请码归属 Partner，分享人另存 created_by_user_id |

## 13. 推荐结论

推荐采用升级后的折中方案：

```text
User + Partner + PartnerMember + CustomerRelation + RelationEvent
```

理由：

- 比 `User.identity` 更符合平台化需求。
- 比完整 `Organization` 模型更轻，适合当前项目阶段。
- 能支持个人 B，也能自然扩展到门店、机构和服务商。
- 能为佣金、结算、风控和客诉提供清晰审计基础。

MVP 执行时仍保持简单：

- 一个 User 默认最多拥有一个 active Partner。
- 一个 Partner 初期只有一个 owner。
- 一个 C 只有一个 active CustomerRelation。
- 所有关系变化写 RelationEvent。
- 多成员、复杂权限、多级分佣、自动结算全部后置。

## 14. 待评审问题

- B 是否会出现门店、团队、机构等多人协作场景？
- 是否允许平台员工代 B 创建或管理 Partner？
- C 是否永远只能归属一个 B，还是未来可能有多个服务关系？
- 邀请业绩应该归属于 Partner，还是归属于具体分享成员？
- B 的收益是否归主体结算，还是可以拆给成员？
- 是否需要在第一版后台展示 RelationEvent 全量历史？
