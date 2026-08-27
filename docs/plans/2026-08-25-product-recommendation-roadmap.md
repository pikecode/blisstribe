# 产品精准推荐阶段路线图

## 1. 文档目的

本文档把 BlissTribe 产品精准推荐体系拆成可持续演进的阶段方案，覆盖从 MVP 产品展示、用户画像、B 顾问推荐，到推荐规则、运营活动、订单佣金和智能推荐的完整路线。

关联文档：

- `docs/plans/2026-08-25-product-recommendation-design.md`
- `docs/plans/2026-08-20-s2b2c-s-b-product-ops-design.md`
- `docs/plans/2026-08-19-s2b2c-platform-upgraded-model-design.md`

核心定位：

```text
后台维护全量产品库
  ↓
系统理解用户需求
  ↓
精准展示合适产品
  ↓
C 咨询或报名
  ↓
B 或平台跟进
  ↓
后续沉淀交易、佣金和复购
```

## 2. 总体阶段

推荐按 6 个阶段推进：

| 阶段 | 名称 | 核心目标 | 推荐优先级 |
|------|------|----------|------------|
| 阶段 1 | 产品库 + 推荐展示 + 线索 | 让 C 看到推荐产品并提交咨询 | P0 |
| 阶段 2 | 轻问卷 + 用户标签 | 让系统知道 C 需要什么 | P0 |
| 阶段 3 | B 顾问推荐 + 线索归属 | 让 B 能推广产品并跟进客户 | P1 |
| 阶段 4 | 推荐规则后台化 + 用户分群 | 让运营能控制推荐策略 | P1 |
| 阶段 5 | 活动运营 + 数据看板 | 让平台能做增长和转化分析 | P2 |
| 阶段 6 | 订单 + 佣金 + 结算 + 智能推荐 | 形成交易和收益闭环 | P3 |

当前建议只启动阶段 1 和阶段 2 的设计实现，不要提前实现阶段 5/6。

## 3. 阶段 1：产品库 + 推荐展示 + 线索

### 3.1 目标

先跑通最小产品转化闭环：

```text
后台创建产品
  ↓
产品上架
  ↓
C 端看到推荐
  ↓
C 查看详情
  ↓
C 提交咨询/报名
  ↓
后台看到线索
```

本阶段不做复杂推荐算法。没有用户标签时，推荐按产品状态、模块、运营优先级和排序展示。

### 3.2 用户价值

C 端不需要面对全量产品货架，而是先看到平台精选或默认推荐。

后台能验证：

- 哪些产品有人看。
- 哪些产品有人咨询。
- 哪些产品适合进入后续重点运营。

### 3.3 后台能力

新增后台页面：

```text
产品模块管理
产品列表
产品创建/编辑
产品上架/下架
产品线索列表
```

产品编辑字段：

| 字段 | 说明 |
|------|------|
| module | 产品模块 |
| title | 产品标题 |
| subtitle | 副标题 |
| coverUrl | 主图 |
| priceText | 价格文案 |
| summary | 简介 |
| detail | 详情 |
| tags | 标签 |
| priority | 推荐权重 |
| status | 草稿/上架/下架 |
| sortOrder | 排序 |

线索字段：

| 字段 | 说明 |
|------|------|
| product | 咨询产品 |
| user | C 用户 |
| partner | 来源 B，可为空 |
| sourceScene | 来源场景 |
| message | 用户留言 |
| status | 跟进状态 |
| followUpNote | 跟进备注 |

### 3.4 C 端能力

新增页面：

```text
pages/products/index
pages/products/detail
```

首页展示：

```text
为你推荐
健康精选
全部产品入口
```

详情页展示：

```text
产品主图
标题/副标题
适合人群
解决问题
服务流程
详情内容
咨询/报名按钮
```

### 3.5 B 端能力

本阶段 B 端不做独立产品工作台。只要 C 端链接支持 `inviteCode` 参数即可。

示例：

```text
/pages/products/detail?id=123&inviteCode=ABC123
```

如果 C 从该链接咨询，`ProductLead` 记录来源 B。

### 3.6 数据模型

MVP 表：

```text
ProductModule
Product
ProductLead
```

Product 推荐字段：

```text
id
moduleId
productType
title
subtitle
coverUrl
priceText
summary
detail
tags
priority
status
sortOrder
publishedAt
createdAt
updatedAt
deletedAt
```

