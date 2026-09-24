# 商城数据库设计

## 概述

本文档描述 BlissTribe 商城第一阶段的数据库设计。

商城模块包含 8 个核心表，构成"商品 → 购物车 → 订单 → 支付 → 退款"的完整交易闭环。

## 表关系图

```
User (用户)
├── ShopCart (1:1 购物车)
│   └── ShopCartItem[] (1:多 购物车项)
│       └── ShopProduct (多:1 商品)
└── ShopOrder[] (1:多 订单)
    ├── ShopOrderItem[] (1:多 订单项)
    │   └── ShopProduct (多:1 商品快照)
    ├── ShopPayment[] (1:多 支付记录)
    └── ShopRefund[] (1:多 退款记录)

ShopCategory (分类) (1:多)→ ShopProduct
```

## 数据模型详解

### 1. ShopCategory（商品分类）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| code | String | 分类编码（唯一） |
| name | String | 分类名称 |
| sortOrder | Int | 排序字段，默认 0 |
| status | Int | 0=停用 1=启用，默认 1 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**索引：** `sortOrder`

### 2. ShopProduct（商品）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| categoryId | BigInt | 分类 ID（外键） |
| name | String | 商品名称 |
| description | String\| | 商品描述（可选） |
| images | String[] | 图片 URL 数组 |
| priceFen | Int | 单价，单位：分 |
| totalStock | Int | 总库存，默认 0 |
| reservedStock | Int | 已预留库存，默认 0 |
| soldStock | Int | 已销售库存，默认 0 |
| status | Int | 0=草稿 1=上架 2=下架，默认 0 |
| sortOrder | Int | 排序字段，默认 0 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |
| deletedAt | DateTime\| | 软删除时间（可选） |

**索引：**
- `(categoryId, status, sortOrder)`
- `(status, createdAt)`

**库存计算：**
```
availableStock = totalStock - reservedStock - soldStock
```

不单独保存 `available` 字段，避免冗余字段失真。

### 3. ShopCart（购物车）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| userId | BigInt | 用户 ID（唯一，1:1） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**外键关系：** `User(id)` - 级联删除

**说明：** 购物车和用户是 1:1 关系。每个用户最多有一个购物车。购物车不预留库存，库存只在订单创建时预留。

### 4. ShopCartItem（购物车项）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| cartId | BigInt | 购物车 ID（外键） |
| productId | BigInt | 商品 ID（外键） |
| quantity | Int | 数量 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**外键关系：**
- `ShopCart(id)` - 级联删除
- `ShopProduct(id)` - 级联更新

**约束：** `UNIQUE(cartId, productId)` - 每个购物车中每个商品最多一条记录

**索引：** `cartId`

### 5. ShopOrder（订单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| orderNo | String | 订单号（唯一） |
| userId | BigInt | 用户 ID（外键） |
| status | String | 订单状态，默认 "pending_payment" |
| paymentStatus | String | 支付状态，默认 "unpaid" |
| fulfillmentStatus | String | 履约状态，默认 "pending" |
| totalAmountFen | Int | 订单总金额（分） |
| discountAmountFen | Int | 优惠金额（分），默认 0 |
| paymentAmountFen | Int | 应支付金额（分） |
| refundedAmountFen | Int | 已退款金额（分），默认 0 |
| receiverName | String\| | 收货人名称（可选） |
| receiverPhone | String\| | 收货人电话（可选，敏感信息） |
| shippingAddress | String\| | 收货地址（可选，敏感信息） |
| trackingNo | String\| | 物流单号（可选） |
| remark | String\| | 备注（可选） |
| expiresAt | DateTime | 订单过期时间（通常 15 分钟后） |
| paidAt | DateTime\| | 支付时间（可选） |
| shippedAt | DateTime\| | 发货时间（可选） |
| completedAt | DateTime\| | 完成时间（可选） |
| cancelledAt | DateTime\| | 取消时间（可选） |
| cancelReason | String\| | 取消原因（可选） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**外键关系：** `User(id)` - 级联更新

**索引：**
- `(userId, createdAt)` - 用户订单查询
- `(status, expiresAt)` - 过期订单扫描
- `paymentStatus` - 支付状态查询

**订单状态流转：**
```
pending_payment (待支付)
├── paid (已支付)
│   ├── processing (处理中)
│   │   └── shipped (已发货)
│   │       └── completed (已完成)
│   └── refunding / refunded (退款中/已退款)
└── cancelled (已取消)
```

### 6. ShopOrderItem（订单项）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| orderId | BigInt | 订单 ID（外键） |
| productId | BigInt | 商品 ID（外键，用于追溯）|
| productName | String | 商品名称（快照） |
| productImage | String\| | 商品图片（快照，可选） |
| unitPriceFen | Int | 单价（分，快照） |
| quantity | Int | 数量 |
| subtotalFen | Int | 小计（分） |
| createdAt | DateTime | 创建时间 |

**外键关系：**
- `ShopOrder(id)` - 级联删除
- `ShopProduct(id)` - 级联更新

**说明：** 订单项必须保存商品快照，商品后续改名、改价不能影响历史订单。

**索引：** `orderId`

