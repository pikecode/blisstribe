# BlissTribe 下一阶段规划与实施方案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 明确 BlissTribe 从当前 MVP 可验收到后续可运营、可发布、可增长的阶段路线。

**Architecture:** 继续采用现有 Monorepo 架构，保持 `apps/api`、`apps/admin`、`apps/miniapp`、`packages/shared` 的职责边界。下一阶段优先完善数据闭环、运营后台、推荐效果和发布标准，不引入复杂微服务或独立推荐引擎。

**Tech Stack:** NestJS、Prisma、PostgreSQL、Redis、Vue 3、Element Plus、uni-app、Docker Compose、阿里云 ACR。

---

## 1. 当前状态判断

当前项目已经完成 MVP 主链路：

```text
后台维护标签、评估、产品、推荐规则
  ↓
小程序用户登录、完善资料、完成评估
  ↓
系统按标签和规则推荐产品
  ↓
用户提交咨询线索
  ↓
后台查看线索并跟进
```

已具备本地验收和 Docker 部署基础，但还没有形成完整运营闭环。当前最重要的问题不是继续堆功能，而是让“推荐是否有效、产品是否转化、线索是否跟进、发布是否稳定”变得可观测、可复盘。

同时，产品供给需要从“服务产品”扩展为统一产品模型，兼容以下类型：

| 产品类型 | 示例 | 当前转化方式 | 后续扩展 |
| --- | --- | --- | --- |
| 服务产品 | 咨询、评估、课程、到店服务 | 提交咨询线索 | 预约、服务记录、服务评价 |
| 实物产品 | 营养品、设备、套装、周边 | 咨询购买或留资 | SKU、库存、订单、物流、售后 |
| 组合方案 | 服务 + 实物套装 | 咨询方案 | 套餐、履约拆分、结算 |

当前阶段不要拆成多套产品表。推荐继续以 `Product` 作为统一供给模型，通过 `productType` 区分服务、实物和组合方案，再用少量类型扩展字段支撑不同展示。

同时需要区分“推荐产品形式”。它不是产品类型，而是产品被推荐给用户的入口和呈现方式。例如模块精选推荐、评估结果推荐、个人画像推荐、顾问推荐。后续数据统计和线索转化都应该同时记录产品类型和推荐产品形式。

## 2. 核心原则

### 2.1 KISS：先做可运营闭环，不做复杂平台化

下一阶段不要马上做复杂订单、佣金、AI 推荐、自动化营销。先补齐产品类型、数据记录、转化漏斗、后台看板和发布流程。

### 2.2 YAGNI：暂缓没有验证的重功能

以下能力先规划，不进入下一阶段实现：

- 多租户 SaaS 化。
- Kubernetes 集群部署。
- 自动训练推荐模型。
- 完整订单、支付、退款、佣金结算。
- 完整 SKU、库存、物流、售后系统。
- 复杂 CRM 自动化营销。

### 2.3 SOLID：继续保持模块职责清晰

- `Product`：产品和服务供给。
- `ProductType`：产品履约类型，区分服务、实物和组合方案。
- `Tag`：推荐和画像的统一语言。
- `Assessment`：用户当前需求采集。
- `Recommendation`：推荐计算和展示结果。
- `Lead`：咨询转化和跟进。
- `Analytics`：曝光、点击、提交、转化等行为数据。
- `Deployment`：构建、发布、回滚、健康检查。

### 2.4 DRY：后台和小程序共享同一业务口径

标签、模块、产品、评估、推荐规则必须后台维护，小程序只消费。不要在小程序继续写静态业务配置。

## 3. 方案选择

### 方案 A：继续补页面和体验

适合短期演示，能快速改善视觉和操作体验。

优点：

- 见效快。
- 风险低。
- 适合本地验收。

缺点：

- 无法回答产品有没有效果。
- 无法判断推荐是否准确。
- 后续运营仍依赖人工感受。

### 方案 B：优先补数据闭环和运营后台

适合进入真实运营前的阶段，是推荐方案。

优点：

- 能沉淀曝光、点击、评估、线索、跟进数据。
- 后台可以看到产品和推荐效果。
- 后续规则优化、B 端运营、自动推荐都有数据基础。

缺点：

- 需要同时改 API、小程序、后台。
- 验收不只看页面，还要看数据是否记录正确。

### 方案 C：先完善部署、监控和发布流程

适合马上准备外部测试或生产发布。

优点：

- 发布风险下降。
- 回滚、备份、健康检查更清楚。

缺点：