`productType` 用于区分产品形式：

| 类型 | 说明 | 阶段 |
|------|------|------|
| service | 服务产品 | 近期实现 |
| physical | 实物产品 | 近期实现 |
| package | 组合方案 | 近期实现 |
| event | 活动产品 | 阶段 5 再扩展 |
| content | 内容产品 | 后续按业务验证扩展 |

`recommendationForm` 用于区分推荐产品形式，也就是产品被推荐给用户的入口和呈现方式：

| 类型 | 说明 | 阶段 |
|------|------|------|
| module_featured | 模块精选推荐 | 近期实现 |
| assessment_result | 评估结果推荐 | 近期实现 |
| profile_suggestion | 个人画像推荐 | 近期实现 |
| consultant_recommendation | 顾问推荐 | 阶段 3 |
| campaign_recommendation | 活动推荐 | 阶段 5 |
| bundle_solution | 方案包推荐 | 阶段 5 |

字段边界：

```text
productType = 产品是什么
recommendationForm = 产品怎么被推荐出来
sourceScene = 用户从哪个页面或动作进入
```

ProductLead 推荐字段：

```text
id
productId
userId
partnerId
sourceInviteCode
sourceScene
needTags
message
status
followUpNote
createdAt
updatedAt
```

### 3.7 API

C 端：

```text
GET /products/recommended
GET /products
GET /products/:id
POST /products/:id/leads
```

后台：

```text
GET /admin/product-modules
POST /admin/product-modules
PUT /admin/product-modules/:id

GET /admin/products
POST /admin/products
PUT /admin/products/:id
POST /admin/products/:id/publish
POST /admin/products/:id/unpublish

GET /admin/product-leads
PUT /admin/product-leads/:id/follow-up
```

### 3.8 验收标准

- 后台能创建健康模块。
- 后台能创建并上架健康产品。
- C 端能看到推荐产品。
- C 端能打开产品详情。
- C 能提交咨询线索。
- 后台能看到该线索。
- 产品下架后 C 端不可见。

### 3.9 风险

| 风险 | 应对 |
|------|------|
| 第一版推荐不够精准 | 用运营优先级和模块精选兜底 |
| 产品详情内容质量影响转化 | 后台字段先支持图文详情和服务流程 |
| 线索没人跟进 | 后台线索必须有状态和备注 |

## 4. 阶段 2：轻问卷 + 用户标签

### 4.1 目标

让系统通过低成本问答理解用户需求。

```text
C 进入小程序
  ↓
选择关注点
  ↓
生成用户标签
  ↓
推荐结果变化
```

### 4.2 用户价值

C 不需要在大量产品中自己判断，先表达需求，再看到更相关的推荐。

示例问题：

```text
你最近最关注什么？
A 睡眠
B 体重
C 情绪压力
D 皮肤状态
E 家庭健康
```

### 4.3 后台能力

第一版后台只维护固定问卷配置，可以先写在代码或 seed 中。

后续再做：

```text
问卷题目管理
选项与标签映射
问卷启停
问卷转化统计
```

### 4.4 C 端能力

新增：

```text
pages/profile/needs
```

或者在首页以弹层/模块形式展示轻问卷。

交互原则：

- 一次只问 1-3 个问题。
- 不强制用户完成。
- 用户可以修改关注点。
- 展示推荐原因。

### 4.5 数据模型

阶段 2 推荐表：

```text
UserTag
UserNeed
Questionnaire
QuestionnaireQuestion
QuestionnaireOption
QuestionnaireAnswer
```

MVP 可简化为：

```text
User.tags
User.profile.needs
```

如果希望减少迁移复杂度，第一版可以复用当前 `User.tags String[]`。

### 4.6 API

```text
GET /profile/needs
PUT /profile/needs
GET /products/recommended
```

后续问卷后台化后增加：

```text
GET /questionnaires/current
POST /questionnaires/:id/answers
```

### 4.7 推荐逻辑

阶段 2 推荐分：

```text
score =
  product.priority
+ matchedUserTags * 10
+ matchedNeedTags * 20
+ moduleMatched * 5
```

先保证运营可解释，不追求算法复杂度。

### 4.8 验收标准

- C 选择“睡眠”后，带 `sleep` 标签的产品排序靠前。
- C 修改需求后，推荐结果变化。
- C 能看到推荐原因。
- 后台线索能看到用户需求标签。

