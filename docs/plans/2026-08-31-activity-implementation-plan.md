# Activity Registration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现活动发布、活动展示、用户报名、后台报名管理的第一版闭环。

**Architecture:** 新增独立 `ActivityModule`，不把活动塞进 `ProductModule`。活动归属现有 `ProductModule`，复用标签字典、用户登录、Admin 鉴权和本地冒烟验收脚本。

**Tech Stack:** NestJS、Prisma、PostgreSQL、Vue 3、Element Plus、uni-app、pnpm。

---

## Task 1: 数据模型与迁移

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_activity_registration/migration.sql`

**Step 1: 修改 Prisma Schema**

在 `ProductModule` 增加：

```prisma
activities Activity[]
```

在 `User` 增加：

```prisma
activityRegistrations ActivityRegistration[]
```

在 `Partner` 增加：

```prisma
activityRegistrations ActivityRegistration[]
```

新增模型：

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

**Step 2: 生成迁移**

Run:

```bash
pnpm --filter @blisstribe/api exec prisma migrate dev --name add_activity_registration
```

Expected:

```text
The following migration(s) have been created and applied
```

**Step 3: 格式化和生成客户端**

Run:

```bash
pnpm --filter @blisstribe/api exec prisma format
pnpm --filter @blisstribe/api prisma:generate
```

Expected:

```text
Generated Prisma Client
```

**Step 4: Commit**

```bash
git add apps/api/prisma
git commit -m "feat: 增加活动与报名数据模型"
```

## Task 2: 后端 DTO 与活动模块骨架

**Files:**

- Create: `apps/api/src/activity/dto.ts`
- Create: `apps/api/src/activity/activity.module.ts`
- Create: `apps/api/src/activity/activity.service.ts`
- Create: `apps/api/src/activity/activity.controller.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: 创建 DTO**

定义常量：

```ts
export const ACTIVITY_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  UNPUBLISHED: 2,
} as const

export const ACTIVITY_TYPES = ['online', 'offline', 'mixed'] as const
export const ACTIVITY_REGISTRATION_STATUS = ['registered', 'confirmed', 'attended', 'cancelled', 'invalid'] as const
```

定义 DTO：

```ts
CreateActivityDto
UpdateActivityDto
CreateActivityRegistrationDto
CancelActivityRegistrationDto
UpdateActivityRegistrationStatusDto
```

字段校验使用 `class-validator`，保持和 `product/dto.ts` 一致。

**Step 2: 创建模块骨架**

`activity.module.ts`：

```ts
@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [ActivityController, ActivityAdminController, ActivityRegistrationAdminController],
  providers: [ActivityService],
})
export class ActivityModule {}
```

**Step 3: 注册模块**

在 `apps/api/src/app.module.ts` 引入：

```ts
import { ActivityModule } from './activity/activity.module'
```

并加入 `imports`。

**Step 4: 运行类型检查**

Run:

```bash
pnpm --filter @blisstribe/api type-check
```

Expected:

```text
tsc --noEmit
```

**Step 5: Commit**

```bash
git add apps/api/src/activity apps/api/src/app.module.ts
git commit -m "feat: 增加活动模块骨架"
```

## Task 3: 后端公开活动查询

**Files:**

- Modify: `apps/api/src/activity/activity.service.ts`
- Modify: `apps/api/src/activity/activity.controller.ts`

**Step 1: 实现公开查询**

实现方法：

```ts
listPublic(params)
recommended(params)
detailPublic(id, userId?)
```

查询规则：

```text
status = PUBLISHED
deletedAt = null
module.status = 1
module.deletedAt = null
```

排序：

```text
priority desc
sortOrder asc
startAt asc
```

**Step 2: 实现 VO 转换**

实现：

```ts
toActivityVO(activity, registeredCount, myRegistration?)
deriveRegistrationStatus(activity, registeredCount)
```

必须返回：

```text
registeredCount
remainingCount
registrationStatus
myRegistration
```

**Step 3: 暴露公开接口**

```ts
@Controller('activities')
export class ActivityController {
  @Get()
  list()

  @Get('recommended')
  recommended()

  @Get(':id')
  detail()
}
```

详情接口使用 `OptionalJwtAuthGuard`，登录用户可返回自己的报名状态，未登录也可查看活动详情。

