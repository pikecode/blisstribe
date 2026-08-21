# BlissTribe S2B2C 平台扩展设计评审稿

## 1. 背景与目标

当前 BlissTribe 已具备小程序注册登录、用户资料、邀请码、后台管理、Banner、协议、上传、统计等基础能力。若要演进为 S2B2C 平台，核心变化不是只增加“邀请关系”，而是引入三类经营主体与一组可核算的业务闭环：

- S：平台方，负责规则、供给、内容、商品/服务、结算、风控、运营和后台治理。
- B：渠道方、团长、达人、服务商、主理人或门店，负责获客、转化、社群服务和部分履约协同。
- C：终端消费者，负责浏览、注册、下单、消费、复购和推荐。

本设计目标是把现有用户体系扩展为支持 S2B2C 的平台底座，优先形成“B 入驻/审核/邀请 C/权益与佣金核算/后台管理”的闭环，同时保留后续商品、订单、分佣、提现、营销活动的演进空间。

## 2. 设计假设

- 当前阶段优先支持微信小程序端获客，后台管理负责审核、配置和运营。
- MVP 不拆微服务，继续使用 NestJS 模块化单体、Prisma、PostgreSQL、Redis。
- B 可以来自用户升级，也可以由后台创建或邀请码邀请入驻。
- C 与 B 的关系需要可追踪，但不应简单依赖 `users.invited_by` 单字段承载所有业务语义。
- 初期以“邀请归属 + 等级权益 + 手动/规则化佣金记录”为主，暂不实现复杂多级分销。
- 金额类数据必须使用整数分存储，所有结算记录保留审计轨迹。

## 3. 业务范围

### 3.1 MVP 范围

- B 端身份：申请入驻、资料提交、审核通过/拒绝、启用/禁用。
- 邀请链路：B 生成邀请入口，C 通过邀请注册，系统记录归属关系。
- 关系管理：后台查看 B 名下 C 用户、邀请记录、转化状态。
- 权益等级：配置 B 的等级、有效期、基础权益、佣金比例。
- 佣金台账：按订单或运营动作生成佣金记录，支持待结算、已结算、驳回。
- 后台治理：B 列表、审核、等级调整、佣金查询、风控冻结。
- 小程序展示：C 端识别邀请来源，B 端查看自己的邀请与收益概览。

### 3.2 暂缓范围

- 多级无限分销。
- 完整商城、库存、物流、售后。
- 自动打款到微信/银行卡。
- 独立 B 端 Web 工作台。
- 消息队列和微服务拆分。

这些能力不是否定，而是延后到订单、佣金和履约模型跑通之后再扩展，符合 YAGNI。

## 4. 可选方案评估

### 方案 A：在现有 User 上增加身份字段

做法是在 `users.identity`、`users.level`、`users.invited_by` 基础上继续扩展字段。

优点是改动小、上线快、查询简单。缺点是用户、B 主体、邀请关系、结算信息会混在一张表里，后续角色扩展和审计困难。该方案适合一次性活动或轻量邀请，不适合平台化经营。

### 方案 B：模块化单体 + 独立业务主体模型（推荐）

保留 `User` 作为登录账号和自然人资料，新增 `Partner` 表表达 B 端经营主体，新增 `CustomerRelation` 表表达 B-C 关系，新增 `CommissionLedger` 表表达佣金台账。

优点是边界清晰，既复用现有登录注册能力，又能支撑 B 端审核、等级、结算和风控。缺点是需要新增模块和迁移现有邀请码数据。该方案最符合当前 NestJS 模块化结构。

### 方案 C：直接拆微服务

将用户、渠道、订单、结算拆成独立服务。

优点是长期扩展性强。缺点是当前业务闭环尚未验证，会引入分布式事务、链路追踪、服务治理和部署复杂度。现阶段不推荐。

## 5. 推荐架构

推荐采用方案 B：模块化单体扩展。

```text
微信小程序 / 后台管理
        |
        v
NestJS API
  |-- Auth 用户认证
  |-- User 用户资料
  |-- Partner B 端主体
  |-- Invitation 邀请入口
  |-- Relation B-C 归属关系
  |-- Benefit 权益等级
  |-- Order 订单或业务单据
  |-- Commission 佣金台账
  |-- Settlement 结算批次
  |-- Admin 后台治理
        |
        v
PostgreSQL + Redis + 文件存储
```

