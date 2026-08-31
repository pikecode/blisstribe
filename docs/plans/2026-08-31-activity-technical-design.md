# 活动发布与报名技术设计

## 1. 设计目标

本文档基于 `docs/plans/2026-08-31-activity-requirement-analysis.md`，定义活动发布与报名功能的技术实现方案。

第一版目标：

```text
后台发布活动
  ↓
小程序展示活动
  ↓
用户登录后报名
  ↓
后台查看报名并处理状态
  ↓
基础冒烟验收覆盖活动主链路
```

第一版不做：

- 在线支付。
- 签到核销。
- 候补队列。
- 群发通知。
- 活动分销结算。
- 独立活动推荐算法。

## 2. 架构决策

### 2.1 决策：活动独立建模

采用 `Activity` 和 `ActivityRegistration` 独立建模，不把活动塞进 `Product.productType`。

原因：

- 活动有开始时间、结束时间、报名时间、名额、地点、报名状态等独立属性。
- 产品是长期供给，活动是限时运营动作，两者生命周期不同。
- 后续活动签到、通知、候补、复盘统计可以独立扩展。

取舍：

- 优点：职责清晰，后续扩展稳定。
- 缺点：第一版需要新增表、接口、后台页面和小程序页面。

### 2.2 决策：活动归属产品模块

活动通过 `moduleId` 归属现有 `ProductModule`。

原因：

- 当前业务模块已经承载健康、成长、社群等分类。
- 活动和产品可以共享模块筛选、标签语言和首页展示逻辑。
- 避免新增一套活动分类体系。

### 2.3 决策：活动标签复用标签字典

活动使用 `tags` 和 `tagIds`，复用 `TagDictionary`。

原因：

- 标签是当前推荐、画像、评估的统一业务语言。
- 后续可以基于用户标签推荐活动。
- 后台运营维护口径一致。

### 2.4 决策：报名第一版只做状态管理

报名记录使用 `ActivityRegistration`，第一版不新增报名跟进历史表。

原因：

- 活动报名的第一需求是确认、取消、参加。
- 产品线索已经有复杂跟进历史，活动第一版不需要复制一套 CRM。
- 后续如果活动运营复杂，再新增 `ActivityRegistrationFollowUp`。

## 3. 模块边界

### 3.1 后端模块

新增：

```text
apps/api/src/activity/activity.module.ts
apps/api/src/activity/activity.controller.ts
apps/api/src/activity/activity.service.ts
apps/api/src/activity/dto.ts
```

职责：

- `ActivityModule`：注册活动控制器和服务。
- `ActivityController`：公开接口、登录接口、后台接口。
- `ActivityService`：活动查询、活动管理、报名、取消、后台状态处理。
- `dto.ts`：请求参数校验和状态常量。

不放入 `ProductModule`。

原因：

- 遵守 SOLID 单一职责。
- 避免产品模块继续膨胀。
- 后续活动独立扩展更容易。

### 3.2 后台模块

新增：

```text
apps/admin/src/api/activity.ts
apps/admin/src/views/activity/index.vue
apps/admin/src/views/activity/registrations.vue
```

路由：

```text
/activities
/activity-registrations
```

菜单建议：

```text
活动管理
活动报名
```

第一版先放在现有后台主菜单中，不重构成“运营中心”。

### 3.3 小程序模块

新增：

```text
apps/miniapp/src/api/modules/activity.ts
apps/miniapp/src/pages/activities/index.vue
apps/miniapp/src/pages/activities/detail.vue
apps/miniapp/src/pages/profile/activity-registrations.vue
```

修改：

```text
apps/miniapp/src/pages.json
apps/miniapp/src/pages/index/index.vue
apps/miniapp/src/pages/profile/index.vue
```

## 4. 数据模型设计

### 4.1 Activity

新增 Prisma 模型：

