# BlissTribe 商城模块设计（优化版）

**日期**：2026-09-21  
**版本**：2.0  
**状态**：现行商城架构基线；第一阶段代码已实现，真实支付与生产验收未完成
**取代**：`docs/shop-module-design.md`（历史初稿，仅作需求背景）
**实施记录**：`docs/plans/2026-09-23-shop-module-completion.md`
**后续计划**：`docs/plans/2026-09-24-shop-next-stage-plan.md`

> 本文是商城唯一现行架构基线。功能代码已具备不等于交易能力已上线：微信支付 V3 适配器尚未实现，支付与退款仍受失败关闭保护。任何“已完成”均须区分代码实现、集成验证和生产启用状态。

---

## 1. 设计结论

本版本采用 NestJS 模块化单体，不拆微服务。

第一阶段只实现：

- 平台自营商品；
- 单商家购物车和订单；
- 实物商品；
- 微信小程序支付；
- PostgreSQL 库存预留；
- 商家手工发货；
- 基础退款；
- 平台后台商品、订单和退款管理。

第一阶段暂不实现：

- 多商家合并结算；
- 微信支付自动分账；
- 商家提现；
- 复杂 SKU；
- 课程/场地自动预约履约；
- 优惠券、秒杀、拼团和个性化推荐；
- Elasticsearch 和独立消息队列。

原因：当前项目已经存在 `Partner`、`Activity`、`Venue` 和用户权限体系。先跑通“商品—订单—支付—发货—退款”闭环，避免在财务和履约尚未验证前引入过多复杂度。

---

## 2. 与现有系统的关系

### 2.1 商家主体

第一阶段不新增独立 `Shop` 主体，平台自营商品不需要商家关系。

后续开放第三方商家时，优先复用现有：

- `Partner`：商家主体；
- `PartnerMember`：商家成员和权限；
- `AuditLog`：商家审核和关键操作记录。

未来商城扩展只增加商城侧资料：

```text
Partner
└── ShopProfile（可选）
    ├── 店铺名称
    ├── 店铺头像
    ├── 结算配置
    └── 商城状态
```

不再同时维护 `Shop` 和 `Partner` 两套商家生命周期。

### 2.2 现有业务复用

- 用户：复用现有 `User` 和 `JwtAuthGuard`；
- 平台管理员：复用现有 `AdminJwtGuard`；
- 文件上传：复用现有 `UploadModule`，敏感资质文件不得使用公开 URL；
- 活动/场地：暂不复制预约逻辑，后续通过履约适配器对接；
- 审计：复用 `AuditLog`。

---

## 3. 模块结构

```text
apps/api/src/shop/
├── shop.module.ts
├── product/
│   ├── product.controller.ts
│   ├── product.service.ts
│   └── dto.ts
├── cart/
├── order/
├── payment/
├── inventory/
├── refund/
└── dto/
```

第一阶段只保留必要模块：

```text
Catalog/Product → Cart → Order → Payment → Inventory
                                      └→ Refund
```

不提前创建 `PromotionModule`、`SettlementModule` 和推荐服务。等对应业务真实存在后再添加。

---

## 4. 角色与权限

| 角色 | 权限 |
|---|---|
| 访客 | 查看已上架商品和分类 |
| 用户 | 管理购物车、创建订单、支付、查看自己的订单、申请退款 |
| 平台管理员 | 管理商品、库存、订单、发货、退款、分类 |
| 商家成员 | 第一阶段不开放；后续通过 `PartnerMember` 扩展 |

权限规则：

- 所有用户订单查询必须同时按 `userId` 过滤；
- 所有管理员接口必须使用 `AdminJwtGuard`；
- 不信任客户端传入的价格、金额、库存、用户 ID 或权限范围；
- 商家开放后，由服务端根据成员关系解析可访问的 `partnerId`，不直接使用前端传入的 `shopId`。

---

## 5. 第一阶段数据模型

