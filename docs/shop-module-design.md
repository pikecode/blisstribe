# BlissTribe 商城模块设计文档

**日期**: 2026-09-21  
**版本**: 1.0  
**作者**: 设计阶段  
**状态**: 历史初稿，已被 `docs/shop-module-design-optimized.md` 取代

> 本文记录商城模块最初的完整目标设想，不再作为开发、验收或上线依据。原文中的独立 `Shop` 商家主体、浮点金额、Redis 库存/购物车、加购预占库存、自动分账和“已完成”标记均未获现行方案认可，部分内容与当前实现及安全要求冲突。后续开发以优化版设计和对应实施计划为准；本文仅保留作需求演进背景。

---

## 一、需求概览

### 1.1 项目背景

BlissTribe 现有系统支持场地管理、活动分析、用户关系等功能。新增商城模块旨在为平台提供完整的电商能力，支持实物商品销售和虚拟服务预订。

### 1.2 核心需求

**融合型商城**：
- 实物商品：如纪念品、运动装备、场地用品等（需库存管理）
- 虚拟服务：如课程预订、场地租赁套餐、优惠券等（自动履约）
- 商品可由平台自营或第三方商家入驻销售

**商家模式**：
- 支持场地方、教练等第三方商家入驻
- 商家可管理自己的商品、订单、收入
- 平台进行商家资质审核和管理

**支付体系**：
- 微信支付（小程序原生）
- 支持分账（订单金额自动分配给商家）
- 平台收取手续费或佣金

**订单与履约**：
- 实物商品：库存管理 + 两种发货方式（自动履约/商家线下发货）
- 虚拟服务：订单支付即时生效（无需库存）
- 虚拟服务与现有活动/场地系统独立

**售后**：
- 支持退款流程（包括虚拟商品）
- 退货审核

**用户体验**：
- 基础商城功能（商品列表、购物车、下单）
- 商品推荐、分类、搜索、筛选
- 个性化推荐（可选，后期迭代）

---

## 二、架构设计

### 2.1 系统架构

```
Backend (NestJS)
├── Core Modules
│   ├── shop.module              # 商城核心
│   ├── product.module (shop)    # 商品管理
│   ├── order.module             # 订单管理
│   ├── cart.module              # 购物车
│   ├── payment.module           # 支付与分账
│   └── promotion.module         # 推荐、分类、搜索
├── Admin Modules
│   ├── shop-admin.module        # 商家中心后台
│   ├── seller-audit.module      # 商家资质审核
│   └── settlement.module        # 分账结算
└── Shared Services
    ├── WechatPayService         # 微信支付集成
    ├── InventoryService         # 库存管理
    └── NotificationService      # 消息通知

Frontend - MiniApp (UniApp)
├── pages/shop/
│   ├── home                     # 商城首页
│   ├── list                     # 商品列表
│   ├── detail                   # 商品详情
│   ├── cart                     # 购物车
│   ├── checkout                 # 结算页
│   ├── orders                   # 订单列表
│   └── order-detail             # 订单详情
└── components/shop/
    ├── ProductCard
    ├── CartItem
    └── OrderStatus

Frontend - Admin (Vue 3 + Element Plus)
├── views/shop/
│   ├── product-manage           # 商品管理
│   ├── order-manage             # 订单管理
│   ├── seller-audit             # 商家审核
│   ├── settlement               # 分账结算
│   └── analytics                # 商城数据分析
```

### 2.2 权限隔离

| 角色 | 权限范围 |
|------|---------|
| **平台管理员** | 全局可见所有数据、审核商家、管理分账、设置平台规则 |
| **商家** | 仅查看/编辑自己的商品、订单、收入数据 |
| **消费者** | 浏览商品、下单、评价、查看自己的订单 |
| **访客** | 浏览公开商品信息 |

### 2.3 数据隔离策略

所有商城数据通过 `shopId`（商家ID）进行隔离：
- 商品表：`shopId` + `productId` 唯一索引
- 订单表：`shopId` 用于隔离，`userId` 用于消费者查询
- 收入结算：按 `shopId` 汇总统计