**Step 4: 手动验证**

Run:

```bash
curl -s 'http://localhost:4000/api/v1/activities?page=1&pageSize=10'
curl -s 'http://localhost:4000/api/v1/activities/recommended?limit=3'
```

Expected:

```text
code = 200
```

**Step 5: Commit**

```bash
git add apps/api/src/activity
git commit -m "feat: 增加活动公开查询接口"
```

## Task 4: 后端报名与取消

**Files:**

- Modify: `apps/api/src/activity/activity.service.ts`
- Modify: `apps/api/src/activity/activity.controller.ts`

**Step 1: 实现报名**

实现：

```ts
register(activityId, userId, dto)
```

校验：

```text
活动已发布
当前在报名时间内
活动未结束
名额未满
同一用户不重复创建有效报名
```

重复报名规则：

```text
registered/confirmed/attended 返回现有报名
cancelled/invalid 恢复为 registered
```

**Step 2: 解析邀请来源**

复用现有邀请码逻辑的查询方式：

```text
inviteCode -> InvitationRecord/Partner -> partnerId
```

如果现有服务方法不适合复用，第一版可只记录 `sourceInviteCode`，不强行注入 `InvitationService`。

**Step 3: 实现取消**

实现：

```ts
cancelRegistration(activityId, userId, dto)
```

规则：

```text
只能取消自己的报名
attended 不允许取消
活动结束后不允许取消
```

**Step 4: 我的报名**

实现：

```ts
myRegistrations(userId, pageParams)
```

**Step 5: 手动验证**

Run:

```bash
curl -s -X POST 'http://localhost:4000/api/v1/activities/1/registrations' \
  -H 'Authorization: Bearer <user-token>' \
  -H 'Content-Type: application/json' \
  -d '{"sourceScene":"activity_detail"}'
```

Expected:

```text
code = 200
```

**Step 6: Commit**

```bash
git add apps/api/src/activity
git commit -m "feat: 增加活动报名接口"
```

## Task 5: 后端后台活动管理

**Files:**

- Modify: `apps/api/src/activity/activity.service.ts`
- Modify: `apps/api/src/activity/activity.controller.ts`

**Step 1: 实现后台活动列表**

实现：

```ts
listAdmin(params)
```

支持：

```text
page/pageSize
keyword
moduleId
activityType
status
```

**Step 2: 实现创建和编辑**

实现：

```ts
createAdmin(dto)
updateAdmin(id, dto)
publishAdmin(id)
unpublishAdmin(id)
```

保存前校验：

```text
moduleId 有效
endAt > startAt
registrationEndAt <= endAt
capacity 为空或大于 0
```

标签处理复用产品模块里的标签规范：

```text
tagIds -> 查询 TagDictionary -> tags 快照
```

**Step 3: 暴露后台接口**

```ts
@Controller('admin/activities')
@UseGuards(AdminJwtGuard)
export class ActivityAdminController {}
```

**Step 4: Commit**

```bash
git add apps/api/src/activity
git commit -m "feat: 增加后台活动管理接口"
```

## Task 6: 后端后台报名管理

**Files:**

- Modify: `apps/api/src/activity/activity.service.ts`
- Modify: `apps/api/src/activity/activity.controller.ts`

**Step 1: 实现报名列表**

实现：

```ts
listRegistrationsAdmin(params)
detailRegistrationAdmin(id)
updateRegistrationStatusAdmin(id, dto)
```

支持筛选：

```text
activityId
status
keyword
page/pageSize
```

**Step 2: 暴露后台接口**

```ts
@Controller('admin/activity-registrations')
@UseGuards(AdminJwtGuard)
export class ActivityRegistrationAdminController {}
```

**Step 3: Commit**

```bash
git add apps/api/src/activity
git commit -m "feat: 增加后台活动报名管理接口"
```

## Task 7: 后台 API 封装

**Files:**

- Create: `apps/admin/src/api/activity.ts`

**Step 1: 定义类型**

定义：

```ts
Activity
ActivityPayload
ActivityRegistration
ActivityRegistrationPayload
```

**Step 2: 封装接口**