### 4.9 风险

| 风险 | 应对 |
|------|------|
| 问卷太长导致流失 | MVP 控制在 1-3 题 |
| 标签体系混乱 | 先维护少量核心标签 |
| 推荐原因不透明 | 前端展示“因为你关注了睡眠” |

## 5. 阶段 3：B 顾问推荐 + 线索归属

### 5.1 目标

让 B 从“邀请人”升级为“顾问式推荐者”。

```text
B 查看可推广产品
  ↓
B 分享产品给 C
  ↓
C 咨询
  ↓
线索归属 B
  ↓
B 工作台跟进
```

### 5.2 用户价值

B 不再只发一个入会邀请码，而是能围绕 C 的需求推荐具体产品或服务。

C 看到：

```text
某顾问推荐给你的健康方案
```

后台看到：

```text
哪个 B 推了哪个产品
产生了多少咨询
```

### 5.3 B 端能力

新增页面：

```text
pages/partner/products
pages/partner/product-detail
pages/partner/product-leads
```

B 可以：

- 查看可推广产品。
- 复制产品分享链接。
- 生成产品海报。
- 查看自己带来的产品线索。
- 标记跟进状态。

### 5.4 后台能力

后台增加：

```text
B 产品权限查看
B 推广效果
B 线索归属
线索转移或重新分配
```

MVP 不让 B 自己配置产品价格和佣金。

### 5.5 数据模型

新增：

```text
ProductPolicy
ProductShare
PartnerProductLeadView
```

ProductPolicy 控制：

```text
productId
partnerType
partnerLevel
regionCode
status
```

ProductShare 记录：

```text
productId
partnerId
userId
inviteCode
scene
createdAt
```

### 5.6 API

B 端：

```text
GET /partner/products
GET /partner/products/:id
GET /partner/products/:id/share
GET /partner/product-leads
PUT /partner/product-leads/:id/follow-up
```

C 端继续使用：

```text
GET /products/:id?inviteCode=ABC123
POST /products/:id/leads
```

### 5.7 验收标准

- B 能看到可推广产品。
- B 生成的产品分享链接包含邀请码。
- C 通过 B 分享进入并提交线索后，线索归属该 B。
- B 端只能看到自己归属的线索。
- 后台能看到全部线索和来源 B。

### 5.8 风险

| 风险 | 应对 |
|------|------|
| B 乱发产品影响体验 | 记录分享行为，后续加频控 |
| B 越权查看线索 | 所有 B 端接口必须校验 PartnerMember |
| 线索归属争议 | ProductLead 同时记录 inviteCode、partnerId、sourceScene |

## 6. 阶段 4：推荐规则后台化 + 用户分群

### 6.1 目标

让运营可以不用改代码就调整推荐策略。

```text
用户分群
  ↓
推荐规则
  ↓
产品权重
  ↓
推荐排序
```

### 6.2 后台能力

新增页面：

```text
标签管理
用户分群
推荐规则
推荐预览
规则发布记录
```

运营可以配置：

- 健康模块优先推荐给健康关注用户。
- 睡眠标签用户优先推荐睡眠改善产品。
- 某地区用户优先推荐本地服务。
- 某等级 B 只能推广指定产品。

### 6.3 数据模型

新增：

```text
Tag
TagGroup
UserTag
ProductTag
UserSegment
RecommendationRule
RecommendationRuleVersion
RecommendationLog
```

RecommendationRule 字段：

```text
name
targetSegment
includeTags
excludeTags
moduleIds
productIds
boostWeight
startAt
endAt
status
version
```

### 6.4 API

后台：

```text
GET /admin/tags
POST /admin/tags
GET /admin/user-segments
POST /admin/user-segments
GET /admin/recommendation-rules
POST /admin/recommendation-rules
PUT /admin/recommendation-rules/:id
POST /admin/recommendation-rules/:id/publish
POST /admin/recommendation-rules/preview
```

C 端：

```text
GET /products/recommended
```

### 6.5 推荐策略

阶段 4 开始支持规则版本。

推荐计算需要记录：

```text
用户 ID
命中的标签
命中的规则
候选产品
最终排序
推荐时间
```

这样后续才能分析“为什么推荐了这个产品”。

### 6.6 验收标准