查询时自动过滤：商家用户只能看到 `shopId = currentUserId` 的数据。

---

## 三、数据模型

### 3.1 核心表设计

#### **Shop（商家）**

```prisma
model Shop {
  id              BigInt    @id @default(autoincrement())
  ownerId         BigInt    @unique  // 商家主账号
  name            String             // 店铺名称
  description     String?            // 店铺描述
  avatar          String?            // 店铺头像
  
  // 资质信息
  businessType    String    // "individual" | "enterprise"
  licenseNo       String?   // 营业执照号
  licenseImg      String?   // 营业执照
  licenseStatus   String    @default("pending")  // "pending" | "approved" | "rejected"
  licenseRejectReason String?
  
  // 结算信息
  bankAccount     String?
  bankName        String?
  bankAccountName String?
  wechatMchId     String?   // 微信商户号（用于分账）
  settlementRate  Float     @default(0.98)  // 商家实际结算比例（如98%，平台收2%）
  
  status          String    @default("pending")  // "pending" | "active" | "suspended" | "closed"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  owner           User      @relation(fields: [ownerId], references: [id])
  products        ShopProduct[]
  orders          ShopOrder[]
  settlements     Settlement[]
  
  @@index([status])
  @@index([createdAt])
}
```

#### **ShopProduct（商品）**

```prisma
model ShopProduct {
  id              BigInt    @id @default(autoincrement())
  shopId          BigInt
  
  // 基础信息
  name            String
  description     String?
  images          String[]  // 多张商品图
  category        String    // 分类 code（与 ShopCategory 关联）
  
  // 商品类型
  type            String    // "physical" | "virtual"
  virtualType     String?   // 仅当 type=virtual，值为 "course" | "voucher" | "rental"
  
  // 价格与库存
  price           Float     // 售价（单位：元）
  costPrice       Float?    // 成本价（用于成本统计）
  stock           Int       // 仅 type=physical 时有效
  reserved        Int       @default(0)  // 已预订数量
  available       Int       // = stock - reserved - sold
  
  // 发货方式
  fulfillmentType String?   // 仅 type=physical："auto_virtual" | "manual_ship"
  // auto_virtual: 支付后自动发放虚拟商品代码
  // manual_ship: 商家线下打包发货
  
  // 虚拟商品特定
  virtualContent  String?   // 虚拟商品内容/代码/凭证
  validityDays    Int?      // 有效期天数
  
  // 推荐与排序
  featured        Boolean   @default(false)  // 是否推荐
  sortOrder       Int       @default(0)
  
  status          String    @default("active")  // "draft" | "active" | "inactive"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  shop            Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  cartItems       CartItem[]
  orderItems      ShopOrderItem[]
  
  @@unique([shopId, id])
  @@index([shopId, status])
  @@index([category])
  @@index([featured])
}
```

#### **ShopOrder（订单）**

```prisma
model ShopOrder {
  id              BigInt    @id @default(autoincrement())
  orderNo         String    @unique  // 订单号
  shopId          BigInt
  userId          BigInt    // 消费者
  
  // 金额
  totalAmount     Float     // 订单总金额
  discountAmount  Float     @default(0)
  paymentAmount   Float     // 实际支付金额
  
  // 订单状态
  status          String    @default("pending_payment")
  // pending_payment -> paid -> processing -> fulfilled -> completed | refunding -> refunded
  paymentStatus   String    @default("unpaid")  // "unpaid" | "paid"
  fulfillmentStatus String  @default("pending")  // "pending" | "shipped" | "delivered" | "completed"
  
  // 支付信息
  paymentMethod   String    @default("wechat_pay")  // 微信支付
  wechatTradeNo   String?   // 微信交易号
  paidAt          DateTime?
  
  // 虚拟商品自动履约
  automatedAt     DateTime? // 虚拟商品发放时间
  
  // 配送地址（仅实物）
  shippingAddress String?
  shippingPhone   String?
  trackingNo      String?   // 物流单号
  
  // 备注
  remark          String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  shop            Shop      @relation(fields: [shopId], references: [id])
  user            User      @relation(fields: [userId], references: [id])
  items           ShopOrderItem[]
  payments        Payment[]
  refunds         Refund[]
  
  @@index([shopId, status])
  @@index([userId, createdAt])
  @@index([paymentStatus])
}
```