```ts
activityApi.listActivities()
activityApi.createActivity()
activityApi.updateActivity()
activityApi.publishActivity()
activityApi.unpublishActivity()
activityApi.listRegistrations()
activityApi.detailRegistration()
activityApi.updateRegistrationStatus()
```

**Step 3: 类型检查**

Run:

```bash
pnpm --filter @blisstribe/admin type-check
```

Expected:

```text
vue-tsc --noEmit
```

**Step 4: Commit**

```bash
git add apps/admin/src/api/activity.ts
git commit -m "feat: 增加后台活动接口封装"
```

## Task 8: 后台活动管理页面

**Files:**

- Create: `apps/admin/src/views/activity/index.vue`
- Modify: `apps/admin/src/router/routes.ts`

**Step 1: 新增路由**

新增：

```ts
{
  path: 'activities',
  name: 'Activities',
  component: () => import('@/views/activity/index.vue'),
  meta: { title: '活动管理', icon: 'Calendar' },
}
```

**Step 2: 实现列表**

页面包含：

```text
搜索框
模块筛选
状态筛选
活动类型筛选
活动表格
分页
```

表格列：

```text
活动标题
模块
活动类型
活动时间
报名截止
名额
状态
排序
操作
```

**Step 3: 实现创建/编辑抽屉**

字段按设计文档分区：

```text
基础信息
活动安排
报名规则
内容信息
推荐关系
```

**Step 4: 实现发布/下线**

操作：

```text
发布
下线
编辑
```

**Step 5: 验证**

Run:

```bash
pnpm --filter @blisstribe/admin type-check
pnpm build:admin
```

Expected:

```text
build success
```

**Step 6: Commit**

```bash
git add apps/admin/src/views/activity/index.vue apps/admin/src/router/routes.ts
git commit -m "feat: 增加后台活动管理页面"
```

## Task 9: 后台活动报名页面

**Files:**

- Create: `apps/admin/src/views/activity/registrations.vue`
- Modify: `apps/admin/src/router/routes.ts`

**Step 1: 新增路由**

新增：

```ts
{
  path: 'activity-registrations',
  name: 'ActivityRegistrations',
  component: () => import('@/views/activity/registrations.vue'),
  meta: { title: '活动报名', icon: 'Tickets' },
}
```

**Step 2: 实现报名列表**

字段：

```text
活动
用户
手机
来源
留言
状态
报名时间
操作
```

**Step 3: 实现状态处理弹窗**

字段：

```text
状态
跟进备注
```

**Step 4: 验证并提交**

```bash
pnpm --filter @blisstribe/admin type-check
pnpm build:admin
git add apps/admin/src/views/activity/registrations.vue apps/admin/src/router/routes.ts
git commit -m "feat: 增加后台活动报名页面"
```

## Task 10: 小程序活动 API

**Files:**

- Create: `apps/miniapp/src/api/modules/activity.ts`
- Modify: `apps/miniapp/src/api/index.ts`

**Step 1: 定义类型**

定义：

```ts
Activity
ActivityRegistration
ActivityRegistrationStatus
```

**Step 2: 封装接口**

```ts
activityApi.list()
activityApi.recommended()
activityApi.detail()
activityApi.register()
activityApi.cancel()
activityApi.myRegistrations()
```

**Step 3: 验证**

```bash
pnpm --filter @blisstribe/miniapp type-check
```

**Step 4: Commit**

```bash
git add apps/miniapp/src/api/modules/activity.ts apps/miniapp/src/api/index.ts
git commit -m "feat: 增加小程序活动接口封装"
```

## Task 11: 小程序活动列表与详情

**Files:**

- Create: `apps/miniapp/src/pages/activities/index.vue`
- Create: `apps/miniapp/src/pages/activities/detail.vue`
- Modify: `apps/miniapp/src/pages.json`

**Step 1: 注册页面**

在 `pages.json` 增加：

```json
{
  "path": "pages/activities/index",
  "style": { "navigationBarTitleText": "活动" }
},
{
  "path": "pages/activities/detail",
  "style": { "navigationBarTitleText": "活动详情" }
}
```

**Step 2: 活动列表**

实现：

```text
状态筛选
活动类型筛选
活动卡片
分页加载
```

**Step 3: 活动详情**

实现：

