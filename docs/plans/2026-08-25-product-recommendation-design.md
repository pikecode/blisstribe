# 产品精准推荐系统设计方案

## 1. 文档目的

本文档设计 BlissTribe 后续产品模块的经营方式：平台仍然统一维护产品库，但 C 端用户不默认看到全部产品，而是基于用户标签、需求、来源 B、运营规则和产品特色，展示更精准的产品或服务。

本文档是以下规划的补充：

- `docs/plans/2026-08-25-product-recommendation-roadmap.md`
- `docs/plans/2026-08-20-s2b2c-s-b-product-ops-design.md`
- `docs/plans/2026-08-19-s2b2c-platform-upgraded-model-design.md`

核心判断：

```text
产品库不是 C 端货架。
后台维护全量产品，C 端展示个性化推荐。
```

## 2. 背景与问题

传统做法通常是：

```text
后台维护产品
  ↓
全部上架给用户
  ↓
用户自己筛选
```

这种方式的问题：

- 产品越多，用户选择成本越高。
- C 端不知道自己适合什么，容易流失。
- 平台无法突出产品特色和服务逻辑。
- B 端顾问的推荐价值没有体现。
- 后续数据分析只能看到浏览和点击，难以理解真实需求。

BlissTribe 更适合做：

```text
产品库 + 用户画像 + 推荐规则 + B 顾问推荐 + 线索转化
```

用户看到的不是“全部产品”，而是：

```text
适合你的健康方案
根据你的需求推荐
顾问为你推荐
今日重点推荐
```

## 3. 设计原则

### 3.1 KISS：第一版用标签和规则，不上复杂算法

MVP 不做 AI 推荐、实时特征工程和复杂推荐引擎。

第一版采用：

```text
用户标签 ∩ 产品标签
+ 运营权重
+ B 可推广范围
+ 产品状态
```

实现足够简单，运营也能理解。

### 3.2 YAGNI：先做线索转化，不急着做交易

第一阶段不做 SKU、库存、订单、支付、退款、佣金结算。

优先跑通：

```text
用户表达需求
  ↓
系统生成标签
  ↓
推荐产品
  ↓
用户咨询/报名
  ↓
后台或 B 跟进
```

### 3.3 SOLID：拆清模块职责

- Product：产品和服务本身。
- UserProfile：用户画像和标签。
- Recommendation：推荐计算和结果。
- Lead：咨询、报名、留资线索。
- Partner：B 端顾问和客户归属。

### 3.4 DRY：产品只维护一份

不为 C 端、B 端、后台分别维护产品。

统一产品库：

```text
Product
  ↓
C 端推荐展示
B 端可推广产品
后台产品运营管理
```

## 4. 总体方案

推荐采用分层设计：

```text
后台维护层
  ProductModule / Product / Tag / RecommendationRule

画像与需求层
  UserTag / UserNeed / QuestionnaireAnswer / BehaviorEvent

推荐层
  ProductRecommendation / RecommendationLog

转化层
  ProductLead / PartnerCustomerRelation / FollowUp
```

用户路径：

```text
C 进入小程序
  ↓
如果画像不足，展示轻问卷
  ↓
生成或更新用户标签
  ↓
计算推荐产品
  ↓
C 查看产品详情
  ↓
C 咨询/报名/预约
  ↓
如果有来源 B，则线索归属给 B
  ↓
后台和 B 端跟进
```

## 5. 产品模块设计

产品不应只按“商品”建模，而应支持服务、实物、组合方案、活动和内容。当前实现优先落地服务产品、实物产品和组合方案；活动产品、内容产品先保留规划，不进入近期实现。

推荐的产品形式：

| 类型 | 含义 | 示例 | 当前阶段动作 |
|------|------|------|--------------|
| service | 服务产品 | 睡眠咨询、体态评估、到店服务 | 近期实现 |
| physical | 实物产品 | 营养品、设备、护理套装 | 近期实现 |
| package | 组合方案 | 服务 + 实物的 30 天改善方案 | 近期实现 |
| event | 活动产品 | 线下沙龙、体验课、训练营 | 先规划 |
| content | 内容产品 | 课程、音频、资料包 | 先规划 |

这里的“产品形式”描述产品本身是什么，不等同于“推荐产品形式”。推荐产品形式描述用户在哪个场景、以什么方式看到产品。

推荐产品形式建议单独建模为 `recommendationForm` 或在第一版复用 `sourceScene` 枚举。当前更推荐先用枚举，不急着新增复杂编排表。