#### **ShopOrderItem（订单项）**

```prisma
model ShopOrderItem {
  id              BigInt    @id @default(autoincrement())
  orderId         BigInt
  productId       BigInt
  
  // 快照（订单生成时保存商品信息）
  productName     String
  productPrice    Float
  quantity        Int
  subtotal        Float     // = productPrice * quantity
  
  // 虚拟商品激活码
  activationCode  String?   // 虚拟商品发放的激活码
  activatedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  
  order           ShopOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product         ShopProduct @relation(fields: [productId], references: [id])
  
  @@index([orderId])
}
```

#### **Cart（购物车）**

```prisma
model Cart {
  id              BigInt    @id @default(autoincrement())
  userId          BigInt    @unique
  
  items           CartItem[]
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CartItem {
  id              BigInt    @id @default(autoincrement())
  cartId          BigInt
  productId       BigInt
  quantity        Int
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  cart            Cart      @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product         ShopProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([cartId, productId])
}
```

#### **Payment（支付记录）**

```prisma
model Payment {
  id              BigInt    @id @default(autoincrement())
  orderId         BigInt
  
  wechatTradeNo   String    @unique
  totalAmount     Float     // 支付金额
  status          String    @default("pending")  // "pending" | "success" | "failed" | "refunded"
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  order           ShopOrder @relation(fields: [orderId], references: [id])
}
```

#### **Refund（退款记录）**

```prisma
model Refund {
  id              BigInt    @id @default(autoincrement())
  orderId         BigInt
  
  reason          String    // 退款原因
  amount          Float     // 退款金额
  status          String    @default("pending")  // "pending" | "approved" | "rejected" | "completed"
  
  // 虚拟商品退款政策
  requiresApproval Boolean  // 虚拟商品是否需要审核
  approvedAt      DateTime?
  approvedBy      BigInt?   // 审核人（平台管理员）
  
  wechatRefundNo  String?   // 微信退款单号
  completedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  order           ShopOrder @relation(fields: [orderId], references: [id])
  approver        User?     @relation(fields: [approvedBy], references: [id])
}
```

#### **Settlement（分账结算）**

```prisma
model Settlement {
  id              BigInt    @id @default(autoincrement())
  shopId          BigInt
  
  period          String    // "2026-09" 结算周期
  totalSales      Float     // 总销售额
  refundAmount    Float     // 退款总额
  platformFee     Float     // 平台手续费
  settleAmount    Float     // = totalSales - refundAmount - platformFee
  
  status          String    @default("pending")  // "pending" | "processing" | "completed"
  processedAt     DateTime?
  
  createdAt       DateTime  @default(now())
  
  shop            Shop      @relation(fields: [shopId], references: [id])
  
  @@unique([shopId, period])
}
```

#### **ShopCategory（商品分类）**

```prisma
model ShopCategory {
  id              BigInt    @id @default(autoincrement())
  code            String    @unique
  name            String
  description     String?
  icon            String?
  sortOrder       Int       @default(0)
  
  status          String    @default("active")
  createdAt       DateTime  @default(now())
  
  @@index([sortOrder])
}
```

### 3.2 数据关系图

```
User (用户)
├── owns: Shop (一个用户可开一家店)
├── orders: ShopOrder (购物者)
├── cart: Cart (购物车)
└── settled: Settlement (审核者)

Shop (商家)
├── products: ShopProduct[]
├── orders: ShopOrder[]
└── settlements: Settlement[]

ShopProduct
├── cartItems: CartItem[]
└── orderItems: ShopOrderItem[]

ShopOrder
├── items: ShopOrderItem[]
├── payments: Payment[]
└── refunds: Refund[]
```

