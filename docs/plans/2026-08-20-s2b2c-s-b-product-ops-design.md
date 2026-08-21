# S2B2C 方案二管理与运营技术设计评审稿

## 1. 文档目的

本文档基于方案二：

```text
User + Partner + PartnerMember + CustomerRelation + RelationEvent
```

进一步评估 S 怎么管理、B 怎么管理、产品怎么管理、运营怎么做，以及对应的技术设计和实现路径。

本文档不替代前置文档，而是补充“平台进入经营阶段后，各方如何使用系统，以及系统需要扩展哪些模块”。

关联文档：

- `docs/plans/2026-08-19-s2b2c-platform-upgraded-model-design.md`
- `docs/plans/2026-08-19-s2b2c-registration-flowcharts-review.md`

## 2. 总体业务视角

S2B2C 平台不是只有注册和邀请。完整经营链路应分为四个管理面：

| 管理面 | 使用方 | 核心问题 |
|--------|--------|----------|
| S 平台管理 | 平台管理员 | 谁可以成为 B、B 怎么经营、规则怎么配置、风险怎么控制 |
| B 经营管理 | B 主体及成员 | 怎么获客、服务 C、看客户、看业绩、看收益 |
| 产品管理 | S 平台运营/商品人员 | 平台卖什么、谁能卖、价格权益怎么配置 |
| 运营管理 | S 运营 / B 运营 | 怎么拉新、转化、复购、活动、数据分析 |

推荐把 BlissTribe 的方案二理解为：

```text
S 提供供给、规则、系统和治理
B 负责获客、服务、转化和局部运营
C 完成注册、消费、复购和传播
```

## 3. 推荐架构

继续采用模块化单体，不拆微服务。

```text
apps/admin 后台管理
  |-- S 平台管理
  |-- 产品管理
  |-- 运营管理
  |-- 财务/结算
  |-- 风控/审计

apps/miniapp 小程序
  |-- C 注册和消费
  |-- B 入驻和工作台
  |-- B 邀请和客户管理

apps/api NestJS API
  |-- auth
  |-- user
  |-- admin
  |-- partner
  |-- partner-member
  |-- customer-relation
  |-- relation-event
  |-- product
  |-- product-policy
  |-- campaign
  |-- order
  |-- commission
  |-- settlement
  |-- audit-log
  |-- stats

PostgreSQL + Redis + 文件存储
```

架构原则：

- KISS：第一阶段仍是 NestJS 模块化单体，减少分布式复杂度。
- YAGNI：先支持平台自营产品/服务和一级 B-C 关系，不做开放商家市场和多级分销。
- SOLID：Partner、Product、Campaign、Commission、Settlement 分模块，避免把经营能力塞进 User 或 Invitation。
- DRY：状态枚举、角色权限、错误码、分页响应统一放入 `packages/shared`。

## 4. S 怎么管理

### 4.1 S 的角色划分

S 是平台方，使用现有后台 `Admin / Role / Permission` 体系扩展。

推荐角色：

| 角色 | 职责 |
|------|------|
| super_admin | 全局配置、管理员、敏感操作 |
| partner_operator | B 招募、审核、冻结、客户归属处理 |
| product_operator | 产品/服务上架、价格、分佣策略 |
| content_operator | Banner、活动页、素材、公告 |
| finance | 佣金台账、结算批次、调账 |
| risk_auditor | 风控、审计日志、异常处理 |
| data_operator | 数据看板、导出、经营分析 |

MVP 可以先保留 `super_admin` 和 `operator`，但权限码先按细粒度设计。

### 4.2 S 管理 B

S 对 B 的管理不是简单用户管理，而是经营主体生命周期管理。

核心能力：

- B 列表：按状态、类型、地区、等级、注册来源筛选。
- B 审核：查看入驻资料，审核通过/拒绝。
- B 冻结：异常邀请、违规行为、结算风险时冻结。
- B 等级：配置 B 等级、权益、佣金比例。
- B 成员：查看 owner，P2 支持添加运营、财务等成员。
- B 客户：查看 B 名下 C 数量、转化、活跃、消费。
- B 经营数据：邀请数、注册数、订单数、GMV、佣金。
- 归属处理：客户归属转移、解绑、争议处理。