架构原则：

- KISS：继续使用单体部署，降低开发和排障成本。
- YAGNI：先做一层 B-C 关系，不预设复杂多级分销。
- SOLID：账号、主体、关系、收益、结算分模块建模，避免单表承担多职责。
- DRY：共享枚举、错误码、DTO 类型沉淀到 `packages/shared`。

## 6. 领域模型

### 6.1 核心对象

| 对象 | 含义 | 关键职责 |
|------|------|----------|
| User | 登录用户/自然人 | 登录、实名资料、基础用户信息 |
| Partner | B 端经营主体 | 入驻、审核、等级、状态、经营资料 |
| PartnerLevel | B 等级 | 权益、佣金比例、有效期规则 |
| InvitationCode | 邀请码/邀请链接 | 来源识别、渠道归因、有效期 |
| CustomerRelation | B-C 归属关系 | 绑定来源、关系状态、归属变更 |
| BenefitPolicy | 权益策略 | 不同等级可见能力和限制 |
| Order | 订单或业务单据 | 交易、履约、佣金计算依据 |
| CommissionLedger | 佣金台账 | 应计、冻结、结算、驳回 |
| SettlementBatch | 结算批次 | 批量结算、审核、打款状态 |
| AuditLog | 审计日志 | 后台操作、关键状态变更 |

### 6.2 身份关系

一个 `User` 可以只是 C，也可以申请成为 B。成为 B 后生成一个或多个 `Partner` 主体。建议 MVP 先限制一个用户只能绑定一个有效 Partner，后续如支持门店矩阵，再放开为一对多。

`CustomerRelation` 不等同于邀请记录。邀请记录表达“谁带来注册”，归属关系表达“当前由哪个 B 服务”。两者拆开后，后续才支持转移、失效、重新绑定、申诉和运营调整。

## 7. 数据库扩展建议

### 7.1 新增表

```sql
-- B 端主体
partners (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  partner_no TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL,              -- individual / store / creator / service_provider
  level_id BIGINT,
  status SMALLINT NOT NULL,        -- pending / active / rejected / frozen / disabled
  audit_status SMALLINT NOT NULL,
  audit_reason TEXT,
  contact_name TEXT,
  contact_phone_ciphertext BYTEA,
  contact_phone_hash TEXT,
  contact_phone_masked TEXT,
  region_code TEXT,
  profile JSONB DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);
```