金额统一使用“分”，禁止使用 `Float`。

### 5.1 商品

```prisma
model ShopCategory {
  id        BigInt   @id @default(autoincrement())
  code      String   @unique
  name      String
  sortOrder Int      @default(0)
  status    Int      @default(1) // 0停用 1启用
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  products ShopProduct[]
}

model ShopProduct {
  id             BigInt   @id @default(autoincrement())
  categoryId     BigInt
  name           String
  description    String?
  images         String[]
  priceFen       Int
  totalStock     Int      @default(0)
  reservedStock  Int      @default(0)
  soldStock      Int      @default(0)
  status         Int      @default(0) // 0草稿 1上架 2下架
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  category  ShopCategory    @relation(fields: [categoryId], references: [id])
  cartItems ShopCartItem[]
  orderItems ShopOrderItem[]

  @@index([categoryId, status, sortOrder])
  @@index([status, createdAt])
}
```

第一阶段明确为“一商品一价格、无规格”。如果出现颜色、尺寸或套餐，再新增 `ShopProductSku`，不提前引入 SKU 层。

库存可用量计算为：

```text
availableStock = totalStock - reservedStock - soldStock
```

不单独保存 `available`，避免冗余字段失真。

### 5.2 购物车

```prisma
model ShopCart {
  id        BigInt   @id @default(autoincrement())
  userId    BigInt   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  items ShopCartItem[]
}

model ShopCartItem {
  id        BigInt   @id @default(autoincrement())
  cartId    BigInt
  productId BigInt
  quantity  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart    ShopCart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product ShopProduct @relation(fields: [productId], references: [id])

  @@unique([cartId, productId])
}
```

购物车不预留库存。库存只在创建订单时预留。

### 5.3 订单

第一阶段一个订单只包含平台自营商品，因此不需要 `shopId`。未来开放商家后，再增加父订单/子订单模型。

```prisma
model ShopOrder {
  id               BigInt   @id @default(autoincrement())
  orderNo          String   @unique
  userId           BigInt
  status           String   @default("pending_payment")
  // pending_payment / paid / processing / shipped / completed
  // cancelled / refunding / refunded / partially_refunded
  paymentStatus    String   @default("unpaid")
  fulfillmentStatus String  @default("pending")

  totalAmountFen   Int
  discountAmountFen Int     @default(0)
  paymentAmountFen Int
  refundedAmountFen Int     @default(0)

  receiverName     String?
  receiverPhone    String?
  shippingAddress  String?
  trackingNo       String?
  remark           String?

  expiresAt        DateTime
  paidAt           DateTime?
  shippedAt        DateTime?
  completedAt      DateTime?
  cancelledAt      DateTime?
  cancelReason     String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  user     User           @relation(fields: [userId], references: [id])
  items    ShopOrderItem[]
  payments ShopPayment[]
  refunds  ShopRefund[]

  @@index([userId, createdAt])
  @@index([status, expiresAt])
}

model ShopOrderItem {
  id              BigInt   @id @default(autoincrement())
  orderId         BigInt
  productId       BigInt
  productName     String
  productImage    String?
  unitPriceFen    Int
  quantity        Int
  subtotalFen     Int
  createdAt       DateTime @default(now())

  order   ShopOrder   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product ShopProduct @relation(fields: [productId], references: [id])

  @@index([orderId])
}
```

订单项必须保存商品快照，商品后续改名、改价不能影响历史订单。

收货信息属于敏感数据，生产环境应加密存储，后台展示时脱敏。

### 5.4 支付

```prisma
model ShopPayment {
  id                  BigInt   @id @default(autoincrement())
  orderId             BigInt
  outTradeNo          String   @unique
  wechatTransactionId String?  @unique
  prepayId            String?
  amountFen           Int
  status              String   @default("pending")
  // pending / success / failed / closed / refunded
  paidAt              DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  order ShopOrder @relation(fields: [orderId], references: [id])

  @@index([orderId, status])
}
```