后台页面建议：

| 页面 | 说明 |
|------|------|
| B 主体列表 | B 检索、状态、等级、来源、经营数据摘要 |
| B 主体详情 | 基础资料、成员、客户、邀请、佣金、审计 |
| B 审核队列 | 待审核、驳回原因、审核记录 |
| B 等级配置 | 等级、佣金比例、权益、准入条件 |
| B 风控列表 | 异常邀请、异常订单、冻结记录 |
| 客户归属管理 | 当前归属、转移、解绑、争议 |

### 4.3 S 管理规则

S 需要配置平台规则，而不是把规则写死在代码里。

规则类型：

- B 准入规则：是否需要审核、资料必填项、资质要求。
- 邀请规则：邀请码有效期、使用次数、是否允许覆盖归属。
- 归属规则：C 是否允许转移、冷却期、人工审批。
- 产品可售规则：哪些 Partner 等级可以销售哪些产品。
- 佣金规则：按产品、等级、活动设置佣金比例。
- 结算规则：可结算周期、最低结算金额、冻结期。

MVP 建议：

- 规则以数据库配置为主，不上规则引擎。
- 复杂规则先通过明确字段表达，例如 `commission_rate_bps`、`settlement_delay_days`。
- 所有规则变更写 `audit_logs`。

### 4.4 S 关键接口

| 接口 | 说明 |
|------|------|
| `GET /admin/partners` | B 主体列表 |
| `GET /admin/partners/:id` | B 详情 |
| `POST /admin/partners/:id/approve` | 审核通过 |
| `POST /admin/partners/:id/reject` | 审核拒绝 |
| `POST /admin/partners/:id/freeze` | 冻结 |
| `POST /admin/partners/:id/unfreeze` | 解冻 |
| `PUT /admin/partner-levels/:id` | 等级配置 |
| `GET /admin/customer-relations` | 归属列表 |
| `POST /admin/customer-relations/:id/transfer` | 归属转移 |
| `GET /admin/audit-logs` | 审计日志 |

## 5. B 怎么管理

### 5.1 B 工作台定位

B 工作台不应设计成完整后台系统，MVP 应该放在小程序内，围绕高频经营动作：

- 我要拉新：邀请码、海报、分享链接。
- 我要看客户：我的客户、注册状态、活跃状态。
- 我要看业绩：邀请、转化、订单、GMV。
- 我要看收益：待结算、已结算、冻结、驳回。
- 我要管理资料：主体资料、联系方式、成员信息。

### 5.2 B 成员与权限

方案二引入 `PartnerMember`，即使 MVP 只开放 owner，也应按角色设计。

| 角色 | MVP 是否开放 | 权限 |
|------|--------------|------|
| owner | 是 | 全部 B 端能力 |
| operator | 否，P2 | 邀请、客户、活动执行 |
| finance | 否，P2 | 收益、结算、发票资料 |
| customer_service | 否，P2 | 客户查看、跟进记录 |

B 端接口鉴权逻辑：

```text
当前 User
  ↓
查询 PartnerMember
  ↓
校验 Partner.status = active
  ↓
校验 member.role 是否有权限
  ↓
执行业务操作
```

### 5.3 B 管理客户

B 看到的客户应来自 `CustomerRelation`，不是 `users.invited_by`。

客户列表字段建议：

| 字段 | 说明 |
|------|------|
| customerUserId | C 用户 ID |
| nickname | 昵称 |
| avatar | 头像 |
| phoneMasked | 脱敏手机号，可按权限控制是否展示 |
| boundAt | 绑定时间 |
| sourceInvitationCode | 来源邀请码 |
| lastActiveAt | 最近活跃时间 |
| orderCount | 订单数 |
| totalAmountCent | 累计消费 |
| relationStatus | 归属状态 |

隐私约束：

- B 不应看到 C 的明文手机号。
- 默认只展示脱敏手机号。
- 若后续允许 B 联系 C，应通过平台内 IM、企微、工单或授权联系方式处理。

### 5.4 B 管理邀请