| 推荐产品形式 | 含义 | 适合场景 | 当前阶段动作 |
|--------------|------|----------|--------------|
| module_featured | 模块精选推荐 | 首页模块、产品模块页 | 近期实现 |
| assessment_result | 评估结果推荐 | 用户完成需求评估后 | 近期实现 |
| profile_suggestion | 个人画像推荐 | 个人页、完善标签后 | 近期实现 |
| consultant_recommendation | 顾问推荐 | B 端或后台人工推荐 | 后续实现 |
| campaign_recommendation | 活动推荐 | 节日、专题、限时运营 | 后续实现 |
| bundle_solution | 方案包推荐 | 多个产品组成一套解决方案 | 后续实现 |

推荐产品形式和产品形式是正交关系：

```text
productType = 产品是什么
recommendationForm = 产品以什么推荐形式出现
sourceScene = 用户从哪个页面或动作进入
```

例如，同一个服务产品可以出现在模块精选、评估结果和顾问推荐中；同一个实物产品也可以根据用户标签出现在评估结果或专题活动中。

### 5.1 ProductModule

产品模块用于表达大的业务领域。

示例：

| 模块 | 说明 |
|------|------|
| health | 健康 |
| beauty | 美容 |
| emotion | 情绪 |
| family | 家庭 |
| parent_child | 亲子 |

第一版可以先从 `health` 开始。

### 5.2 Product

产品可以是：

- 单个服务。
- 一个实物商品。
- 一套方案。
- 一次活动。
- 一个内容交付。
- 一个咨询入口。

核心字段建议：

| 字段 | 说明 |
|------|------|
| moduleId | 所属模块 |
| productType | 产品形式：服务、实物、组合、活动、内容 |
| title | 产品名称 |
| subtitle | 简短卖点 |
| coverUrl | 主图 |
| priceText | 价格展示文案 |
| summary | 简介 |
| detail | 详情内容 |
| targetUserText | 适合人群 |
| painPointText | 解决的问题 |
| serviceProcess | 服务流程 |
| status | 草稿、上架、下架 |
| priority | 运营优先级 |
| tags | 产品标签 |
| sortOrder | 排序 |

第一版建议用 `priceText`，不要一开始做复杂 SKU、订单、支付和库存：

```text
免费咨询
¥199 起
到店评估
顾问定制
```

### 5.3 ProductTag

标签用于推荐匹配。

标签类型：

| 类型 | 示例 |
|------|------|
| need | 睡眠、减脂、压力、慢病管理 |
| demographic | 女性、30-45 岁、宝妈、中老年 |
| scene | 居家、到店、线上咨询 |
| goal | 改善睡眠、体重管理、调理状态 |
| risk | 高血压、孕期、过敏等慎用提示 |

MVP 可以先用字符串数组，后续再规范成标签表。

## 6. 用户画像设计

画像不是一次性填写完整，而是逐步积累。

来源包括：

- 注册资料。
- 轻问卷。
- 浏览行为。
- 咨询/报名行为。
- B 顾问补充。
- 后台运营导入。

### 6.1 UserTag

第一版可直接挂在用户 profile 或独立表中。

示例：

```text
sleep
weight_control
high_pressure
female
age_30_45
health_interest
```

### 6.2 轻问卷

当用户标签不足时，C 端先不急着展示大量产品，而是问 1-3 个问题。

示例：

```text
你最近最关注什么？
A 睡眠
B 体重
C 情绪压力
D 皮肤状态
E 家庭健康
```

提交后写入标签：

```text
sleep / weight_control / stress / skin / family_health
```

### 6.3 用户画像更新策略

画像更新要可追溯：

| 来源 | 权重 |
|------|------|
| 用户主动选择 | 高 |
| B 顾问标记 | 中高 |
| 咨询/报名行为 | 中 |
| 浏览行为 | 低 |

避免只因用户看过一次产品就强行改变画像。

## 7. 推荐规则设计

第一版推荐分数可以用规则计算。

```text
score =
  标签匹配分
+ 模块匹配分
+ 产品运营权重
+ B 可推广加权
+ 新品/活动加权
- 风险标签排除
- 下架/不可见过滤
```

### 7.1 基础过滤

产品必须满足：

- `status = published`
- 当前时间在可展示范围内。
- 如果有 B 来源，B 有权推广该产品。
- 用户风险标签不命中产品排除规则。

### 7.2 标签匹配

示例：

```text
用户标签：sleep, female, age_30_45, stress
产品标签：sleep, stress, health, online_consult
匹配：sleep + stress
```

匹配越多，分数越高。

### 7.3 运营权重

后台可以设置：

| 字段 | 说明 |
|------|------|
| priority | 主推程度 |
| recommendFrom / recommendTo | 推荐时间 |
| moduleWeight | 模块权重 |
| boostTags | 命中特定标签加权 |

### 7.4 推荐结果