---

## 四、支付与分账体系

### 4.1 微信支付流程

```
小程序用户
  ↓ 提交订单
API: POST /shop/orders
  ↓ 创建订单记录 + 库存预留
API: POST /shop/orders/{id}/payment
  ↓ 调用微信统一下单接口
微信支付 API
  ↓ 返回 prepay_id
小程序: wx.requestPayment()
  ↓ 用户支付
微信支付: 回调 notify_url
  ↓ 验证签名 + 更新订单状态
API: 标记订单已支付 → 触发履约
  ├─ 实物: 等待商家发货
  └─ 虚拟: 自动发放激活码
```

### 4.2 分账机制

**分账时机**：订单支付成功后，立即发起分账请求

**分账逻辑**：
```
总金额 = 100 元
├─ 商家所得 = 100 × 98% = 98 元（settlementRate = 0.98）
└─ 平台收入 = 100 × 2% = 2 元
```

**分账对象**：
- 商家微信商户号（`wechatMchId`）
- 平台主账户（配置在环境变量）

**实现**：
- 调用微信支付 API：`请求分账接口` → 分配资金到商家账户
- 状态追踪：记录分账请求 ID、状态，定期查询结果
- 失败重试：分账失败时存入队列，定期重试

### 4.3 结算与提现

**月度结算**（每月初）：
1. 统计上月所有订单的销售额、退款额、手续费
2. 计算 `settleAmount = totalSales - refundAmount - platformFee`
3. 生成 `Settlement` 记录，状态 = `pending`
4. 通知商家

**商家提现**：
- 商家申请提现时，关联 Settlement 记录
- 后台审核 → 标记为 `processing`
- 通过平台银行系统转账到商家银行账户
- 标记为 `completed`

---

## 五、业务流程

### 5.1 消费者下单流程

```
1. 浏览商品
   GET /shop/products?category=xxx&search=yyy
   
2. 加入购物车
   POST /shop/cart/items
   Body: { productId, quantity }
   
3. 查看购物车
   GET /shop/cart
   
4. 结算
   POST /shop/orders
   Body: { cartItems: [], shippingAddress, ... }
   Response: { orderId, totalAmount }
   
5. 发起支付
   POST /shop/orders/{orderId}/payment
   Response: { prepayId, ... }
   
6. 微信支付（小程序调用）
   wx.requestPayment({ prepayId })
   
7. 支付回调（后台）
   微信 POST /shop/webhooks/payment-notify
   ├─ 验证签名
   ├─ 更新订单状态 = "paid"
   ├─ 库存扣减
   └─ 触发履约 (实物待发货 / 虚拟自动发放)
   
8. 查询订单
   GET /shop/orders/{orderId}
```

### 5.2 商家管理流程

```
1. 商家注册与资质审核
   POST /shop/sellers/register
   Body: { name, businessType, licenseNo, licenseImg, bankInfo }
   
2. 后台审核（平台管理员）
   PATCH /admin/sellers/{shopId}/audit
   Body: { status: "approved" | "rejected", reason }
   
3. 商品管理
   POST /admin/shop/products (创建)
   PATCH /admin/shop/products/{id} (编辑)
   DELETE /admin/shop/products/{id} (删除)
   
4. 订单管理
   GET /admin/shop/orders?status=xxx
   PATCH /admin/shop/orders/{id}
   Body: { trackingNo, fulfillmentStatus }
   
5. 收入查询与提现
   GET /admin/shop/settlements
   POST /admin/shop/withdrawals (申请提现)
   
6. 平台后台结算管理
   GET /admin/settlements?period=2026-09
   PATCH /admin/settlements/{id}/process
```

### 5.3 退款流程