B 的邀请码应归属于 `Partner`。

```text
InvitationCode.owner_type = partner
InvitationCode.owner_id = partner_id
InvitationCode.created_by_user_id = 当前成员 user_id
```

这样可以同时统计：

- 哪个 Partner 带来的客户。
- 哪个成员生成或分享了入口。
- 哪个活动场景带来的转化。

B 端页面建议：

| 页面 | 说明 |
|------|------|
| B 工作台首页 | 今日邀请、累计客户、待结算收益 |
| 邀请客户 | 邀请码、海报、分享按钮 |
| 我的客户 | 客户列表、筛选、客户详情 |
| 我的收益 | 佣金台账摘要 |
| 入驻状态 | pending/rejected/frozen 状态展示 |
| 主体资料 | 查看和修改 B 资料 |

### 5.5 B 关键接口

| 接口 | 说明 |
|------|------|
| `GET /partner/me` | 当前用户可操作的 Partner |
| `POST /partner/apply` | B 入驻申请 |
| `PUT /partner/me` | 修改 B 资料 |
| `GET /partner/dashboard` | B 工作台聚合数据 |
| `GET /partner/customers` | B 客户列表 |
| `GET /partner/invitation-code` | 获取邀请码 |
| `POST /partner/invitation-code` | 生成或刷新邀请码 |
| `GET /partner/commissions` | 收益明细 |
| `GET /partner/settlements` | 结算记录 |

## 6. 产品怎么管理

### 6.1 产品定义

S2B2C 里的“产品”不一定只是实物商品。BlissTribe 可以先抽象为 `Product`，覆盖：

- 实物商品。
- 虚拟权益。
- 服务项目。
- 课程/活动。
- 会员套餐。

MVP 不建议一开始做完整商城。推荐先做“平台产品/服务目录 + B 可推广 + C 可购买或报名”的轻量产品模型。

### 6.2 产品模型

核心模型：

| 模型 | 职责 |
|------|------|
| Product | 产品基础信息 |
| ProductSku | SKU、价格、库存或名额 |
| ProductCategory | 分类 |
| ProductMedia | 图片、视频、素材 |
| ProductPolicy | 可售范围、B 等级限制、佣金规则 |
| ProductAuditLog | 产品变更审计 |

### 6.3 产品生命周期

```text
draft 草稿
  ↓ submit
pending 待审核，若需要
  ↓ publish
active 上架
  ↓ pause
paused 暂停推广
  ↓ archive
archived 归档
```

MVP 可以简化为：

```text
draft -> active -> paused -> archived
```

### 6.4 产品管理后台

页面建议：

| 页面 | 说明 |
|------|------|
| 产品列表 | 搜索、分类、状态、价格、销量 |
| 产品编辑 | 标题、描述、主图、详情、SKU |
| 产品策略 | B 可见范围、可推广范围、佣金比例 |
| 素材管理 | B 可用推广图、文案、海报 |
| 产品数据 | 浏览、分享、注册、订单、转化 |

### 6.5 产品与 B 的关系

有两种设计方案。

#### 方案 A：全平台产品，B 默认都能推广

```text
Product active
  ↓
所有 active Partner 可推广
```

优点：

- 简单，上线快。
- 运营成本低。

缺点：

- 无法控制特定产品只给特定 B 或等级。
- 后续高价值产品、区域产品、服务产品会受限。

适用：MVP。

#### 方案 B：产品策略控制 B 可推广范围（推荐预留）

```text
Product
  ↓
ProductPolicy
  ↓
按 PartnerLevel / PartnerType / Region 控制可推广
```

优点：

- 支持产品分层、区域经营、服务商资质限制。
- 能与佣金比例、活动策略联动。

缺点：

- 设计和后台配置更复杂。

推荐做法：MVP 默认全平台可推广，但表结构保留 `ProductPolicy`。

### 6.6 产品关键接口