- 对业务体验提升不直接。
- 如果业务闭环还没稳定，过早自动化价值有限。

推荐顺序：

```text
方案 B 数据闭环
  ↓
方案 C 发布稳定性
  ↓
方案 A 局部体验持续优化
```

## 4. 下一阶段总路线

| 阶段 | 名称 | 核心目标 | 优先级 | 建议周期 |
| --- | --- | --- | --- | --- |
| 阶段 0 | 产品类型基础 | 支持服务产品、实物产品、组合方案的统一维护和展示 | P0 | 2-3 天 |
| 阶段 1 | 推荐与线索数据闭环 | 记录推荐曝光、点击、线索、跟进结果 | P0 | 1-2 周 |
| 阶段 2 | 运营后台效率提升 | 让运营能看懂不同产品类型的推荐、线索和转化表现 | P0 | 1 周 |
| 阶段 3 | 发布与生产稳定性 | 标准化 Docker/ACR 发布、迁移、回滚 | P0 | 3-5 天 |
| 阶段 4 | B 端服务伙伴工作台 | 让服务伙伴管理自己的客户和线索 | P1 | 2-3 周 |
| 阶段 5 | 交易与结算闭环 | 订单、支付、佣金、结算；实物商品再扩展库存和物流 | P2 | 待验证后启动 |
| 阶段 6 | 智能推荐升级 | 基于行为和转化反馈优化推荐 | P2 | 数据积累后启动 |

## 5. 阶段 0：产品类型基础

### 5.1 目标

在不推翻现有产品推荐体系的前提下，让后台和小程序明确区分：

```text
服务产品
实物产品
组合方案
```

第一版只要求能维护、展示、筛选和统计，不做完整交易履约。

### 5.2 数据模型建议

在 `Product` 增加 `productType` 字段：

```text
service  服务产品
physical 实物产品
package  组合方案
```

公共字段继续复用：

```text
moduleId
title
subtitle
coverUrl
priceText
summary
detail
targetUserText
painPointText
tags / tagIds
primaryTagIds / secondaryTagIds / excludeTagIds
priority
status
sortOrder
```

类型差异字段先用少量文案字段承接：

| 字段 | 适用类型 | 说明 |
| --- | --- | --- |
| serviceMode | 服务产品、组合方案 | `online`、`offline`、`mixed` |
| serviceDuration | 服务产品、组合方案 | 服务时长或周期文案 |
| appointmentRequired | 服务产品、组合方案 | 是否需要预约 |
| specText | 实物产品、组合方案 | 规格说明 |
| deliveryText | 实物产品、组合方案 | 配送说明 |
| afterSaleText | 实物产品、组合方案 | 售后说明 |
| stockStatus | 实物产品、组合方案 | `available`、`limited`、`sold_out` |

当前不新增 SKU 表。等真实购买链路明确后，再拆：

```text
ProductSku
Inventory
Order
OrderItem
Shipment
Refund
```

### 5.3 后台改造

产品管理新增：

- 产品类型筛选。
- 产品类型字段。
- 服务产品字段区：服务方式、服务周期、是否预约、服务流程。
- 实物产品字段区：规格说明、配送说明、库存状态、售后说明。
- 组合方案字段区：同时展示服务字段和实物字段。

维护规则：

- 推荐标签、强相关标签、弱相关标签、排除标签不按类型拆分。
- 产品上下架、排序、推荐规则继续复用现有机制。
- 实物产品第一版按钮仍建议用 `咨询购买`，不要直接承诺在线支付。

### 5.4 小程序改造

产品列表：

- 支持展示产品类型标识。
- 可选增加 `全部 / 服务 / 实物 / 组合` 筛选。

产品详情：

- 服务产品展示 `服务流程`、`服务方式`、`服务周期`、`是否预约`。
- 实物产品展示 `规格说明`、`配送说明`、`售后说明`、`库存状态`。
- 组合方案展示服务和实物两个区块。
- 主按钮根据类型展示：

| 类型 | 按钮文案 |
| --- | --- |
| 服务产品 | 我想了解 |
| 实物产品 | 咨询购买 |
| 组合方案 | 咨询方案 |

### 5.5 对推荐系统的影响

推荐算法不需要重写。产品类型只是过滤、展示和分析维度：

```text
推荐分数 =
标签匹配分
+ 产品优先级
+ 推荐规则加分
```

新增类型后，推荐结果可以支持：

- 不限类型推荐。
- 只看服务产品。
- 只看实物产品。
- 不同类型分别统计曝光、点击、线索率。