- 后台能创建标签。
- 后台能创建用户分群。
- 后台能配置推荐规则。
- 推荐预览能看到命中用户和产品。
- 发布规则后，C 端推荐结果变化。
- 推荐日志能追溯命中原因。

### 6.7 风险

| 风险 | 应对 |
|------|------|
| 规则编辑器过复杂 | 第一版只支持固定条件表单 |
| 推荐规则互相冲突 | 引入优先级和版本 |
| 运营误配置 | 发布前提供预览和影响范围 |

## 7. 阶段 5：活动运营 + 数据看板

### 7.1 目标

把产品推荐接入运营增长体系。

```text
Banner
  ↓
Campaign
  ↓
Product
  ↓
Lead
  ↓
Conversion
```

### 7.2 后台能力

新增：

```text
活动管理
活动绑定产品
活动绑定 Banner
活动线索统计
产品转化看板
B 推广看板
```

活动字段：

```text
campaignType
title
targetUserType
productIds
bannerId
startAt
endAt
landingPage
rewardPolicy
status
```

### 7.3 C 端能力

C 端看到：

- 首页活动入口。
- 活动专题页。
- 活动推荐产品。
- 活动报名或咨询。

### 7.4 B 端能力

B 端看到：

- 当前可参与活动。
- 活动推广素材。
- 活动带来的客户和线索。
- 活动转化数据。

### 7.5 数据模型

新增：

```text
Campaign
CampaignProduct
CampaignPartner
CampaignLead
BehaviorEvent
StatsSnapshot
```

BehaviorEvent 记录：

```text
product_viewed
product_shared
lead_created
campaign_viewed
campaign_joined
partner_shared
```

### 7.6 API

后台：

```text
GET /admin/campaigns
POST /admin/campaigns
PUT /admin/campaigns/:id
POST /admin/campaigns/:id/publish
GET /admin/stats/product-conversion
GET /admin/stats/partner-promotion
```

C 端：

```text
GET /campaigns/current
GET /campaigns/:id
```

B 端：

```text
GET /partner/campaigns
GET /partner/campaigns/:id/stats
```

### 7.7 验收标准

- 后台能创建活动并绑定产品。
- Banner 能跳转到活动页。
- 活动页能产生产品线索。
- 后台能按活动查看浏览、咨询、转化。
- B 能看到自己参与活动产生的线索。

### 7.8 风险

| 风险 | 应对 |
|------|------|
| 统计口径不一致 | 先定义事件字典和指标口径 |
| 活动和推荐互相覆盖 | 推荐结果保留 source 字段 |
| 数据量增长 | 事件表先加索引，后续归档 |

## 8. 阶段 6：订单 + 佣金 + 结算 + 智能推荐

### 8.1 目标

在推荐和线索转化被验证后，补齐交易闭环。

```text
C 购买产品
  ↓
订单完成
  ↓
根据 C-B 归属生成佣金
  ↓
后台结算
  ↓
B 查看收益
```

### 8.2 订单能力

新增：

```text
ProductSku
Order
OrderItem
Payment
Refund
```

第一版订单可以先支持手工确认，不急着接支付：

```text
线索转成交
  ↓
后台创建订单
  ↓
后台标记完成
  ↓
生成佣金
```

支付接入放到订单模型稳定之后。

### 8.3 佣金能力

佣金按订单快照生成，不依赖后续关系变更。

Commission 字段：

```text
orderId
orderItemId
partnerId
customerUserId
productId
baseAmount
rate
commissionAmount
status
settledAt
```

### 8.4 结算能力

结算批次：

```text
SettlementBatch
SettlementItem
```

状态：

```text
pending
approved
paid
rejected
```

### 8.5 智能推荐扩展

当行为数据足够后，再考虑智能推荐。

可用信号：

- 用户标签。
- 浏览产品。
- 咨询产品。
- 成交产品。
- B 推荐行为。
- 活动来源。
- 复购周期。

演进方式：

```text
规则推荐
  ↓
规则 + 行为权重
  ↓
离线推荐结果
  ↓
模型推荐
```

不建议一开始接大模型或复杂推荐系统。

### 8.6 验收标准

- 后台能从线索创建订单。
- 订单完成后生成佣金。
- B 能看到待结算收益。
- 后台能创建结算批次。
- 佣金和结算有审计记录。
- 推荐能基于成交行为调整排序。

### 8.7 风险