| 接口 | 说明 |
|------|------|
| `GET /admin/products` | 后台产品列表 |
| `POST /admin/products` | 创建产品 |
| `PUT /admin/products/:id` | 更新产品 |
| `POST /admin/products/:id/publish` | 上架 |
| `POST /admin/products/:id/pause` | 暂停 |
| `GET /products` | C 端产品列表 |
| `GET /products/:id` | C 端产品详情 |
| `GET /partner/products` | B 可推广产品 |
| `GET /partner/products/:id/share-materials` | B 获取推广素材 |

## 7. 运营怎么做

### 7.1 运营目标

运营体系要围绕四个漏斗：

```text
B 招募漏斗：曝光 -> 申请 -> 审核通过 -> 开始邀请
C 增长漏斗：扫码 -> 授权 -> 注册 -> 首次消费
产品转化漏斗：浏览 -> 分享 -> 下单/报名 -> 复购
B 经营漏斗：邀请 -> 客户 -> 订单 -> 佣金 -> 结算
```

### 7.2 运营能力模块

| 模块 | 使用方 | 说明 |
|------|--------|------|
| Campaign 活动 | S / B | 拉新、促销、报名、任务 |
| Banner 内容位 | S | 小程序首页和活动入口 |
| Material 素材 | S / B | 海报、文案、产品素材 |
| Coupon 优惠 | S / C | 优惠券、权益券 |
| Task 任务 | S / B | B 招募任务、销售任务 |
| Stats 数据 | S / B | 经营看板、漏斗分析 |
| Notification 通知 | S / B / C | 审核通知、活动通知、结算通知 |

MVP 可以优先扩展已有 `Banner`、`Invitation`、`Stats`，先不做复杂优惠券和任务系统。

### 7.3 活动设计

活动要能绑定目标和来源。

核心字段建议：

| 字段 | 说明 |
|------|------|
| campaignType | `partner_recruit`、`customer_register`、`product_promotion` |
| targetType | 面向 B、C 或全部 |
| startAt / endAt | 活动时间 |
| landingPage | 活动落地页 |
| invitationScene | 邀请场景 |
| productIds | 关联产品 |
| rewardPolicy | 奖励或佣金策略 |
| status | 草稿、上线、暂停、结束 |

### 7.4 数据看板

S 后台看板：

- 新增用户数。
- 新增 B 申请数、通过率。
- 活跃 B 数。
- C 注册转化率。
- 邀请码扫码数、注册数。
- 产品浏览、分享、订单。
- GMV、佣金、结算金额。
- 异常邀请、异常佣金。

B 工作台看板：

- 我的邀请访问数。
- 我的注册客户数。
- 我的有效客户数。
- 我的订单数。
- 我的预计收益。
- 我的待结算收益。

### 7.5 运营事件埋点

推荐建立统一事件表或事件日志。

事件类型：

- `invitation_resolved`
- `user_registered`
- `partner_applied`
- `partner_approved`
- `customer_bound`
- `product_viewed`
- `product_shared`
- `order_created`
- `commission_created`
- `settlement_created`

MVP 可以先写 PostgreSQL 事件表，后续数据量上来再考虑消息队列和数仓。

## 8. 技术设计

### 8.1 新增后端模块

| 模块 | 职责 |
|------|------|
| `partner` | Partner 入驻、审核、状态 |
| `partner-member` | B 成员和 B 端鉴权 |
| `customer-relation` | B-C 归属 |
| `relation-event` | 关系事件 |
| `product` | 产品/服务 |
| `product-policy` | 产品可推广范围和佣金策略 |
| `campaign` | 活动 |
| `commission` | 佣金台账 |
| `settlement` | 结算批次 |
| `audit-log` | 后台和敏感操作审计 |
| `material` | 推广素材 |

现有模块复用：

- `auth`：小程序登录、后台登录。
- `user`：C 用户资料。
- `admin`：S 管理员。
- `invitation`：改造成支持多 scene、多 owner。
- `banner`：运营内容位。
- `stats`：扩展为经营看板。
- `upload`：资质、产品图、素材上传。

### 8.2 数据库新增核心表

必须优先新增：

- `partners`
- `partner_members`
- `invitation_codes`
- `invitation_records`
- `customer_relations`
- `relation_events`
- `audit_logs`

产品运营阶段新增：