```prisma
model Activity {
  id                  BigInt    @id @default(autoincrement())
  moduleId            BigInt
  title               String
  subtitle            String    @default("")
  coverUrl            String    @default("")
  activityType        String    @default("online")
  startAt             DateTime
  endAt               DateTime
  registrationStartAt DateTime?
  registrationEndAt   DateTime
  locationText        String    @default("")
  capacity            Int?
  targetUserText      String    @default("")
  highlights          String[]
  detail              String    @default("")
  tags                String[]
  tagIds              BigInt[]
  relatedProductIds   BigInt[]
  priority            Int       @default(0)
  sortOrder           Int       @default(0)
  status              Int       @default(0)
  publishedAt         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?

  module        ProductModule          @relation(fields: [moduleId], references: [id], onDelete: Restrict)
  registrations ActivityRegistration[]

  @@index([moduleId, status])
  @@index([activityType, status])
  @@index([status, startAt])
  @@index([registrationEndAt])
  @@index([deletedAt])
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| activityType | `online/offline/mixed` |
| capacity | 活动名额，空值代表不限 |
| highlights | 活动亮点，用数组方便展示 |
| relatedProductIds | 第一版用数组关联产品，后续再按需要拆关联表 |
| status | `0草稿 1发布 2下线` |

### 4.2 ActivityRegistration

新增 Prisma 模型：

```prisma
model ActivityRegistration {
  id               BigInt   @id @default(autoincrement())
  activityId       BigInt
  userId           BigInt
  partnerId        BigInt?
  sourceInviteCode String?
  sourceScene      String   @default("miniapp")
  name             String   @default("")
  phoneMasked      String   @default("")
  message          String   @default("")
  status           String   @default("registered")
  followUpNote     String   @default("")
  cancelReason     String   @default("")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  partner  Partner? @relation(fields: [partnerId], references: [id], onDelete: SetNull)

  @@unique([activityId, userId])
  @@index([activityId, status])
  @@index([userId, createdAt])
  @@index([partnerId, createdAt])
  @@index([status, createdAt])
}
```

报名状态：

| 状态 | 含义 |
| --- | --- |
| registered | 已报名 |
| confirmed | 已确认 |
| attended | 已参加 |
| cancelled | 已取消 |
| invalid | 无效报名 |

第一版后台只需要支持状态修改和备注。

### 4.3 关系扩展

需要修改现有模型：

```prisma
model ProductModule {
  activities Activity[]
}

model User {
  activityRegistrations ActivityRegistration[]
}