### 7. ShopPayment（支付记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| orderId | BigInt | 订单 ID（外键） |
| outTradeNo | String | 商户订单号（唯一） |
| wechatTransactionId | String\| | 微信交易号（唯一，可选） |
| prepayId | String\| | 微信预支付 ID（可选） |
| amountFen | Int | 支付金额（分） |
| status | String | 支付状态，默认 "pending" |
| paidAt | DateTime\| | 支付时间（可选） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**外键关系：** `ShopOrder(id)` - 级联更新

**索引：**
- `(orderId, status)` - 订单支付状态查询
- `outTradeNo` - 订单号查询

**说明：**
- `outTradeNo` 在发起支付时生成，唯一标识商户订单
- `wechatTransactionId` 在微信支付成功后写入
- 支付状态：pending / success / failed / closed / refunded
- 支付创建时不能要求已经存在微信交易号

### 8. ShopRefund（退款记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BigInt | 主键 |
| orderId | BigInt | 订单 ID（外键） |
| refundNo | String | 商户退款号（唯一） |
| outRefundNo | String | 微信退款号（唯一） |
| requestedAmountFen | Int | 申请退款金额（分） |
| approvedAmountFen | Int\| | 批准退款金额（分，可选） |
| reason | String | 退款原因 |
| status | String | 退款状态，默认 "pending" |
| wechatRefundId | String\| | 微信退款 ID（唯一，可选） |
| approvedByAdminId | BigInt\| | 批准管理员 ID（可选） |
| completedAt | DateTime\| | 完成时间（可选） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

**外键关系：** `ShopOrder(id)` - 级联更新

**索引：** `(orderId, status)` - 订单退款查询

**说明：**
- 第一阶段只支持整单退款，不支持部分退款
- 退款状态：pending / approved / rejected / processing / completed / failed
- 退款金额不得超过已支付未退款金额

## 金额存储规范

**所有金额字段均使用 `Int` 类型，单位为"分"。**

示例：
- 100 元 = 10000 分
- 0.01 元 = 1 分

**禁止使用 Float 类型存储金额，避免精度丢失。**

## 订单号生成

格式：`SHOP-{YYYYMMDDHHmmss}-{6位随机数}`

示例：`SHOP-20260921154530-123456`

生成规则：
1. 使用当前时间戳（14 位：YYYYMMDDHHmmss）
2. 追加 6 位随机大写字母/数字

## 库存预留机制

### 创建订单时

在单个数据库事务中：
1. 查询商品并锁定
2. 校验商品处于上架状态
3. 校验库存满足购买数量
4. 增加 `reservedStock`（预留库存）
5. 创建订单和订单项快照
6. 设置订单过期时间（15 分钟）

任何一步失败都回滚。

### 支付成功时

在幂等事务中：
1. 校验微信回调金额等于订单金额
2. 校验订单仍为待支付
3. `reservedStock -= quantity`（减少预留库存）
4. `soldStock += quantity`（增加销售库存）
5. 更新支付记录和订单状态

### 订单取消时

定时任务扫描过期订单：
```
订单状态 = pending_payment AND expiresAt < now
↓
取消订单
↓
reservedStock -= quantity（释放预留库存）
```

取消操作必须幂等，避免重复释放库存。

## 关键约束

1. **所有金额由服务端计算**，客户端只提交商品 ID 和数量
2. **订单详情必须校验 userId**，用户隔离
3. **商品详情只返回已上架（status=1）且未删除（deletedAt=null）的商品**
4. **支付回调必须验签、幂等和金额校验**
5. **退款金额不得超过已支付未退款金额**
6. **收货地址、手机号等敏感信息需加密存储或脱敏展示**

## 性能优化建议

### 已有索引

- `ShopProduct(categoryId, status, sortOrder)` - 商品列表查询
- `ShopProduct(status, createdAt)` - 新品上架查询
- `ShopOrder(userId, createdAt)` - 用户订单历史查询
- `ShopOrder(status, expiresAt)` - 过期订单扫描
- `ShopPayment(orderId, status)` - 订单支付状态查询
- `ShopRefund(orderId, status)` - 订单退款状态查询

### 可考虑的额外索引

- `ShopPayment(outTradeNo, status)` - 支付幂等性检查（已有 UNIQUE 约束）
- `ShopOrder(userId, status)` - 用户特定状态订单查询

### 缓存策略

- Redis 缓存已上架商品列表（1 小时过期）
- Redis 缓存商品详情（1 小时过期）
- Redis 缓存分类列表（6 小时过期）
- 不缓存库存数据，以数据库事务为准

## 迁移和版本管理

- 商城结构通过增量迁移 `20260924000100_add_shop_module_and_sync_schema` 创建；生产截至 2026-09-24 尚未应用该迁移。
- 旧 `0_init_shop_tables/migration.sql` 是重复的全库快照，不属于有效迁移基线，已从活动迁移目录移除。生产 migration history 不包含它；本地/其他环境如有该迁移记录，须单独核对和协调，禁止直接重置或伪造迁移状态。
- 所有迁移文件放在 `apps/api/prisma/migrations/` 目录
- 迁移由 Prisma `migrate deploy` 按历史顺序执行，不应假设 SQL 可重复执行。
- 新迁移已在空数据库全链路和生产 schema-only 副本验证；生产执行仍需备份恢复演练、SQL 审查、审批及维护窗口。

## 相关文档

- API 设计：见 `docs/shop-module-design-optimized.md` 第 9 节
- 实施计划：见 `docs/superpowers/plans/2026-09-21-shop-phase1.md`