- `products`
- `product_skus`
- `product_categories`
- `product_media`
- `product_policies`
- `campaigns`
- `campaign_products`
- `materials`

交易收益阶段新增：

- `orders`
- `order_items`
- `commission_ledgers`
- `settlement_batches`
- `settlement_items`

### 8.3 核心表关系

```text
User 1..N PartnerMember N..1 Partner
Partner 1..N InvitationCode
Partner 1..N CustomerRelation N..1 User(C)
CustomerRelation 1..N RelationEvent
Partner 1..N CommissionLedger
Product 1..N ProductSku
Product 1..N ProductPolicy
Campaign N..N Product
Order 1..N OrderItem
Order 1..N CommissionLedger
SettlementBatch 1..N SettlementItem
```

### 8.4 权限设计

后台权限：

| 权限码 | 说明 |
|--------|------|
| `partner:read` | 查看 B |
| `partner:approve` | 审核 B |
| `partner:freeze` | 冻结 B |
| `partner-member:manage` | 管理 B 成员 |
| `product:read` | 查看产品 |
| `product:write` | 创建/编辑产品 |
| `product:publish` | 上下架产品 |
| `campaign:write` | 管理活动 |
| `relation:transfer` | 转移客户归属 |
| `commission:adjust` | 调账 |
| `settlement:create` | 创建结算 |
| `audit-log:read` | 查看审计 |

B 端权限：

| 权限码 | 说明 |
|--------|------|
| `partner.dashboard:read` | 查看工作台 |
| `partner.customer:read` | 查看客户 |
| `partner.invitation:write` | 生成邀请码 |
| `partner.product:share` | 推广产品 |
| `partner.commission:read` | 查看收益 |
| `partner.member:manage` | 管理成员，P2 |

### 8.5 事务边界

必须使用数据库事务的流程：

- B 申请：创建 `Partner` + `PartnerMember` + `AuditLog`。
- C 邀请注册：创建 `User` + `CustomerRelation` + `RelationEvent`。
- 审核 B：更新 `Partner` + 创建邀请码 + 写审计。
- 订单完成：更新订单状态 + 生成佣金台账。
- 结算批次：创建批次 + 锁定佣金记录。
- 归属转移：更新旧关系 + 新建关系 + 写 `RelationEvent`。

### 8.6 幂等设计

| 场景 | 幂等键 |
|------|--------|
| 微信注册 | `wx_open_id_hash` |
| 手机号注册 | `phone_hash` |
| 邀请绑定 | `customer_user_id + active status` |
| 订单创建 | 外部订单号或业务单号 |
| 佣金生成 | `source_type + source_id + partner_id` |
| 结算明细 | `settlement_batch_id + commission_ledger_id` |

### 8.7 缓存设计

Redis 可缓存：

- 当前用户 Partner 上下文。
- Partner 等级和权益。
- 产品可推广策略。
- 邀请码解析结果。
- 限流计数。
- 看板短期聚合结果。

不建议缓存：

- 佣金最终状态。
- 结算批次最终状态。
- 审计日志。
- 明文手机号。

### 8.8 审计与风控

必须审计：

- B 审核、拒绝、冻结、解冻。
- B 等级变更。
- 产品上下架和价格变更。
- 佣金调账。
- 结算创建和状态变更。
- 客户归属转移。
- 后台管理员权限变更。

风控指标：

- 单 B 短时间大量邀请注册。
- 同设备/同 IP 大量注册。
- C 高频更换归属。
- 订单集中来自异常 B。
- 佣金异常增长。

## 9. 前端实现

### 9.1 Admin 后台新增菜单

```text
S2B2C
  ├─ B 主体管理
  ├─ B 审核队列
  ├─ B 等级配置
  ├─ 客户归属管理
  ├─ 产品管理
  ├─ 活动管理
  ├─ 素材管理
  ├─ 佣金台账
  ├─ 结算批次
  ├─ 经营看板
  └─ 审计日志
```

### 9.2 Miniapp 小程序新增页面

```text
pages/partner/apply
pages/partner/status
pages/partner/dashboard
pages/partner/invite
pages/partner/customers
pages/partner/products
pages/partner/commissions
pages/product/list
pages/product/detail
pages/campaign/detail
```