`outTradeNo` 在发起支付时生成，`wechatTransactionId` 在微信支付成功后写入。不能要求支付创建时已经存在微信交易号。

### 5.5 退款

```prisma
model ShopRefund {
  id                  BigInt   @id @default(autoincrement())
  orderId             BigInt
  refundNo            String   @unique
  outRefundNo         String   @unique
  requestedAmountFen  Int
  approvedAmountFen   Int?
  reason              String
  status              String   @default("pending")
  // pending / approved / rejected / processing / completed / failed
  wechatRefundId      String?  @unique
  approvedByAdminId   BigInt?
  completedAt         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  order ShopOrder @relation(fields: [orderId], references: [id])

  @@index([orderId, status])
}
```

第一阶段只支持整单退款。部分退款和按订单项退款放到后续版本，避免金额和库存回滚规则过早复杂化。

---

## 6. 库存方案

PostgreSQL 是库存事实来源，Redis 只用于缓存、限流或短期任务，不作为库存主数据。

### 6.1 创建订单

在一个数据库事务中：

1. 查询并锁定商品记录；
2. 校验商品处于上架状态；
3. 校验库存满足购买数量；
4. 增加 `reservedStock`；
5. 创建订单和订单项快照；
6. 创建有效期，例如 15 分钟；
7. 返回订单。

任何一步失败都回滚。

### 6.2 支付成功

在幂等事务中：

1. 校验微信回调金额等于订单金额；
2. 校验订单仍为待支付；
3. `reservedStock -= quantity`；
4. `soldStock += quantity`；
5. 更新支付记录和订单状态；
6. 发送待发货通知。

### 6.3 未支付取消

定时任务扫描过期订单：

```text
pending_payment + expiresAt < now
→ cancelled
→ reservedStock -= quantity
```

取消操作必须幂等，避免重复释放库存。

---

## 7. 支付方案

第一阶段采用微信支付 V3 小程序支付。

流程：

```text
创建订单
  ↓
POST /shop/orders/:id/payment
  ↓
服务端生成 outTradeNo 并调用微信统一下单
  ↓
返回小程序支付参数
  ↓
小程序 wx.requestPayment
  ↓
微信回调 /api/v1/shop/webhooks/wechat-pay
  ↓
验签、校验金额、幂等更新订单
```

必须实现：

- 微信支付回调验签；
- 回调金额校验；
- 重复回调幂等；
- 支付超时关闭；
- 定期查询微信订单状态；
- 支付订单对账；
- 私钥和证书只放服务端环境或密钥系统。

第一阶段不实现自动分账。支付资金先进入平台账户，商城只记录订单和应收数据。待商家模式、退款规则和财务流程稳定后，再单独设计分账模块。

**当前实现状态（2026-09-23）：** 支付适配器尚未实现真实微信 V3 请求；预下单和退款调用失败关闭，回调验签固定失败。完成商户证书、API v3 密钥、通知 URL、沙箱或受控小额交易联调并通过重复通知测试前，不视为支付闭环完成或具备生产条件。

---

## 8. 订单状态机

```text
pending_payment
├── paid
│   └── processing
│       └── shipped
│           └── completed
└── cancelled

paid / processing / shipped
└── refunding
    ├── refunded
    └── partially_refunded
```

状态变更必须集中在订单服务中，禁止控制器直接修改状态。

每次关键状态变化建议写入订单状态日志，至少记录：

- 订单 ID；
- 原状态；
- 新状态；
- 操作者类型和 ID；
- 操作原因；
- 创建时间。

---

## 9. API 设计

### 9.1 用户端

```text
GET    /shop/categories
GET    /shop/products
GET    /shop/products/:id
GET    /shop/cart
POST   /shop/cart/items
PATCH  /shop/cart/items/:id
DELETE /shop/cart/items/:id
GET    /shop/orders
POST   /shop/orders
GET    /shop/orders/:id
POST   /shop/orders/:id/payment
POST   /shop/orders/:id/cancel
POST   /shop/orders/:id/refunds
```