```text
封面
标题
时间
报名截止
地点
名额
亮点
详情
关联产品
底部报名按钮
```

报名按钮根据 `registrationStatus` 和 `myRegistration` 显示不同文案。

**Step 4: 登录报名**

使用现有 `useAuth` 或 `requireLogin` 模式：

```text
未登录 -> 登录 -> 回到详情 -> 再提交报名
```

**Step 5: Commit**

```bash
git add apps/miniapp/src/pages/activities apps/miniapp/src/pages.json
git commit -m "feat: 增加小程序活动列表和详情"
```

## Task 12: 小程序首页和我的活动

**Files:**

- Modify: `apps/miniapp/src/pages/index/index.vue`
- Modify: `apps/miniapp/src/pages/profile/index.vue`
- Create: `apps/miniapp/src/pages/profile/activity-registrations.vue`
- Modify: `apps/miniapp/src/pages.json`

**Step 1: 首页近期活动**

首页加载：

```ts
activityApi.recommended({ limit: 3 })
```

展示 2-3 个活动卡片。

**Step 2: 个人中心入口**

个人中心增加：

```text
我的活动
```

点击进入 `pages/profile/activity-registrations`。

**Step 3: 我的活动页**

展示：

```text
活动标题
活动时间
报名状态
报名时间
查看详情
取消报名
```

**Step 4: Commit**

```bash
git add apps/miniapp/src/pages/index/index.vue apps/miniapp/src/pages/profile apps/miniapp/src/pages.json
git commit -m "feat: 增加小程序我的活动"
```

## Task 13: 种子数据

**Files:**

- Modify: `apps/api/prisma/seed.ts`

**Step 1: 创建活动种子数据**

新增 3-5 个活动：

```text
健康睡眠线上分享会
情绪压力线下沙龙
家庭沟通体验课
轻体管理体验营
```

覆盖：

```text
online
offline
mixed
有限名额
不限名额
报名中
即将开始
```

**Step 2: 运行 seed**

```bash
RUN_SEED=1 ./start.sh api
```

或：

```bash
pnpm --filter @blisstribe/api prisma:seed
```

**Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "chore: 增加活动验收种子数据"
```

## Task 14: 冒烟验收脚本

**Files:**

- Modify: `scripts/check-local.sh`

**Step 1: 增加活动接口检查**

增加：

```bash
GET /activities
GET /activities/recommended
GET /admin/activities
GET /admin/activity-registrations
```

若已有活动种子数据，再检查活动数量大于 0。

**Step 2: 验证**

```bash
pnpm check:local
```

Expected:

```text
[ok] 活动列表
[ok] 推荐活动
[ok] 后台活动列表
[ok] 活动报名列表
```

**Step 3: Commit**

```bash
git add scripts/check-local.sh
git commit -m "test: 增加活动冒烟验收"
```

## Task 15: 全量验证

**Files:**

- No source changes expected.

**Step 1: 数据库验证**

```bash
pnpm --filter @blisstribe/api exec prisma migrate deploy
```

Expected:

```text
No pending migrations to apply
```

**Step 2: 类型检查**

```bash
pnpm type-check
```

Expected:

```text
all projects passed
```

**Step 3: 构建**

```bash
pnpm build:api
pnpm build:admin
pnpm build:miniapp
```

Expected:

```text
build success
```

**Step 4: 本地冒烟**

```bash
pnpm check:local
```

Expected:

```text
本地冒烟验收通过
```

**Step 5: 最终提交**

如果前面按任务已经分批提交，这一步只确认：

```bash
git status --short
```

Expected:

```text
空输出
```

## 执行注意事项

- 每个任务完成后独立验证和提交，避免大提交难回滚。
- 不要在第一版实现支付、签到、候补、通知。
- 活动报名必须登录。
- 后台接口必须使用 `AdminJwtGuard`。
- 小程序不要写静态活动数据，必须从 API 获取。
- 关联产品第一版可以展示，不强制打通产品线索 metadata。

## 第一版完成定义

满足以下条件视为完成：

```text
后台能发布活动
小程序能看到活动
用户能报名活动
后台能看到报名
后台能修改报名状态
我的活动能看到报名记录
本地冒烟脚本覆盖活动主接口
```