MVP 优先：

- `partner/apply`
- `partner/status`
- `partner/dashboard`
- `partner/invite`
- `partner/customers`

## 10. 实施阶段

### 阶段 1：S 管 B + B 注册入驻

目标：先跑通 B 生命周期。

实现：

- Partner / PartnerMember。
- B 入驻申请。
- S 后台审核。
- Partner 邀请码。
- 审计日志。

验收：

- 用户能申请成为 B。
- 后台能审核通过或拒绝。
- 通过后 B 能看到工作台和邀请码。

### 阶段 2：B 管 C + 归属事件

目标：跑通 B 邀请 C。

实现：

- InvitationCode 多 scene。
- CustomerRelation。
- RelationEvent。
- B 客户列表。
- 后台客户归属管理。

验收：

- C 通过 B 邀请注册后归属到 Partner。
- B 能看到客户。
- 后台能查看归属历史。

### 阶段 3：产品管理 + B 推广

目标：让 B 推广平台产品。

实现：

- Product / ProductSku。
- ProductPolicy。
- ProductMedia / Material。
- B 可推广产品列表。
- 产品分享素材。

验收：

- 后台能上架产品。
- B 能看到可推广产品。
- C 能打开产品详情。

### 阶段 4：运营活动 + 数据看板

目标：让 S 能做增长和转化。

实现：

- Campaign。
- Banner 与活动绑定。
- 运营事件。
- Stats 看板。

验收：

- 后台能创建活动。
- 活动可绑定产品和邀请场景。
- 后台能看到 B 招募、C 注册、产品转化数据。

### 阶段 5：订单、佣金、结算

目标：形成经营闭环。

实现：

- Order / OrderItem。
- CommissionLedger。
- SettlementBatch / SettlementItem。
- 财务后台。

验收：

- C 订单完成后能生成 B 佣金。
- S 能查看和结算佣金。
- B 能查看收益状态。

## 11. 两种落地路线

### 路线 A：先运营后交易

```text
B 入驻 -> B 邀请 C -> 产品展示 -> 活动运营 -> 后接订单佣金
```

优点：

- 更适合当前项目已有注册、邀请、Banner、Stats 基础。
- 先验证增长和 B 端参与度。
- 不必一开始处理支付、订单、结算复杂度。

缺点：

- 短期无法闭环收益。
- B 的积极性可能依赖人工激励。

推荐程度：高。

### 路线 B：先交易后运营

```text
产品 -> 订单 -> 佣金 -> 结算 -> 再做活动运营
```

优点：

- 商业闭环更直接。
- B 能马上看到收益。

缺点：

- 一开始就要处理订单、支付、退款、佣金、财务。
- 实现和测试成本明显更高。

推荐程度：中。除非当前已经有明确可销售产品和支付方案，否则不建议第一阶段走这条。

## 12. 推荐结论

推荐采用方案二模型，并按“先运营后交易”落地：

```text
第 1 步：S 管 B
第 2 步：B 拉 C
第 3 步：S 管产品
第 4 步：运营活动和数据看板
第 5 步：订单、佣金、结算
```

这样能最大化复用当前项目已有能力：

- 已有小程序注册登录。
- 已有后台管理。
- 已有邀请码模块。
- 已有 Banner。
- 已有 Stats。
- 已有上传和协议模块。

同时避免一次性引入完整商城、支付、财务结算导致范围失控。

## 13. 待评审问题

- 第一阶段是否只做 B 入驻审核和邀请客户，不做产品和佣金？
- B 是否必须审核通过后才能看到工作台？
- B 是否需要多个成员协作，还是第一版只做 owner？
- 产品第一版是商品、服务、活动，还是会员权益？
- 产品是否需要真实下单支付，还是先做报名/预约/线索？
- 佣金第一版是否只做后台手工导入或模拟台账？
- S 是否需要财务角色和运营角色分开？
- C 的手机号是否允许 B 查看脱敏值，还是完全不展示？
- 客户归属是否允许后台转移，是否需要冷却期？
- 运营活动是否要和邀请码强绑定？