### 9.2 支付回调

```text
POST /shop/webhooks/wechat-pay
```

回调接口不使用普通用户 JWT，使用微信支付签名验证。

### 9.3 平台管理端

```text
GET    /admin/shop/categories
POST   /admin/shop/categories
PUT    /admin/shop/categories/:id
GET    /admin/shop/products
POST   /admin/shop/products
PUT    /admin/shop/products/:id
POST   /admin/shop/products/:id/publish
POST   /admin/shop/products/:id/unpublish
GET    /admin/shop/orders
GET    /admin/shop/orders/:id
POST   /admin/shop/orders/:id/ship
GET    /admin/shop/refunds
POST   /admin/shop/refunds/:id/approve
POST   /admin/shop/refunds/:id/reject
```

金额由服务端根据商品当前数据计算，客户端只提交商品 ID、数量和收货信息。

---

## 10. 小程序与管理后台

### 10.1 小程序第一阶段

```text
pages/shop/index
pages/shop/list
pages/shop/detail
pages/shop/cart
pages/shop/checkout
pages/shop/orders
pages/shop/order-detail
```

第一阶段不增加独立底部 Tab，商城从首页入口进入，避免改动现有主导航。

### 10.2 管理后台第一阶段

```text
views/shop/category.vue
views/shop/product.vue
views/shop/order.vue
views/shop/refund.vue
```

复用现有上传组件、请求封装、管理员权限和 Element Plus 表格/表单。

---

## 11. 安全要求

- 金额、库存、商品状态全部服务端校验；
- 商品详情只返回已上架且未删除商品；
- 订单详情必须校验当前用户归属；
- 后台所有写操作记录 `AuditLog`；
- 收货地址、手机号、银行账户等敏感信息加密或脱敏；
- 资质文件不得使用永久公开 URL；
- 支付回调必须验签和幂等；
- 退款金额不得超过已支付未退款金额；
- 商品上传限制文件大小、格式和魔数；
- 增加创建订单、支付、退款接口限流；
- 生产环境禁止使用默认数据库密码和弱 JWT 密钥。

---

## 12. 实施阶段

### 阶段一：平台自营交易闭环

**状态：** 核心页面与 API 已实现；真实支付、异常恢复和生产验收仍未完成。具体门禁见[后续计划](plans/2026-09-24-shop-next-stage-plan.md)及[上线检查清单](GO_LIVE_CHECKLIST.md)。

1. Prisma 商品、分类、购物车、订单、支付、退款模型；
2. 商品和分类管理 API；
3. 商品列表和详情 API；
4. 购物车 API；
5. 下单事务和库存预留；
6. 未支付订单取消任务；
7. 微信支付创建和回调；
8. 管理后台发货；
9. 基础退款；
10. 小程序页面；
11. API 集成测试和支付回调测试。

以上是阶段范围，不代表每项均已通过真实环境验证。尤其第 7、11 项在微信支付 V3 接通并完成受控联调前仍未验收。

### 阶段二：虚拟兑换码

**状态：** 暂缓。只有自营实物交易稳定，且业务确认兑换码商品存在明确需求后再启动。

- `VirtualAsset` 模型；
- 支付成功后自动发放；
- 兑换、过期和重复领取控制；
- 虚拟商品退款策略。

### 阶段三：第三方商家

**状态：** 暂缓。启动前须确认商家主体、商品归属、售后责任、应收台账及财务流程；商家身份优先复用 `Partner` / `PartnerMember`。

- 复用 `Partner` 和 `PartnerMember`；
- 商家商品和订单数据隔离；
- 商家资质审核；
- 商家收入台账；
- 订单完成后生成应收记录。

### 阶段四：分账和结算