```
消费者申请退款
  ↓ POST /shop/orders/{orderId}/refunds
  Body: { reason }
  
退款记录创建 (status = pending)
  ├─ 虚拟商品: requiresApproval = true (需要审核)
  └─ 实物商品: requiresApproval = false (自动通过)
  
平台审核（虚拟商品）
  ↓ PATCH /admin/refunds/{refundId}
  Body: { status: "approved" | "rejected" }
  
调用微信退款接口
  ↓ 向用户账户退款
  
更新订单状态 = "refunded"
  ↓ 释放库存（如果有）
  
完成
```

---

## 六、API 设计概览

### 6.1 消费者端 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/shop/products` | GET | 获取商品列表（分类、搜索、筛选） |
| `/shop/products/{id}` | GET | 获取商品详情 |
| `/shop/cart` | GET | 获取购物车 |
| `/shop/cart/items` | POST | 添加购物车项 |
| `/shop/cart/items/{itemId}` | PATCH | 更新购物车项（数量） |
| `/shop/cart/items/{itemId}` | DELETE | 删除购物车项 |
| `/shop/orders` | GET | 获取我的订单列表 |
| `/shop/orders` | POST | 创建订单 |
| `/shop/orders/{id}` | GET | 获取订单详情 |
| `/shop/orders/{id}/payment` | POST | 发起支付 |
| `/shop/orders/{id}/refunds` | POST | 申请退款 |

### 6.2 商家后台 API（需认证 + shopId 隔离）

| 端点 | 方法 | 功能 |
|------|------|------|
| `/admin/shop/products` | GET/POST | 商品列表、创建 |
| `/admin/shop/products/{id}` | PATCH/DELETE | 编辑、删除商品 |
| `/admin/shop/orders` | GET | 订单列表（已过滤为商家自己的） |
| `/admin/shop/orders/{id}` | PATCH | 更新发货信息 |
| `/admin/shop/settlements` | GET | 收入与结算查询 |
| `/admin/shop/withdrawals` | GET/POST | 提现申请 |

### 6.3 平台管理员 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/admin/sellers` | GET | 商家列表 |
| `/admin/sellers/{shopId}/audit` | PATCH | 审核商家资质 |
| `/admin/settlements` | GET | 全局结算数据 |
| `/admin/refunds` | GET | 全局退款审核 |
| `/admin/refunds/{refundId}` | PATCH | 审核退款 |

---

## 七、技术实现方案

### 7.1 库存管理

**方案**：Redis 缓存 + 数据库持久化

```typescript
// Redis key: shop:product:{productId}:stock
// 内容: { total, reserved, sold, available }

// 添加购物车（预留库存）
Redis.INCR(shop:product:{id}:reserved)

// 支付成功（扣减库存）
Redis.DECR(shop:product:{id}:reserved)
Redis.INCR(shop:product:{id}:sold)

// 定期同步到数据库
// 每小时或按需 + 订单完成时
```

### 7.2 购物车实现

**方案**：Redis Hash + 数据库备份

```typescript
// Redis key: user:cart:{userId}
// value: { productId: quantity, ... }

// 优点：快速读写、支持购物车过期（30天）
// 缺点：Redis 故障时需要从数据库恢复

// 消费者端实现：点击结算时从 Redis 读取 → 验证库存 → 创建订单
```

### 7.3 推荐与搜索

**推荐逻辑**（v1 简化版）：
- 热销商品：按订单量排序
- 新品：按 `createdAt` 排序
- 推荐位：由商家或平台设置 `featured` 标志

**搜索与筛选**：
- Elasticsearch（可选，初期用 PostgreSQL LIKE + 索引）
- 支持按分类、名称、价格范围筛选

### 7.4 消息通知

**事件**：
- 订单支付成功 → 通知商家
- 订单发货 → 通知消费者
- 退款申请 → 通知商家 + 平台管理员
- 月度结算 → 通知商家

**实现**：Redis 事件队列 + 后台 Worker，或使用第三方服务（如企业微信、钉钉）

---

## 八、前端设计概览

### 8.1 小程序端