推荐产品形式需要单独记录，用于判断不同推荐入口的效果：

| 推荐产品形式 | 含义 | 近期是否实现 |
| --- | --- | --- |
| module_featured | 模块精选推荐 | 是 |
| assessment_result | 评估结果推荐 | 是 |
| profile_suggestion | 个人画像推荐 | 是 |
| consultant_recommendation | 顾问推荐 | 否，放到 B 端工作台阶段 |
| campaign_recommendation | 活动推荐 | 否，放到活动运营阶段 |
| bundle_solution | 方案包推荐 | 否，放到交易与方案阶段 |

字段边界建议：

```text
productType：产品是什么，例如 service、physical、package
recommendationForm：这次以什么推荐形式出现，例如 assessment_result
sourceScene：用户从哪个页面或动作进入，例如 home、assessment_done、profile_tags
```

这样可以回答：

```text
哪种产品类型更容易产生线索？
哪种推荐形式更容易产生点击？
同一种产品在不同推荐形式下表现是否不同？
```

### 5.6 验收标准

- 后台新增产品时必须选择产品类型。
- 服务产品、实物产品、组合方案能保存并正常编辑。
- 小程序产品列表能看到类型标识。
- 小程序详情页按类型展示对应字段。
- 推荐结果仍能按标签和规则正常返回。
- 推荐事件能记录推荐产品形式。
- 不需要订单、库存、物流即可完成咨询转化。

## 6. 阶段 1：推荐与线索数据闭环

### 6.1 目标

回答 4 个问题：

1. 哪些产品被推荐给了用户？
2. 用户点了哪些产品？
3. 哪些评估结果带来了咨询？
4. 哪些线索最终被联系、有效、转化或关闭？

### 6.2 建议新增数据模型

新增 `RecommendationEvent` 或 `ProductEvent` 表，先用一个通用事件表，避免过早拆太多表。

建议字段：

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| userId | 用户 ID，可为空 |
| anonymousId | 未登录用户本地标识 |
| moduleCode | 产品模块 |
| productType | 产品类型快照 |
| recommendationForm | 推荐产品形式快照 |
| productId | 产品 ID，可为空 |
| eventType | `impression`、`click`、`lead_submit`、`assessment_submit` |
| sourceScene | 首页、产品列表、详情页、评估结果页 |
| tags | 当时参与推荐的标签名称快照 |
| tagIds | 当时参与推荐的标签 ID 快照 |
| score | 推荐分数快照 |
| reason | 推荐理由快照 |
| metadata | 扩展信息 |
| createdAt | 创建时间 |

### 6.3 API 设计

新增 C 端事件上报接口：

```text
POST /api/v1/products/events
```

请求示例：

```json
{
  "eventType": "click",
  "moduleCode": "health",
  "productType": "service",
  "recommendationForm": "assessment_result",
  "productId": 12,
  "sourceScene": "miniapp_home_recommend",
  "tagIds": [1, 2, 3],
  "tags": ["睡眠改善", "线上咨询"],
  "score": 85,
  "reason": "匹配你的睡眠改善需求"
}
```

### 6.4 小程序改造

需要记录：

- 首页推荐产品曝光。
- 首页推荐产品点击。
- 产品列表曝光和点击。
- 产品类型筛选点击。
- 推荐产品形式，例如模块精选、评估结果、个人画像推荐。
- 评估提交。
- 产品详情页提交线索。

注意事项：

- 未登录也要允许记录匿名事件。
- 用户登录后可以将本地匿名事件和用户 ID 关联，第一版可以先不做合并。
- 事件上报失败不能阻断用户主流程。

### 6.5 后台改造

先新增“产品效果”或“推荐效果”视图，展示：

| 指标 | 含义 |
| --- | --- |
| 推荐曝光 | 产品被展示次数 |
| 点击次数 | 用户点击产品次数 |
| 点击率 | 点击 / 曝光 |
| 线索数 | 提交咨询次数 |
| 线索率 | 线索 / 点击 |
| 有效线索数 | 后台标记有效的线索 |
| 转化数 | 后台标记转化的线索 |

维度筛选：

- 产品模块。
- 产品类型。
- 时间范围。
- 标签。

### 6.6 验收标准

- 小程序进入首页后，后台能看到推荐曝光事件。
- 点击产品后，后台能看到点击事件。
- 提交评估后，后台能看到评估提交事件。
- 提交咨询后，后台线索数和事件数据能对应。
- 上报接口失败时，小程序不报错、不阻断页面跳转。

