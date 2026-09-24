# 商城第一阶段闭环完善实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use this plan task-by-task with focused verification.

**Goal:** 完成平台自营实物商城的可靠交易闭环，阻止模拟支付进入生产，并使小程序与后端契约一致。

**Architecture:** 继续 NestJS 模块化单体和 PostgreSQL/Prisma。服务端计算金额；库存用条件更新与订单状态条件转换保证并发安全；支付适配器失败关闭；退款只支持整单并在外部调用前后持久化可恢复状态。

**Tech Stack:** NestJS、Prisma、PostgreSQL、微信支付 V3 适配层、UniApp/Vue 3、Jest。

**设计依据：** `docs/plans/2026-09-23-shop-module-completion-design.md`；商城范围以 `docs/shop-module-design-optimized.md` 为准。

---

### Task 1：修复订单创建与金额快照

**Files:**
- Modify: `apps/api/src/shop/order/order.service.ts`
- Modify: `apps/api/src/shop/dto/order.dto.ts`
- Test: `apps/api/src/shop/order/order.service.spec.ts`

**步骤：**
1. 为下单服务添加测试：忽略/拒绝客户端价格字段，依据商品当前价格计算总额；订单项保存商品名称、图片、单价和小计。
2. 先运行测试确认当前实现失败。
3. 合并重复商品 ID，校验数量为正整数，按商品 ID 稳定顺序锁定/条件更新库存；用更新影响行数判断库存不足。
4. 在同一事务创建订单和快照订单项，显式设置 `paymentAmountFen`、`discountAmountFen`、状态及过期时间。
5. 测试事务失败时不留下订单或预留库存，并验证用户购物车不会在失败时清空。

### Task 2：支付接口归属校验并失败关闭

**Files:**
- Modify: `apps/api/src/shop/order/order.controller.ts`
- Modify: `apps/api/src/shop/payment/payment.controller.ts`
- Modify: `apps/api/src/shop/payment/payment.service.ts`
- Modify: `apps/api/src/shop/payment/wechat-pay.service.ts`
- Test: `apps/api/src/shop/payment/payment.service.spec.ts`

**步骤：**
1. 测试非订单所有者不能创建支付。
2. 将认证用户 ID 从 Controller 传入 PaymentService，并在服务端校验用户归属和订单状态。
3. 在 WeChatPayService 中移除伪造预支付 ID、恒真验签和伪造退款 ID；未配置真实适配器时抛出服务不可用错误，签名验证失败关闭。
4. 测试重复发起支付不会因唯一商户单号产生不一致记录。

### Task 3：原子订单状态转换与退款幂等

**Files:**
- Modify: `apps/api/src/shop/order/order.service.ts`
- Modify: `apps/api/src/shop/common/tasks/expired-order.task.ts`
- Modify: `apps/api/src/shop/common/tasks/reconciliation.task.ts`
- Modify: `apps/api/src/shop/refund/refund.service.ts`
- Modify: `apps/api/src/shop/refund/refund.controller.ts`
- Test: `apps/api/src/shop/refund/refund.service.spec.ts`

**步骤：**
1. 为取消与过期订单增加竞争测试，确保只有一次状态条件更新成功并释放库存。
2. 将订单状态更新、库存预留释放置于同一事务，并使用条件更新影响行数作为唯一执行依据。
3. 退款只接受整单金额，事务中检查已支付、剩余可退款金额及无其他进行中的退款。
4. 将管理员 ID 由 Controller 认证上下文传入服务；拒绝退款动作提供显式路由。
5. 将支付/退款外部请求移出数据库事务；回调按唯一退款记录和终态做幂等处理，部分退款不支持且不得全额回滚库存。
6. 将自动对账改为只报告异常，删除无法证明归属的自动库存修复。

### Task 4：统一公开商品、订单与退款 API 契约