model Partner {
  activityRegistrations ActivityRegistration[]
}
```

## 5. 状态规则

### 5.1 活动可见规则

公开列表只展示：

```text
status = 1
deletedAt = null
module.status = 1
module.deletedAt = null
```

### 5.2 活动状态派生

接口返回 `registrationStatus`：

| 派生状态 | 条件 |
| --- | --- |
| not_started | 当前时间早于报名开始时间 |
| registering | 当前时间在报名时间内，且未满员 |
| full | 名额已满 |
| closed | 当前时间晚于报名截止时间 |
| ended | 当前时间晚于活动结束时间 |

优先级：

```text
ended > closed > not_started > full > registering
```

### 5.3 报名规则

报名必须登录。

报名校验顺序：

```text
1. 活动存在且已发布
2. 活动未结束
3. 当前时间在报名时间内
4. 名额未满
5. 同一用户同一活动没有有效报名
6. 写入或恢复报名记录
```

同一用户重复报名：

- 已报名、已确认、已参加：返回现有报名，不重复创建。
- 已取消、无效：允许恢复为 `registered`。

名额计算：

```text
有效报名状态 = registered / confirmed / attended
```

第一版使用事务内 count + upsert。若活动名额非常敏感，再升级为行锁或冗余计数。

## 6. API 设计

### 6.1 公开接口

```text
GET /api/v1/activities
GET /api/v1/activities/recommended
GET /api/v1/activities/:id
```

`GET /activities` 参数：

| 参数 | 说明 |
| --- | --- |
| moduleCode | 模块编码 |
| activityType | 活动类型 |
| statusScope | `registering/upcoming/ended` |
| page | 页码 |
| pageSize | 每页数量 |

返回结构：

```ts
interface ActivityVO {
  id: number
  module: ProductModuleVO
  title: string
  subtitle: string
  coverUrl: string
  activityType: 'online' | 'offline' | 'mixed'
  startAt: string
  endAt: string
  registrationStartAt: string | null
  registrationEndAt: string
  locationText: string
  capacity: number | null
  registeredCount: number
  remainingCount: number | null
  registrationStatus: string
  targetUserText: string
  highlights: string[]
  detail: string
  tags: string[]
  tagIds: number[]
  relatedProducts?: ProductVO[]
  priority: number
  sortOrder: number
  status: number
}
```

### 6.2 登录接口

```text
POST /api/v1/activities/:id/registrations
GET /api/v1/activities/my-registrations
POST /api/v1/activities/:id/registrations/cancel
```

报名请求：

```ts
interface CreateActivityRegistrationDto {
  name?: string
  message?: string
  inviteCode?: string
  sourceScene?: string
}
```

取消请求：

```ts
interface CancelActivityRegistrationDto {
  cancelReason?: string
}
```

### 6.3 后台接口

```text
GET /api/v1/admin/activities
POST /api/v1/admin/activities
PUT /api/v1/admin/activities/:id
POST /api/v1/admin/activities/:id/publish
POST /api/v1/admin/activities/:id/unpublish
```

```text
GET /api/v1/admin/activity-registrations
GET /api/v1/admin/activity-registrations/:id
PUT /api/v1/admin/activity-registrations/:id/status
```

后台报名状态更新：

```ts
interface UpdateActivityRegistrationStatusDto {
  status: 'registered' | 'confirmed' | 'attended' | 'cancelled' | 'invalid'
  followUpNote?: string
}
```

## 7. 后台页面设计

### 7.1 活动管理页

路径：

```text
apps/admin/src/views/activity/index.vue
```

功能：

- 活动列表。
- 搜索标题。
- 按状态筛选。
- 按模块筛选。
- 按活动类型筛选。
- 创建/编辑活动。
- 发布/下线。
- 展示报名数、名额、活动时间、报名状态。

表单分区：

```text
基础信息：模块、标题、副标题、封面、状态
活动安排：活动类型、开始时间、结束时间、报名开始、报名截止、地点
报名规则：名额
内容信息：适合人群、亮点、详情
推荐关系：标签、关联产品、优先级、排序
```

### 7.2 活动报名页

路径：

```text
apps/admin/src/views/activity/registrations.vue
```

功能：

- 报名列表。
- 按活动筛选。
- 按状态筛选。
- 搜索用户昵称、手机号、留言。
- 查看报名详情。
- 修改报名状态和跟进备注。

## 8. 小程序页面设计

### 8.1 首页近期活动

修改：

```text
apps/miniapp/src/pages/index/index.vue
```

展示：

- 近期 2-3 个活动。
- 优先展示报名中活动。
- 卡片显示标题、时间、活动方式、剩余名额。

### 8.2 活动列表

新增：

```text
apps/miniapp/src/pages/activities/index.vue
```

功能：

- 活动列表。
- 模块筛选。
- 活动状态筛选。
- 活动类型筛选。
- 点击进入详情。

### 8.3 活动详情

新增：

```text
apps/miniapp/src/pages/activities/detail.vue
```

功能：

- 展示活动完整信息。
- 未登录报名时跳转登录。
- 已报名显示报名状态。
- 可展示关联产品入口。

### 8.4 我的活动

新增：

```text
apps/miniapp/src/pages/profile/activity-registrations.vue
```

修改：

```text
apps/miniapp/src/pages/profile/index.vue
```

功能：

- 展示报名记录。
- 查看活动详情。
- 活动开始前允许取消报名。

## 9. 数据流

### 9.1 后台发布

```text
Admin 活动表单
  ↓