## 7. 阶段 2：运营后台效率提升

### 7.1 目标

让后台不只是维护数据，还能支持日常运营判断：

```text
哪些产品要重点推？
服务产品和实物产品哪个线索率更高？
哪些标签命中高？
哪些评估带来的线索多？
哪些线索逾期未跟进？
```

### 7.2 建议改造页面

| 页面 | 优化方向 |
| --- | --- |
| 数据看板 | 增加产品曝光、点击、线索、转化漏斗 |
| 产品管理 | 增加产品类型、产品效果列或详情抽屉 |
| 推荐规则 | 展示规则命中次数和带来的线索数 |
| 咨询线索 | 增加今日待跟进、逾期、负责人筛选 |
| 标签字典 | 展示标签被产品/评估/规则使用次数 |

### 7.3 表格组件标准化

当前已完成全局表格样式统一。下一步如果表格继续复杂，建议抽组件：

```text
apps/admin/src/components/common/AdminPageCard.vue
apps/admin/src/components/common/AdminTableToolbar.vue
apps/admin/src/components/common/AdminTableActions.vue
apps/admin/src/components/common/AdminStatusTag.vue
```

第一版不建议立即抽大型 `DataTable`。原因是各页面字段和操作差异较大，过早抽象会增加维护成本。

### 7.4 验收标准

- 运营能在后台看出产品从曝光到线索的漏斗。
- 线索页能快速筛出今日待跟进和逾期线索。
- 产品页能判断一个产品是否值得继续推荐。
- 产品页能按服务、实物、组合筛选和分析。
- 推荐规则页能看到规则是否真的命中。

## 8. 阶段 3：发布与生产稳定性

### 8.1 目标

把当前 Docker/ACR 手动发布流程变成标准、可复现、可回滚的流程。

### 8.2 推荐流程

```text
本地开发
  ↓
本地 type-check / build
  ↓
本地构建 API/Admin 镜像
  ↓
push 到阿里云 ACR
  ↓
服务器 docker compose pull
  ↓
服务器执行数据库 migration
  ↓
服务器 docker compose up -d
  ↓
健康检查
```

### 8.3 需要补充

- `scripts/release/build-and-push.sh`
- `scripts/release/deploy-prod.sh`
- `scripts/release/health-check.sh`
- 服务器 `.env.prod` 标准模板。
- 数据库迁移前备份脚本。
- 回滚说明：镜像 tag、数据库迁移边界、静态资源回滚。

### 8.4 验收标准

- 一个命令能完成本地构建并推送镜像。
- 一个命令能在服务器拉取并更新服务。
- 发布后自动检查 API 健康接口和 Admin 访问。
- 保留最近至少 3 个镜像版本用于回滚。
- 数据库 migration 前有备份或明确跳过确认。

## 9. 阶段 4：B 端服务伙伴工作台

### 9.1 目标

让服务伙伴不只作为线索归属对象，而是能管理自己的客户、邀请和线索。

### 9.2 核心功能

- B 端查看自己的客户列表。
- B 端查看自己归属的咨询线索。
- B 端记录跟进状态和备注。
- B 端生成或查看自己的推广链接/邀请码。
- B 端查看可推广产品类型：服务、实物、组合。
- 平台后台查看 B 端跟进质量。

### 9.3 权限边界

```text
平台管理员：查看全量用户、产品、线索、B 端数据
B 服务伙伴：只查看自己归属的客户和线索
C 用户：只查看自己的评估、推荐、咨询记录
```

第一版建议仍放在小程序或轻量 H5 工作台，不建议立刻做独立复杂后台。

### 9.4 验收标准

- B 用户只能看到自己归属的客户和线索。
- B 用户能更新线索跟进状态。
- 平台后台能看到 B 的跟进记录。
- 邀请来源和线索归属关系一致。

## 10. 阶段 5：交易与结算闭环

此阶段暂不建议立即启动。启动前需要先确认：

- 是否存在真实付费产品。
- 是否需要线上支付，还是线下转化。
- B 端是否参与佣金分成。
- 退款、售后、发票、税务怎么处理。

推荐先做“线索转化状态”，不要马上做完整订单。

实物产品相关能力建议在此阶段再启动：

- SKU。
- 库存。
- 订单。
- 支付。
- 物流。
- 售后。

服务产品相关能力建议在此阶段扩展：

- 预约。
- 服务记录。
- 服务完成确认。
- 评价。

## 11. 阶段 6：智能推荐升级