**Files:**
- Modify: `apps/api/src/shop/product/product.repository.ts`
- Modify: `apps/api/src/shop/product/product.service.ts`
- Modify: `apps/api/src/shop/product/product.controller.ts`
- Modify: `apps/api/src/shop/category/category.repository.ts`
- Modify: `apps/api/src/shop/refund/refund.controller.ts`
- Modify: `apps/api/src/shop/refund/refund.service.ts`
- Modify: `apps/miniapp/src/api/modules/shop.ts`
- Modify: `apps/miniapp/src/api/modules/order.ts`
- Modify: `apps/admin/src/api/refund.ts`

**步骤：**
1. 公开商品列表返回统一分页结构，支持页面实际使用的 `page/pageSize/categoryId`。
2. 公开详情严格过滤上架、未删除商品；后台分类列表可查启用与禁用分类。
3. 固定后端分页参数及返回字段名称，金额均为分；前端 ID 用字符串传输以避免 BigInt 精度损失。
4. 对齐退款审核、拒绝、列表和详情端点及 DTO。

### Task 5：补全小程序交易页面与状态体验

**Files:**
- Create: `apps/miniapp/src/pages/shop/checkout.vue`
- Modify: `apps/miniapp/src/pages.json`
- Modify: `apps/miniapp/src/pages/shop/cart.vue`
- Modify: `apps/miniapp/src/pages/shop/orders.vue`
- Modify: `apps/miniapp/src/pages/shop/order-detail.vue`
- Modify: `apps/miniapp/src/api/modules/shop.ts`
- Modify: `apps/miniapp/src/api/modules/order.ts`

**步骤：**
1. 创建结算页，加载服务端购物车/商品信息，显示服务端确认金额，提交商品 ID、数量和收货信息。
2. 注册结算、详情、订单、退款页面中实际使用的路由。
3. 订单列表和详情统一读取 `*Fen` 与 `productName` 字段。
4. 支付成功以服务端订单状态刷新为准；支付适配器未配置时展示明确不可用错误，不提示假成功。
5. 订单退款入口只在符合服务端整单退款策略的状态下展示。

### Task 6：端到端验证和上线门禁

**Files:**
- Modify: `apps/api/src/shop/**/__tests__` 或相邻 `*.spec.ts`
- Modify: `docs/GO_LIVE_CHECKLIST.md`
- Modify: `docs/shop-module-design-optimized.md`

**步骤：**
1. 运行商城服务测试和已有商城测试，修复与本次改动相关的回归。
2. 运行 `pnpm --filter @blisstribe/api type-check`、API/Admin/小程序构建。
3. 验证 Prisma schema 与迁移一致；不在共享数据库上执行破坏性迁移。
4. 文档明确微信商户证书、API v3 密钥、通知 URL、沙箱/回调联调和生产开关要求。
5. 记录未配置微信支付真实凭据时的验证限制；不声称支付闭环已可生产上线。

---

## 执行约束

- 保留现有工作区未提交更改；避免改动无关认证、环境、登录和统计文件。
- 不提交 Git commit，不执行数据库重置或生产/共享数据库迁移。
- 每项业务逻辑先加失败测试，再实现；支付外部调用使用 mock。
- 任何真实支付凭据不得写入仓库或测试快照。

## 执行记录（2026-09-23）

- 订单、支付、退款安全逻辑和公开 API 契约已按任务 1–4 落地；小程序商品浏览、加购、结算、订单和整单退款页面已按任务 5 对齐。
- API 类型检查/构建、微信小程序类型检查/构建、Admin Vite 打包及订单/退款隔离单测通过。
- Admin 完整类型检查仍被既有 `src/api/auth.ts` 缺少 `./client`、`src/views/shop/order.vue` 多余参数两处错误阻断。
- 全量 `tests/shop` 未运行：其中集成测试会清空商城及用户表；本轮只运行不连接数据库的订单/退款服务单测。
- 未执行 Prisma 迁移。微信支付 V3 真实适配器和商户沙箱/小额联调仍未完成，因此支付与退款不得作为已上线能力对外开放。