| 风险 | 应对 |
|------|------|
| 财务口径变更频繁 | 佣金规则版本化 |
| 归属变更影响佣金争议 | 订单创建时快照 partnerId |
| 支付退款复杂 | 先做手工订单和结算 |
| 智能推荐不可解释 | 保留规则推荐和推荐原因 |

## 9. 横向能力规划

### 9.1 权限

后台权限：

```text
product:read
product:create
product:update
product:publish
product:lead:read
product:lead:follow
recommendation:rule:manage
campaign:manage
commission:read
settlement:manage
```

B 端权限：

```text
partner:product:read
partner:product:share
partner:lead:read
partner:lead:follow
partner:commission:read
```

### 9.2 审计

必须审计：

- 产品上架/下架。
- 推荐规则发布。
- 线索状态变更。
- 线索归属调整。
- 订单金额调整。
- 佣金调整。
- 结算打款。

### 9.3 数据指标

阶段性指标：

| 阶段 | 核心指标 |
|------|----------|
| 阶段 1 | 产品浏览、详情点击、线索提交 |
| 阶段 2 | 问卷完成率、标签覆盖率、推荐点击率 |
| 阶段 3 | B 分享次数、B 带来线索数、线索跟进率 |
| 阶段 4 | 规则命中率、推荐转化率、分群效果 |
| 阶段 5 | 活动曝光、活动报名、产品转化 |
| 阶段 6 | 订单金额、佣金金额、结算金额、复购率 |

### 9.4 隐私与安全

原则：

- C 联系方式默认脱敏。
- B 只能看自己有权限的客户和线索。
- 后台查看敏感信息需要权限。
- 推荐标签不要展示敏感推断。
- 医疗健康相关产品要避免承诺疗效。

## 10. 推荐落地顺序

### 10.1 当前最小闭环

建议先做：

```text
阶段 1：产品库 + 推荐展示 + 线索
阶段 2：轻问卷 + 用户标签
```

原因：

- 最快验证用户需求。
- 不依赖支付和订单。
- 能复用已有 B-C 归属能力。
- 后台可以马上开始维护健康产品。

### 10.2 暂缓内容

暂缓：

```text
复杂 SKU
库存
支付
退款
佣金结算
AI 推荐
复杂规则引擎
多级分销
```

这些都等线索转化证明有效后再做。

## 11. 里程碑建议

### M1：产品线索 MVP

目标时间：1 个短迭代。

交付：

- 后台产品管理。
- C 端产品推荐与详情。
- ProductLead。
- 后台线索列表。

### M2：需求画像 MVP

目标时间：1 个短迭代。

交付：

- 轻问卷。
- 用户标签。
- 标签匹配推荐。
- 推荐原因展示。

### M3：B 顾问推广

目标时间：1-2 个短迭代。

交付：

- B 可推广产品。
- B 分享产品。
- B 产品线索。
- 线索归属校验。

### M4：运营规则和活动

目标时间：2 个短迭代。

交付：

- 标签管理。
- 推荐规则。
- 活动管理。
- 看板指标。

### M5：交易收益闭环

目标时间：按业务准备度决定。

交付：

- 订单。
- 佣金。
- 结算。
- 财务审计。

## 12. 后续与 Codex 沟通模板

阶段 1 详细实施计划：

```text
按照 docs/plans/2026-08-25-product-recommendation-roadmap.md 的阶段 1，输出详细实现计划，范围限定为产品库、C 端推荐展示、ProductLead、后台线索查看。
```

阶段 1 开始实现：

```text
按照 docs/plans/2026-08-25-product-recommendation-roadmap.md 的阶段 1 开始实现，先做数据库 migration 和 API，再做后台和小程序页面。
```

阶段 2 详细实施计划：

```text
按照 docs/plans/2026-08-25-product-recommendation-roadmap.md 的阶段 2，输出轻问卷、用户标签和推荐排序的详细实现计划。
```

阶段 3 详细实施计划：

```text
按照 docs/plans/2026-08-25-product-recommendation-roadmap.md 的阶段 3，输出 B 顾问推荐和线索归属的详细实现计划。
```

## 13. 结论

BlissTribe 产品模块不建议按传统商城货架设计。推荐路线是：

```text
先产品库
再用户需求
再精准推荐
再 B 顾问推广
再运营活动
最后进入订单、佣金和结算
```

这样能先验证真实需求和转化，不会过早承担交易系统、财务系统和复杂推荐系统的成本。