```sql
-- B 等级
partner_levels (
  id BIGINT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  commission_rate_bps INT NOT NULL, -- 万分比，例如 1200 = 12%
  benefits JSONB DEFAULT '{}',
  status SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- 邀请入口
invitation_codes (
  id BIGINT PRIMARY KEY,
  owner_type TEXT NOT NULL,         -- user / partner / campaign
  owner_id BIGINT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  scene TEXT NOT NULL,              -- register / partner_apply / campaign
  max_uses INT,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  status SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

```sql
-- B-C 关系
customer_relations (
  id BIGINT PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  customer_user_id BIGINT NOT NULL,
  source_invitation_id BIGINT,
  bind_type TEXT NOT NULL,          -- invite / admin / transfer
  status SMALLINT NOT NULL,         -- active / inactive / disputed
  bound_at TIMESTAMPTZ NOT NULL,
  unbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (partner_id, customer_user_id)
);
```

```sql
-- 佣金台账
commission_ledgers (
  id BIGINT PRIMARY KEY,
  partner_id BIGINT NOT NULL,
  customer_user_id BIGINT,
  source_type TEXT NOT NULL,        -- order / manual / adjustment
  source_id BIGINT,
  amount_cent BIGINT NOT NULL,
  currency TEXT DEFAULT 'CNY',
  rate_bps INT,
  status SMALLINT NOT NULL,         -- pending / frozen / settleable / settled / rejected
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 7.2 调整现有表

- `users.identity` 可保留为展示用或注册意向，但不要作为权限和主体判断的唯一来源。
- `users.invited_by` 可以迁移为历史邀请关系，不再承载 B-C 服务归属。
- `member_invitations` 可演进为 `invitation_records`，记录每次扫码、注册、入会、绑定状态。
- `Admin` 权限码需要新增 `partner:*`、`commission:*`、`settlement:*`、`relation:*`。

### 7.3 索引建议

- `partners(user_id)`、`partners(status, audit_status)`。
- `invitation_codes(code)` 唯一索引。
- `customer_relations(customer_user_id, status)` 用于判断 C 当前归属。
- `commission_ledgers(partner_id, status, occurred_at)` 用于 B 端收益列表。
- `commission_ledgers(source_type, source_id)` 用于幂等生成佣金。

## 8. API 扩展

### 8.1 小程序端

| 接口 | 说明 |
|------|------|
| `POST /partner/apply` | 用户申请成为 B |
| `GET /partner/me` | 查询我的 B 主体状态 |
| `GET /partner/dashboard` | B 端概览：邀请数、客户数、待结算收益 |
| `GET /partner/customers` | B 查看名下 C |
| `GET /partner/commissions` | B 查看收益明细 |
| `POST /invitation/resolve` | 根据 code/scene 解析邀请来源 |
| `POST /invitation/bind` | 注册后绑定邀请关系 |

### 8.2 后台端

| 接口 | 说明 |
|------|------|
| `GET /admin/partners` | B 主体列表 |
| `POST /admin/partners/:id/approve` | 审核通过 |
| `POST /admin/partners/:id/reject` | 审核拒绝 |
| `POST /admin/partners/:id/freeze` | 冻结 B |
| `PUT /admin/partner-levels/:id` | 配置 B 等级 |
| `GET /admin/customer-relations` | 查询 B-C 关系 |
| `POST /admin/customer-relations/transfer` | 归属转移 |
| `GET /admin/commissions` | 佣金台账 |
| `POST /admin/commissions/adjust` | 手工调账 |
| `POST /admin/settlements` | 创建结算批次 |

## 9. 前端与后台改造

### 9.1 小程序

新增页面：

- `/pages/partner/apply`：B 入驻申请。
- `/pages/partner/dashboard`：B 工作台。
- `/pages/partner/customers`：客户列表。
- `/pages/partner/invite`：邀请海报/邀请码。
- `/pages/partner/commission`：收益明细。

注册页需要支持从二维码、分享链接、邀请码进入，并在注册完成后调用绑定接口。注意邀请来源应存在服务端临时态，不能只依赖前端缓存。

### 9.2 后台管理

新增菜单：

- B 端管理：列表、审核、冻结、等级调整。
- 关系管理：B-C 归属、转移、争议处理。
- 佣金管理：台账、调账、结算批次。
- 权益配置：等级、佣金比例、功能权限。
- 风控审计：异常邀请、异常收益、后台操作日志。

## 10. 关键流程

### 10.1 B 入驻

```text
用户提交资料 -> 创建 Partner(pending) -> 后台审核
  -> 通过：Partner active + 分配等级 + 生成邀请码
  -> 拒绝：记录原因，允许重新提交
```

### 10.2 C 通过 B 邀请注册

```text
C 扫码进入 -> 解析 invitation_code -> 临时保存来源
-> 微信授权注册 -> 创建 User -> 写入 invitation_record
-> 创建 customer_relation -> 返回首页
```

### 10.3 佣金生成

```text
订单或运营动作完成 -> 查询 C 当前有效归属 -> 查询 Partner 等级
-> 按规则生成 commission_ledger -> 风控检查
-> 达到可结算状态 -> 后台创建结算批次
```

佣金生成必须幂等，建议以 `source_type + source_id + partner_id` 做唯一约束。

## 11. 权限与安全

- 小程序 C 端只能访问自己的数据。
- B 端接口必须校验当前 `user_id` 是否拥有有效 `partner`。
- 后台按 RBAC 权限码控制操作，例如 `partner:approve`、`commission:adjust`。
- 邀请码需要限流，防止批量撞库和刷邀请。
- B-C 归属变更必须写审计日志。
- 佣金调账必须记录操作人、原因、前后金额和审批状态。
- 联系电话继续沿用手机号密文、哈希、脱敏三字段策略。

## 12. 非功能要求

| 分类 | MVP 目标 |
|------|----------|
| 性能 | 核心 API p95 < 300ms |
| 可用性 | 99.9%，单区域部署即可 |
| 一致性 | 注册、绑定关系、佣金台账要求数据库事务 |
| 可观测性 | 关键流程记录结构化日志和 requestId |
| 审计 | 审核、冻结、调账、结算必须可追踪 |
| 风控 | 邀请、注册、收益生成按 IP/User/Partner 限流 |

## 13. 分阶段实施

### 阶段 1：主体与邀请关系

- 新增 Partner、PartnerLevel、InvitationCode、CustomerRelation。
- 改造注册链路，支持邀请码归属绑定。
- 后台支持 B 审核和客户关系列表。

验收标准：B 可以入驻，C 可以通过 B 邀请注册，后台能查到归属。

### 阶段 2：B 工作台与权益

- 小程序新增 B 工作台。
- 支持 B 邀请码、客户列表、等级展示。
- 后台支持等级和权益配置。

验收标准：B 可以自助获客并查看基础转化数据。

### 阶段 3：佣金台账

- 新增 CommissionLedger。
- 先支持手动或模拟业务单据生成佣金。
- 后台支持查询、冻结、驳回、调账。

验收标准：每笔收益有来源、有状态、有审计。

### 阶段 4：订单与自动结算

- 引入 Order 或具体业务单据。
- 佣金自动计算。
- 新增 SettlementBatch。

验收标准：交易完成后可自动进入可结算台账，后台可批量结算。

## 14. ADR 草案

### ADR-001：采用模块化单体而非微服务

状态：Proposed。

决策：S2B2C MVP 继续在现有 NestJS API 中按模块扩展，不拆独立服务。

原因：当前团队和业务阶段更需要快速验证闭环。模块化单体能复用现有认证、用户、后台和数据库事务，避免分布式事务和运维复杂度。

代价：后续某些模块可能需要拆分。缓解方式是在模块边界、表关系和事件命名上保持清晰。

### ADR-002：User 与 Partner 分离

状态：Proposed。

决策：User 只表示登录账号和自然人，Partner 表示 B 端经营主体。

原因：一个自然人可能只是 C，也可能升级为 B；B 有审核、等级、经营资料、状态和结算属性，直接塞进 User 会违反单一职责。

代价：查询需要 join。缓解方式是增加必要索引和 B 工作台聚合接口。

### ADR-003：佣金使用台账模型

状态：Proposed。

决策：佣金不只存在订单快照字段，而是进入 CommissionLedger。

原因：台账天然支持冻结、调账、驳回、结算、审计和对账。

代价：初期实现更重。缓解方式是阶段 3 再实现，阶段 1/2 不强行引入。

## 15. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 关系归属规则不清 | 客诉和佣金纠纷 | MVP 明确只支持一层有效归属，后台可审计转移 |
| 邀请刷量 | 虚假 B 业绩 | 限流、设备/IP 识别、异常统计 |
| 佣金规则频繁变化 | 代码复杂 | 先用等级比例配置，复杂规则后续再做规则引擎 |
| 后台调账风险 | 财务损失 | 双人审批可作为 P2，MVP 至少保留审计日志 |
| User 字段继续膨胀 | 长期维护困难 | 新业务字段进入 Partner/Profile/Relation 专表 |

## 16. 评审问题

- B 的定义是否只有“推广者/团长”，还是包含门店、服务商、品牌主？
- 是否允许一个 C 同时归属多个 B？推荐 MVP 不允许。
- 是否需要多级分佣？推荐 MVP 不做，先做一级归属。
- 是否已有明确商品/服务订单？如果没有，佣金阶段先做手工/模拟业务单据。
- B 入驻是否需要实名、资质、合同或保证金？这会影响 Partner 审核资料模型。
- 结算是否需要自动打款？推荐先后台标记结算，后续再接支付通道。

## 17. 文档与现有资料同步建议

- 更新 `docs/ARCHITECTURE.md`：补充 monorepo、后台管理、S2B2C 模块。
- 更新 `docs/API.md`：补充 Partner、Relation、Commission、Settlement 接口。
- 更新 `docs/DATABASE.md`：修正 `active_users` 视图字段，并加入 S2B2C 新表。
- 更新 `docs/SECURITY.md`：补充佣金、调账、结算、邀请风控。
- 新增 `docs/S2B2C.md`：作为产品和技术共同评审的主文档。