**页面结构**：
```
ShopHome (首页)
├─ 搜索栏 + 分类导航
├─ 推荐商品轮播
├─ 分类商品列表
└─ 底部导航 (首页 / 分类 / 购物车 / 我的订单)

ProductList (商品列表)
├─ 筛选器 (分类 / 价格 / 评分)
└─ 商品卡片列表 (图片 / 名称 / 价格 / 加入购物车)

ProductDetail (商品详情)
├─ 图片轮播
├─ 名称 / 价格 / 库存 / 描述
├─ 规格选择
└─ 购买按钮 (加入购物车 / 立即购买)

Cart (购物车)
├─ 购物车项列表
├─ 删除 / 修改数量
├─ 合计金额
└─ 结算按钮

Checkout (结算页)
├─ 订单确认
├─ 配送地址（实物）
├─ 优惠券（可选）
├─ 总金额
└─ 支付按钮

OrderList (我的订单)
├─ 订单列表 (按状态筛选)
├─ 订单卡片 (订单号 / 金额 / 状态 / 操作)
└─ 订单详情 / 追踪物流 / 退款

Seller (商家中心)
├─ 店铺信息
├─ 商品管理
├─ 订单管理
├─ 收入统计
└─ 提现申请
```

### 8.2 后台管理端

**模块**：
- 商品管理：CRUD 商品、库存、分类
- 订单管理：订单列表、发货管理、退款审核
- 商家审核：资质审核、店铺管理、禁用/停用
- 财务结算：分账查询、月度结算、提现审核
- 数据分析：销售趋势、商家排行、退款率统计

---

## 九、开发阶段与迭代

### 9.1 第一阶段（MVP）

**原始目标（不是当前完成状态）**：
- 商品管理（自营）
- 购物车 + 下单
- 微信支付
- 订单查询与发货跟踪
- 简单推荐与分类
- 虚拟商品履约（原计划可选）

**预计工期**：4-6 周

### 9.2 第二阶段

**原始目标（不是当前完成状态）**：
- 商家入驻 + 资质审核
- 分账与结算
- 退款流程
- 商家后台

**预计工期**：3-4 周

### 9.3 第三阶段（可选）

**运营功能**：
- 优惠券 / 秒杀 / 拼团
- 个性化推荐
- 评价与反馈
- 商家排行榜

---

## 十、技术栈与依赖

### 后端

- **框架**：NestJS 10.x
- **ORM**：Prisma 5.x
- **缓存**：Redis (ioredis)
- **支付**：Wechat Pay API (微信官方 SDK)
- **消息**：事件驱动 / Redis Queue (可选 Bull)
- **上传**：Sharp (图片处理)

### 前端 - 小程序

- **框架**：UniApp + Vue 3
- **状态管理**：Pinia
- **API 请求**：Axios

### 前端 - 后台

- **框架**：Vue 3 + Element Plus
- **图表**：ECharts
- **状态管理**：Pinia

---

## 十一、风险与缓解

| 风险 | 影响 | 缓解方案 |
|------|------|---------|
| **微信支付分账延迟** | 商家结算不及时 | 实现异步分账 + 重试机制 + 定期对账 |
| **库存超卖** | 订单无法履约 | 使用 Redis 原子操作 + 分布式锁 |
| **虚拟商品滥用** | 退款欺诈 | 虚拟商品需审核才能退、添加防作弊逻辑 |
| **商家数据隐私** | 数据泄露 | 严格的行级权限控制 + 审计日志 |
| **支付回调丢失** | 订单无法确认 | 实现幂等性 + 定期对账 |

---

## 十二、原始目标成功标准（未代表当前验收）

- 消费者可完整下单、支付、收货
- 虚拟商品自动发放
- 商家后台可独立管理
- 分账与结算准确
- 退款流程完整
- 测试覆盖率 ≥ 80%
- 无重大安全漏洞

---

**文档处置**：本初稿已由 `docs/shop-module-design-optimized.md` 取代。后续执行请查看该文档引用的实施计划，不再依据本节启动开发。