POST /admin/activities
  ↓
Activity.status = draft
  ↓
POST /admin/activities/:id/publish
  ↓
小程序公开列表可见
```

### 9.2 用户报名

```text
活动详情页点击报名
  ↓
useAuth.requireLogin
  ↓
POST /activities/:id/registrations
  ↓
ActivityRegistration 写入
  ↓
刷新详情页报名状态
  ↓
我的活动可见
```

### 9.3 活动关联产品

```text
Activity.relatedProductIds
  ↓
活动详情查询关联产品
  ↓
点击产品详情携带 activityId
  ↓
产品线索 sourceScene = activity_detail
```

第一版可以先展示关联产品，不强制改产品线索 metadata。

## 10. 安全与权限

| 场景 | 权限 |
| --- | --- |
| 活动公开列表 | 无需登录 |
| 活动详情 | 无需登录 |
| 报名活动 | 必须用户登录 |
| 我的报名 | 必须用户登录 |
| 取消报名 | 必须用户登录且只能操作自己的报名 |
| 后台活动管理 | 必须 Admin 登录 |
| 后台报名管理 | 必须 Admin 登录 |

注意：

- 报名不接收明文手机号。
- 后台展示沿用用户表中的脱敏手机号。
- 邀请码来源必须由后端解析，不信任前端传入的 `partnerId`。

## 11. 错误处理

推荐错误文案：

| 场景 | 文案 |
| --- | --- |
| 活动不存在 | 活动不存在或已下线 |
| 未到报名时间 | 报名暂未开始 |
| 报名截止 | 报名已截止 |
| 活动结束 | 活动已结束 |
| 名额已满 | 名额已满 |
| 重复报名 | 你已报名该活动 |
| 取消失败 | 当前状态不可取消 |

## 12. 验收标准

### 12.1 后台验收

- 可以创建活动草稿。
- 可以编辑活动。
- 可以发布活动。
- 发布后小程序可见。
- 可以下线活动。
- 可以查看报名列表。
- 可以修改报名状态。

### 12.2 小程序验收

- 首页能展示近期活动。
- 活动列表能按状态筛选。
- 活动详情展示时间、报名截止、名额、地点。
- 未登录报名会要求登录。
- 登录后报名成功。
- 重复报名不会生成多条有效记录。
- 我的活动能看到报名记录。

### 12.3 工程验收

必须通过：

```bash
pnpm --filter @blisstribe/api exec prisma format
pnpm --filter @blisstribe/api exec prisma migrate deploy
pnpm --filter @blisstribe/api type-check
pnpm --filter @blisstribe/admin type-check
pnpm --filter @blisstribe/miniapp type-check
pnpm build:api
pnpm build:admin
pnpm build:miniapp
pnpm check:local
```

## 13. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 活动报名和产品线索混淆 | 独立 `ActivityRegistration`，不复用 `ProductLead` |
| 第一版范围过大 | 不做支付、签到、通知、候补 |
| 名额并发超额 | 第一版事务校验，真实高并发再加锁 |
| 后台菜单膨胀 | 第一版只加两个活动菜单，不重构信息架构 |
| 小程序登录后丢失报名上下文 | 报名前先登录，登录后回到详情页再确认报名 |

## 14. 工程原则评估

### KISS

第一版只做活动发布、展示、报名和报名管理，保持主链路简单。

### YAGNI

支付、签到、候补、通知、活动分销都不进入第一版，避免尚未验证就建设复杂平台能力。

### SOLID

活动模块独立，产品模块不继续膨胀；活动、报名、产品、线索各自负责自己的业务对象。

### DRY

活动复用已有模块、标签、用户、管理员鉴权和小程序登录能力，不重复建设基础能力。