推荐结果可以实时算，也可以缓存。

MVP 推荐实时计算：

```text
GET /products/recommended
  ↓
读取用户标签
  ↓
读取上架产品
  ↓
计算分数
  ↓
返回 Top N
```

后续数据量上来后，改成定时生成：

```text
UserProductRecommendation
```

## 8. C 端体验设计

C 端不以“商城货架”为第一入口，而以“需求推荐”为第一入口。

### 8.1 首页结构

建议：

```text
顶部 Banner
我的关注/轻问卷入口
为你推荐
健康模块精选
顾问推荐
全部产品入口
```

“全部产品”保留，但不作为主入口。

### 8.2 产品详情

详情页重点不是堆参数，而是回答用户问题：

```text
这个产品解决什么问题？
适合我吗？
怎么服务？
需要花多少钱？
谁会跟进我？
如何咨询？
```

### 8.3 咨询/报名

C 可以点击：

```text
我要咨询
预约评估
领取方案
联系顾问
```

生成 `ProductLead`。

如果用户从 B 分享进入：

```text
/pages/products/detail?id=123&inviteCode=ABC123
```

线索归属：

```text
ProductLead.partnerId = 对应 B
ProductLead.sourceInviteCode = ABC123
```

## 9. B 端体验设计

B 不是简单转发全量产品，而是顾问式推荐。

B 端页面：

```text
可推广产品
推荐给客户
我的产品线索
客户关注标签
推广素材
```

B 可以：

- 查看自己可推广的产品。
- 复制产品分享路径。
- 生成带自己邀请码的产品海报。
- 给已有客户手动推荐产品。
- 查看自己带来的咨询/报名线索。

MVP 可以先只做：

```text
GET /partner/products
GET /partner/product-leads
```

## 10. 后台管理设计

后台不是只维护产品，还要维护推荐策略。

### 10.1 产品管理

页面：

- 产品列表。
- 创建产品。
- 编辑产品。
- 上架/下架。
- 设置推荐优先级。
- 上传主图、详情图。
- 设置标签。

### 10.2 模块管理

页面：

- 模块列表。
- 模块排序。
- 模块启停。
- 模块图标和说明。

### 10.3 标签管理

页面：

- 标签列表。
- 标签分组。
- 标签说明。
- 是否用于推荐。

MVP 可先不做标签管理页面，产品编辑时直接选择预设标签。

### 10.4 推荐规则

第一版推荐规则可以内置，不做复杂规则编辑器。

后台只开放：

- 产品优先级。
- 推荐时间。
- 标签。
- 是否首页推荐。

后续再做规则配置：

- 按用户分群。
- 按 B 等级。
- 按地区。
- 按活动。

### 10.5 线索管理

后台查看：

- C 用户。
- 产品。
- 来源 B。
- 来源邀请码。
- 用户标签。
- 留资时间。
- 跟进状态。
- 跟进备注。

状态建议：

```text
new
contacted
qualified
converted
invalid
```

## 11. 数据模型建议

### 11.1 MVP 表

```text
ProductModule
Product
ProductLead
```

Product 先包含：

```text
moduleId
title
subtitle
coverUrl
priceText
summary
detail
tags Json/String[]
priority
status
sortOrder
publishedAt
```

ProductLead：

```text
productId
userId
partnerId
sourceInviteCode
sourceScene
contactName
contactPhoneMasked
needTags
message
status
followUpNote
createdAt
```

### 11.2 P2 表

```text
Tag
ProductTag
UserTag
RecommendationRule
ProductRecommendation
ProductViewEvent
ProductShareEvent
```

### 11.3 P3 表

```text
ProductSku
Order
OrderItem
Commission
Settlement
```

## 12. API 设计

### 12.1 C 端

```text
GET /products/recommended
GET /products
GET /products/:id
POST /products/:id/leads
POST /profile/needs
```

### 12.2 B 端

```text
GET /partner/products
GET /partner/products/:id/share
POST /partner/products/:id/recommend
GET /partner/product-leads
```

### 12.3 后台

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

## 13. 推荐链路示例

健康模块示例：

```text
产品 A：睡眠改善咨询
标签：health, sleep, stress, online_consult, female

用户 C：
标签：sleep, stress, age_30_45

推荐命中：
sleep + stress
```

展示：

```text
为你推荐：睡眠改善咨询
推荐原因：你关注了睡眠和压力调节
按钮：预约咨询
```

如果 C 从 B 的分享进入：

```text
B 分享产品 A
  ↓
C 打开详情
  ↓
C 预约咨询
  ↓
ProductLead 绑定 productId + userId + partnerId
  ↓
B 工作台看到该线索
  ↓
后台也能统一跟进
```