智能推荐必须建立在数据闭环之后。没有曝光、点击、线索、转化数据，算法没有可靠反馈。

可扩展方向：

- 基于点击率和线索率调整产品排序。
- 基于用户评估答案做标签权重优化。
- 基于 B 端转化质量调整线索分发。
- 基于规则命中效果提示运营优化规则。

第一版不建议接入黑盒 AI 自动推荐。更合适的方式是：

```text
标签规则推荐
  ↓
数据反馈
  ↓
运营可解释调权
  ↓
半自动推荐建议
```

## 12. 推荐的近期实施清单

### Task 1: 新增产品类型基础字段

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_product_type_fields/migration.sql`
- Modify: `packages/shared/src/types/product.ts`
- Modify: `apps/api/src/product/dto.ts`
- Modify: `apps/api/src/product/product.service.ts`
- Modify: `apps/admin/src/api/product.ts`
- Modify: `apps/miniapp/src/api/modules/product.ts`

**内容:**

- `Product` 增加 `productType`，默认 `service`。
- 增加服务/实物类型文案字段。
- API 创建、编辑、列表、详情返回产品类型。
- 兼容历史产品，全部默认服务产品。

**验收:**

- 旧产品不需要手动迁移即可正常展示。
- 新建产品必须选择类型。
- 推荐接口返回结果结构兼容小程序。

### Task 2: 后台产品管理接入产品类型

**Files:**

- Modify: `apps/admin/src/views/product/index.vue`

**内容:**

- 产品列表增加产品类型列和筛选。
- 产品表单增加类型选择。
- 按类型展示服务字段、实物字段、组合字段。
- 实物产品不要求 SKU 和库存数量，只维护文案和库存状态。

**验收:**

- 服务产品、实物产品、组合方案都能创建和编辑。
- 切换类型时字段显示符合预期。
- 表格交互符合当前后台统一表格规范。

### Task 3: 小程序产品展示接入产品类型

**Files:**

- Modify: `apps/miniapp/src/pages/products/index.vue`
- Modify: `apps/miniapp/src/pages/products/detail.vue`
- Modify: `apps/miniapp/src/components/business/ProductRecommendList.vue`

**内容:**

- 产品卡片展示产品类型。
- 产品详情按类型展示差异字段。
- 主按钮根据类型显示 `我想了解`、`咨询购买`、`咨询方案`。

**验收:**

- 不同类型产品在小程序展示清晰。
- 线索提交仍使用现有 `ProductLead`。
- 不引入订单和支付。

### Task 4: 新增推荐事件模型

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_recommendation_events/migration.sql`

**内容:**

- 新增事件表。
- 建立 `userId`、`productId`、`eventType`、`recommendationForm`、`createdAt` 索引。

**验收:**

- `pnpm --filter @blisstribe/api prisma:migrate` 可执行。
- Prisma Client 生成成功。

### Task 5: 新增事件上报 API

**Files:**

- Modify: `apps/api/src/product/product.controller.ts`
- Modify: `apps/api/src/product/product.service.ts`
- Modify: `apps/api/src/product/dto.ts`
- Modify: `apps/miniapp/src/api/modules/product.ts`

**内容:**

- 新增事件上报 DTO。
- 支持登录用户和匿名用户。
- 记录产品类型快照。
- 记录推荐产品形式快照。
- 上报失败不影响推荐主流程。

**验收:**

- `POST /api/v1/products/events` 返回成功。
- 参数非法时返回明确错误。

### Task 6: 小程序接入事件上报

**Files:**

- Modify: `apps/miniapp/src/pages/index/index.vue`
- Modify: `apps/miniapp/src/pages/products/index.vue`
- Modify: `apps/miniapp/src/pages/products/detail.vue`
- Modify: `apps/miniapp/src/pages/products/assessment.vue`
- Optional: `apps/miniapp/src/utils/analytics.ts`

**内容:**

- 曝光、点击、评估提交、线索提交上报。
- 产品类型筛选行为上报。
- 推荐产品形式上报，例如模块精选、评估结果、个人画像推荐。
- 建议新增 `analytics.ts` 封装，避免页面重复写 try/catch。

**验收:**

- 上报失败不影响跳转。
- 后台数据库可查到事件记录。

### Task 7: 后台新增推荐效果视图

**Files:**

- Modify: `apps/admin/src/router/routes.ts`
- Modify: `apps/admin/src/layout/index.vue`
- Create: `apps/admin/src/views/product/analytics.vue`
- Modify: `apps/admin/src/api/product.ts`
- Modify: `apps/api/src/product/product.controller.ts`
- Modify: `apps/api/src/product/product.service.ts`

