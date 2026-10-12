# 运营分析口径统一一期设计

## 1. 目标

本阶段目标是把产品推荐、咨询线索、活动曝光、活动点击和活动报名纳入同一套运营分析口径，让后台能回答三个问题：

- 用户从哪个入口看到产品或活动。
- 用户是否点击、提交咨询或报名。
- 哪些模块、产品、活动和来源场景更容易转化。

## 2. 方案选择

### 方案 A：新增独立活动统计表

优点：活动统计语义清晰，不影响原产品推荐事件表。

缺点：产品和活动会形成两套统计口径，后台看板、筛选、趋势计算容易重复。

### 方案 B：扩展 `RecommendationEvent`

优点：沿用现有事件表、上报接口和后台分析页面，能快速形成统一漏斗。

缺点：表名偏产品推荐语义，后续如事件类型大幅扩张，可能需要重命名为更通用的 `OperationEvent`。

### 方案 C：直接建设独立埋点系统

优点：长期扩展性最好，可支持复杂用户行为分析。

缺点：当前阶段成本过高，需要事件 SDK、采集、清洗、存储和分析链路。

推荐采用方案 B。它符合 KISS 和 YAGNI：当前只需要统一业务漏斗，不需要完整埋点平台。

## 3. 数据设计

在 `RecommendationEvent` 增加：

```prisma
activityId BigInt?
activity   Activity? @relation(fields: [activityId], references: [id], onDelete: SetNull)
```

事件类型扩展：

```text
activity_registration  活动报名
activity_cancel        活动取消报名
```

推荐形式扩展：

```text
activity_featured      活动推荐或活动列表入口
```

继续保留已有字段：

- `moduleId` / `moduleCode`：统一模块维度。
- `sourceScene`：来源场景。
- `recommendationForm`：推荐或展示形式。
- `tags` / `tagIds`：用户需求、产品或活动标签快照。
- `metadata`：补充 `registrationId`、`activityType`、`registrationStatus` 等非核心字段。

## 4. 数据流

```text
小程序活动列表展示
  ↓
上报 impression，携带 activityId、moduleCode、sourceScene
  ↓
用户点击活动卡片
  ↓
上报 click，携带 activityId
  ↓
用户登录后报名活动
  ↓
服务端创建 ActivityRegistration
  ↓
服务端写入 activity_registration 事件
  ↓
后台推荐效果页展示活动报名排行和来源场景转化
```

活动报名和取消报名由服务端记录，避免客户端漏报影响关键转化数据。曝光和点击属于体验行为，由小程序非阻断上报，失败不影响用户流程。

## 5. 后台分析口径

本阶段后台分析接口继续使用：

```text
GET /api/v1/admin/products/analytics
```

响应新增：

- `overview.activityRegistrations`
- `overview.activityCancels`
- `overview.activityRegistrationRate`
- `activityStats`
- `sourceStats`
- `formStats`

页面新增：

- 活动报名排行。
- 来源场景转化。
- 每日趋势中的活动报名字段。

## 6. 验收标准

- API 类型检查通过。
- Admin 类型检查通过。
- Miniapp 类型检查通过。
- `RecommendationEvent` 支持保存 `activityId`。
- 活动报名成功后服务端自动写入 `activity_registration`。
- 小程序活动列表曝光和活动详情点击能非阻断上报。
- 后台推荐效果页能展示活动报名排行和来源场景转化。

## 7. 工程原则

- KISS：复用现有事件表、接口和后台页面，不新增复杂分析服务。
- YAGNI：暂不做独立埋点 SDK、实时分析、用户路径还原。
- SOLID：活动报名事实仍由 `ActivityService` 负责，统计展示由产品分析接口聚合，不改变核心业务职责。
- DRY：产品和活动共享 `sourceScene`、`recommendationForm`、`moduleCode` 等统计口径，减少重复统计逻辑。