**状态：** 暂缓。不得在商家准入、退款冲正和对账规则确定前实现自动分账或提现。

- 微信分账接收方；
- 分账请求和重试；
- 退款冲正；
- 对账；
- 提现和财务审核。

---

## 13. 验收标准

### 交易闭环

- 用户能浏览上架商品；
- 用户能加入、修改和删除购物车商品；
- 订单创建时不能超卖；
- 订单金额由服务端计算；
- 微信支付回调重复请求不会重复扣库存；
- 未支付订单能自动取消并释放库存；
- 管理员能发货并填写物流单号；
- 用户只能查看自己的订单；
- 退款不会超过已支付金额；
- 退款重复回调不会重复退款。

### 工程质量

- `pnpm -r type-check` 通过；
- API 和 Admin 构建通过；
- 核心服务有集成测试；
- 数据库迁移可重复执行；
- 生产配置无默认密码和默认密钥；
- 支付、订单、库存、退款关键操作有审计日志。

---

## 14. 当前实现基线与推进门禁

| 能力 | 当前状态 | 说明 |
|---|---|---|
| 商品、分类、购物车、下单与库存预留 | 已实现，需持续回归 | PostgreSQL 为库存事实来源，金额以分存储 |
| 小程序结算、订单查询与后台发货 | 已实现，需真实环境验收 | 受控试运营前需核对完整用户流程与部署配置 |
| 退款申请、审批与状态处理 | 已实现基础流程，异常恢复待补 | 微信退款适配器未实现；外部调用失败/未知结果需要恢复与核对机制 |
| 微信支付 V3 下单、通知验签解密、退款请求 | 未实现 | 当前适配器失败关闭；不具备真实收款/退款能力 |
| 支付迟到通知与订单过期关单竞态 | 未完成 | 订单过期释放库存后若收到成功支付通知，须有补偿、告警和人工核查路径 |
| Prisma 商城迁移与部署验证 | 待核实/验收 | 对照当前 schema、已提交迁移及目标数据库状态，禁止未经审查直接迁移共享或生产库 |
| SKU、虚拟履约、第三方商家、分账 | 暂缓 | 需求确认并通过阶段门禁后单独设计 |

**真实交易开放条件：** 迟到支付与退款异常具备可恢复处理；数据库迁移经过审查并完成备份/恢复准备；真实支付适配器完成签名、回调、金额校验和幂等测试；测试商户或受控小额交易通过；上线检查清单全部满足。

**文档状态规则：** “已实现”只描述代码存在；“已验证”须有自动化测试或可复现验收记录；“已上线”须有部署环境证据。不得仅凭页面/API 存在就将支付或退款记为生产可用。

## 15. 架构决策记录

### ADR-001：继续使用模块化单体

**决定**：商城继续放在现有 NestJS API 中。  
**原因**：当前业务规模和团队规模不足以支撑微服务的运维成本。  
**重新评估条件**：商城需要独立扩缩容、多人独立交付或消息处理量明显增长。

### ADR-002：第一阶段限制单商家订单

**决定**：购物车只允许同一商家商品参与一次结算；第一阶段平台自营。  
**原因**：避免父子订单、统一支付、拆单发货和分账复杂度。  
**重新评估条件**：第三方商家上线且确实需要跨店购物车。

### ADR-003：PostgreSQL 作为库存事实来源

**决定**：库存预留和扣减以数据库事务为准，Redis 不保存库存主状态。  
**原因**：订单、支付和退款需要可恢复、可审计的一致数据。  
**重新评估条件**：数据库库存更新成为明确的性能瓶颈，并已有可靠的库存账本和对账机制。

### ADR-004：第一阶段不做自动分账

**决定**：平台先收款，商城只记录订单和后续应收数据。  
**原因**：分账与退款、售后、财务对账强耦合，过早引入会放大支付风险。  
**重新评估条件**：商家资质、财务规则和退款流程稳定后。