**内容:**

- 新增菜单 `推荐效果`，放在 `产品与推荐` 分组。
- 展示产品曝光、点击、线索、点击率、线索率。
- 支持按产品类型筛选和分组。
- 支持按推荐产品形式筛选和分组。

**验收:**

- 后台能按模块、时间范围筛选。
- 表格样式符合当前后台表格规范。

### Task 8: 线索跟进效率优化

**Files:**

- Modify: `apps/admin/src/views/product/leads.vue`
- Modify: `apps/api/src/product/product.controller.ts`
- Modify: `apps/api/src/product/product.service.ts`

**内容:**

- 增加今日待跟进、已逾期、后续跟进筛选。
- 增加状态汇总卡片。
- 后台可快速查看未处理线索。

**验收:**

- 今日待跟进和逾期筛选准确。
- 修改跟进时间后列表刷新正确。

### Task 9: 发布脚本标准化

**Files:**

- Create: `scripts/release/build-and-push.sh`
- Create: `scripts/release/deploy-prod.sh`
- Create: `scripts/release/health-check.sh`
- Modify: `docs/DEPLOYMENT.md`

**内容:**

- 固化本地构建、push ACR、服务器 pull/up 流程。
- 输出镜像 tag。
- 发布后健康检查。

**验收:**

- 本地能一键构建并推送 API/Admin 镜像。
- 服务器能按指定 tag 更新。
- 发布失败时能看到明确错误。

## 13. 风险与处理

| 风险 | 表现 | 处理 |
| --- | --- | --- |
| 产品类型扩展过重 | 一开始就做 SKU、库存、订单 | 阶段 0 只做类型、展示和咨询，不做交易履约 |
| 服务和实物字段混乱 | 后台表单难维护 | 公共字段放 `Product`，差异字段按类型分区展示 |
| 数据表过早复杂 | 事件表字段越来越多 | 第一版用 `metadata` 承接扩展 |
| 上报影响用户体验 | 网络失败导致页面卡顿 | 上报异步执行，失败静默 |
| 推荐指标不准 | 曝光重复计算 | 第一版可接受粗粒度，后续加去重 |
| 后台页面变复杂 | 运营看不懂 | 指标先少后多，优先漏斗指标 |
| migration 风险 | 生产数据库失败 | 发布前备份，发布脚本明确迁移步骤 |
| 权限越界 | B 端看到不该看的线索 | B 端工作台前先做权限边界测试 |

## 14. Review 重点

请重点 review 以下决策：

1. 是否接受以统一 `Product` 模型承载服务产品、实物产品和组合方案。
2. 是否接受阶段 0 只做产品类型、展示和咨询转化，不做 SKU、库存、订单、支付。
3. 下一阶段是否在产品类型基础之后，优先做“推荐与线索数据闭环”。
4. 是否接受先用通用事件表，不拆多个细表。
5. 后台是否需要新增独立 `推荐效果` 菜单。
6. 发布脚本标准化是否和业务数据闭环并行推进。
7. B 端工作台是否放到 P1，而不是马上启动。

## 15. 推进评估与推荐结论

加入实物产品和服务产品区分后，后续推进顺序需要前移一个“产品类型基础”阶段。原因是产品类型会影响后台维护、小程序详情展示、推荐效果统计和后续交易路线。如果先做推荐事件，再补产品类型，事件表和统计页面会很快返工。

推荐实施顺序调整为：


```text
1. 产品类型基础字段
2. 后台产品管理接入产品类型
3. 小程序产品展示接入产品类型
4. 推荐事件模型和上报 API
5. 小程序曝光/点击/评估/线索上报
6. 后台推荐效果页面
7. 线索跟进效率优化
8. Docker/ACR 发布脚本标准化
```

这个顺序最符合当前项目状态：业务链路已经跑通，但产品供给类型开始变化。先把产品类型作为统一模型补齐，再做数据闭环，能避免后续统计和推荐分析返工；同时不进入完整电商系统，继续保持当前“评估、推荐、咨询、跟进”的轻闭环。

阶段 0 完成后，系统可以同时支持：

```text
服务产品：评估推荐 -> 咨询/预约意向 -> 人工跟进
实物产品：评估推荐 -> 咨询购买意向 -> 人工跟进
组合方案：评估推荐 -> 咨询方案 -> 人工跟进
```

订单、支付、库存、物流仍放到阶段 5，在真实产品和真实转化验证后再启动。