## 14. 分阶段实施

### 阶段 1：产品库 + C 推荐 + 线索

目标：

- 后台维护产品。
- C 端看到推荐产品。
- C 可以咨询/报名。
- 后台看到产品线索。

实现：

- ProductModule / Product / ProductLead。
- `/products/recommended` 使用简单标签匹配。
- 小程序产品列表、详情、咨询。
- 后台产品管理和线索列表。

验收：

- 后台能创建健康产品并上架。
- C 端能看到推荐产品。
- C 提交咨询后后台能看到线索。

### 阶段 2：轻问卷 + 用户标签

目标：

- C 端通过轻问卷表达需求。
- 系统生成用户标签。
- 推荐结果随标签变化。

实现：

- 用户需求接口。
- 轻问卷页面。
- UserTag 或 profile.tags。

验收：

- 选择“睡眠”后，健康睡眠类产品优先展示。

### 阶段 3：B 顾问推荐

目标：

- B 能查看可推广产品。
- B 分享产品给 C。
- B 能看到自己带来的产品线索。

实现：

- `/partner/products`
- `/partner/product-leads`
- 产品分享路径带 `inviteCode`。

验收：

- C 通过 B 分享进入产品详情并提交线索。
- B 端可见该线索。

### 阶段 4：推荐规则后台化

目标：

- 运营能调整推荐权重。
- 按模块、标签、地区、B 类型控制推荐。

实现：

- Tag。
- RecommendationRule。
- ProductPolicy。

验收：

- 后台调整某个健康产品优先级后，C 推荐排序变化。

### 阶段 5：交易与收益

目标：

- 从线索转化到订单。
- B 产生佣金。
- 后台可结算。

实现：

- Order。
- Commission。
- Settlement。

验收：

- C 下单后生成订单。
- 根据 C-B 归属生成佣金。
- 后台可查看待结算收益。

## 15. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 标签体系一开始设计过重 | 后台维护成本高 | MVP 先用少量预设标签 |
| 推荐结果不准 | 用户不信任 | 展示推荐原因，并保留全部产品入口 |
| B 滥发产品 | 用户体验差 | B 分享行为记录，后续加频控 |
| 产品和线索脱节 | 无法转化 | ProductLead 必须记录产品、用户、来源 B |
| 过早做交易 | 复杂度暴涨 | 第一阶段只做咨询/报名 |
| 隐私风险 | 用户敏感信息泄露 | C 联系方式只后台可见，B 端按权限脱敏 |

## 16. 当前推荐落地范围

下一步建议只做阶段 1：

```text
后台产品管理
C 端推荐产品
C 提交咨询线索
后台线索查看
```

暂不做：

```text
支付
订单
佣金
复杂 SKU
复杂推荐规则编辑器
AI 推荐
```

这样可以尽快验证：

```text
用户是否愿意表达需求
推荐产品是否能被点击
咨询线索是否能转化
B 是否能贡献有效客户
```

## 17. 后续与 Codex 沟通模板

阶段 1 实现：

```text
按照 docs/plans/2026-08-25-product-recommendation-design.md 的阶段 1，实现产品模块 MVP：后台产品管理、C 端推荐产品、C 咨询线索、后台线索查看。
```

阶段 2 实现：

```text
按照 docs/plans/2026-08-25-product-recommendation-design.md 的阶段 2，实现 C 端轻问卷和用户标签，并让推荐结果根据标签变化。
```

阶段 3 实现：

```text
按照 docs/plans/2026-08-25-product-recommendation-design.md 的阶段 3，实现 B 端产品推广和 B 端产品线索查看。
```

## 18. 当前模块运营配置实现

本阶段采用“后台配置模块，小程序动态展示”的实现边界：

- 后台维护 `ProductModule`、`Product`、`ProductLead`。
- `ProductModule.showOnHome = true` 的模块会在小程序首页“专属服务”展示。
- 小程序进入模块时按 `moduleCode` 获取推荐产品。
- 当前只有 `assessmentType = health` 绑定健康需求评估。
- 新增其它模块时，可以先不启用评估，直接展示模块下已上架产品。

当前新增的模块配置字段：

| 字段 | 说明 |
|------|------|
| icon | 小程序首页入口展示文案 |
| coverUrl | 模块封面地址，预留给后续模块页和专题页 |
| showOnHome | 是否展示到小程序首页 |
| assessmentEnabled | 是否启用模块评估 |
| assessmentType | 评估类型，当前支持 `health` |

这不是完整的问卷配置系统。后续当模块变多、每个模块都需要独立问卷时，再新增 `AssessmentTemplate`、`AssessmentQuestion`、`AssessmentAnswer` 等表，避免现在过早设计复杂规则。
