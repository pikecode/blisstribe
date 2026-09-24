# 商城下一阶段实施计划

**日期：** 2026-09-24  
**状态：** 执行中（Task 1 隔离迁移验证通过；生产发布仍需备份恢复演练和审批）
**架构基线：** `docs/shop-module-design-optimized.md`  
**第一阶段记录：** `docs/plans/2026-09-23-shop-module-completion.md`  
**上线门禁：** `docs/GO_LIVE_CHECKLIST.md`

## 目标

在增加 SKU、虚拟履约或第三方商家前，先把平台自营实物商城做到可以受控验证的交易版本。当前代码具备商品、购物车、订单、库存预留、管理端发货和基础退款流程，但微信支付 V3 尚未实现，不能真实收款或退款。

本计划按三个门依次推进：

1. 补齐支付/关单/退款的异常状态与恢复路径；
2. 接入并验证微信支付 V3；
3. 完成部署、运维准备和小规模受控试运营。

前一门未通过，不进入后一门。若近期业务明确要求 SKU，可另立需求评估；本计划不预先扩展商品模型。

## 当前风险与决策

### 延迟支付通知与过期关单

过期任务会把未付款订单取消并释放预留库存；如果支付实际成功但通知延迟到达，当前支付回调无法确认已取消订单，也没有补偿退款或人工核查记录。

必须先确定并实现策略：

- 关单前向微信查询/关闭订单，不能只根据本地过期时间释放库存；
- 对已确认关闭的订单释放预留库存；
- 若本地已关单后仍收到真实成功通知，持久化异常事件并进入补偿退款/人工处理流程，不得重新扣减可能已售出的库存；
- 重复通知和重复补偿必须幂等。

具体微信关单、查单接口行为以支付 V3 接入设计和商户联调为准；没有外部结果确认时，订单应保持可核查状态，而不是猜测成功或失败。

### 退款调用失败或结果未知

管理员批准退款后，记录会先进入 `processing`，再请求支付渠道。外部请求抛错或超时时，记录可能永久停留在处理中。

必须保留稳定的商户退款单号及请求金额，并区分“明确失败”和“结果未知”。明确失败可在核实渠道状态后重试；未知结果先查单/对账，禁止直接生成新退款单重复退款。后台要能查询异常记录及操作历史；人工处理需记录操作者、理由和渠道核对结果。

### 数据迁移与环境基线

当前 Schema 和商城初始迁移需逐字段核对。编码前先检查 migration history、生产/测试目标数据库的 Prisma migration 状态以及迁移 SQL；确认是否存在未迁移的 Schema 变更。任何迁移须生成、审查、在隔离环境验证，并准备备份与回滚/恢复步骤。不得在此计划下重置数据库或直接对共享/生产数据库执行未审查迁移。

## 实施任务

### Task 1：建立当前商城状态与迁移清单

**目标：** 将代码、Schema、迁移和上线环境状态对齐，先排除“代码有字段、数据库没字段”的部署风险。

**涉及文件：**
- 检查：`apps/api/prisma/schema.prisma`
- 检查：`apps/api/prisma/migrations/`
- 检查：`docs/DATABASE-SHOP.md`
- 修改：`docs/GO_LIVE_CHECKLIST.md`

**步骤：**
1. 对照商城模型、各迁移 SQL 与部署数据库 migration history，输出缺项和冲突清单。
2. 在隔离数据库执行迁移演练，确认从当前发布基线升级成功。
3. 若存在未迁移变更，单独生成并审查最小 Prisma migration；不手工改共享/生产数据库。
4. 记录备份、迁移前检查、迁移后验证和恢复演练步骤。

**验收：**
- Schema 与迁移可从已知基线一致升级；
- 无未解释的 drift；
- 隔离环境迁移成功，备份恢复步骤可执行；
- 生产迁移仍须独立审批和维护窗口。

**2026-09-24 本地核查记录：**
- 本地 `blisstribe` 数据库：此前曾显示 24 个迁移已完成且 Schema diff 为空；移除重复快照并加入新迁移后重新检查，当前 `prisma migrate status` 明确报告历史不一致：新迁移待应用，数据库中有本地目录不存在的 `0_init_shop_tables` 记录（含多条尝试/回滚记录及一条 `undefined` 异常记录）。未对本地业务库做迁移、修复或重置。
- Git 历史显示 `0_init_shop_tables` 于 2026-09-21 随提交 `a543360` 一次性新增，共 1,454 行；内容是包含基础用户、推荐/标签/活动等在内的全库快照，并非只创建商城表的增量迁移。
- 本地 `_prisma_migrations` 中该迁移有两次失败并回滚的记录，错误均为 `"User" already exists`；另有一条已完成记录的 `applied_steps_count=0` 且无日志。该记录只能证明 migration history 将它标记为完成，不能单独证明其 SQL 曾成功执行。整个本地库有 24 条已完成迁移记录，包含 `0_init_shop_tables`。干净迁移链演练仍会因后续 `20260701081229_init` 再次创建 `"User"` 表而失败。
- 初次新建干净隔离库 `blisstribe_shadow_shop_replay_20260924`，排除 `0_init_shop_tables` 后其余 23 个迁移可从零重放。初始 Prisma 差异除新增商城表外，还包括：
  - `ShopCategory.description`、`ShopCategory.imageUrl`、`ShopRefund.approvedAt`、`ShopRefund.adminNotes` 等商城字段；
  - `User.roles` 新字段；
  - `ProductLead.archived`、`RecommendationEvent.clicked/converted` 收紧为非空；
  - 多个模型的数组字段和 `updatedAt` 移除数据库默认值，另有 3 个 `RecommendationEvent` 索引将被删除。
- 根据生产只读证据确认目标库无相关 NULL 行后，保留 `archived/clicked/converted` 非空约束；在 Schema 中补齐生产已有数组/时间默认值，并恢复推荐统计所需的三个事件索引，避免无业务必要的默认值删除和索引移除。
- **核查范围说明：** 早先状态判断只看了旧 Docker Compose 容器；这不足以代表生产服务状态。后续确认生产实际采用宿主机部署，本轮未启动/停止生产服务，也未对生产执行迁移或写入。
- **生产只读基线（2026-09-24）：** `blisstribe-api.service`、Nginx、宿主机 PostgreSQL 与 Redis 均在运行，本机 API 探测 HTTP 200。生产 `_prisma_migrations` 有 23 条已完成记录、无回滚记录，最新为 `20260901100000_add_venue_facility_dictionary`；没有 `0_init_shop_tables` 记录，生产也没有任何 `Shop%` 表。`ProductLead.archived`、`RecommendationEvent.clicked/converted` 均允许 NULL，但对应 NULL 行数均为 0。
- **最终隔离验证：** 新建空白库 `blisstribe_shop_fresh_final_20260924` 从零成功应用全部 24 个活动迁移。新建生产 schema-only 结构副本 `blisstribe_shop_prod_upgrade_final_20260924`，装入与生产基线一致的前 23 条迁移历史后，仅应用本次迁移成功。两个数据库对当前 Prisma Schema 的 diff 均为 `No difference detected`；最终副本保留了三个 `RecommendationEvent` 索引及既有字段默认值。未复制生产业务数据。
- **迁移历史协调风险：** 本地开发库仍有 `0_init_shop_tables` 的已完成记录（`applied_steps_count=0`），但活动迁移目录已移除该全库快照。未手工改动本地 `_prisma_migrations`。其他开发库或环境若存在该记录，必须先盘点实际 Schema 与迁移状态，按环境单独制定协调方式；不能通过重置数据库、伪造完成记录或直接改生产历史来处理。
- **Task 1 状态：** 生产迁移尚未执行。使用不含业务数据的生产 schema-only 副本完成恢复演练，恢复后 Schema diff 为空；生产执行前仍须对实际生产备份完成隔离恢复和数据校验，并取得迁移审批、SQL 复核及维护窗口确认。数据库迁移不做自动回滚。

  ```sql
  SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count
  FROM "_prisma_migrations"
  WHERE migration_name IN ('0_init_shop_tables', '20260701081229_init')
  ORDER BY started_at;
  ```

  同时核对生产实际商城字段：

  ```sql
  SELECT table_name, column_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('ShopCategory', 'ShopRefund')
  ORDER BY table_name, ordinal_position;
  ```

  对约束收紧涉及的数据做只读 NULL 计数：

  ```sql
  SELECT
    (SELECT count(*) FROM "ProductLead" WHERE "archived" IS NULL) AS product_lead_archived_nulls,
    (SELECT count(*) FROM "RecommendationEvent" WHERE "clicked" IS NULL) AS recommendation_clicked_nulls,
    (SELECT count(*) FROM "RecommendationEvent" WHERE "converted" IS NULL) AS recommendation_converted_nulls;
  ```

  以上查询已完成：生产无 `0_init_shop_tables` 记录且无商城表，目标字段 NULL 数均为 0；本次未在生产运行迁移。

### Task 2：支付状态机与延迟通知补偿

**目标：** 避免过期释放库存与微信实际支付成功之间造成“用户已扣款、订单取消”的悬挂状态。

**涉及文件：**
- 修改：`apps/api/src/shop/order/order.service.ts`
- 修改：`apps/api/src/shop/payment/payment.service.ts`
- 修改：`apps/api/src/shop/common/tasks/expired-order.task.ts`
- 修改：`apps/api/src/shop/common/tasks/reconciliation.task.ts`
- 视设计新增：`apps/api/prisma/schema.prisma` 及 migration
- 测试：`apps/api/src/shop/order/`、`apps/api/src/shop/payment/` 对应服务测试

**步骤：**
1. 先写测试覆盖关单与支付通知并发、关单后迟到成功通知、重复通知、微信查单超时。
2. 引入支付渠道需要的查单/关单接口，但将远程调用置于数据库事务之外。
3. 使用条件状态转换和可恢复的持久化状态表示“正在关单”或“需要人工核查”，避免先释放库存再确认渠道结果。
4. 对迟到成功通知创建可审计的异常处理记录，完成查单与补偿退款后才关闭异常。
5. 对账任务只发现并报告差异；自动动作必须有明确的渠道事实和幂等键，不能根据本地猜测改财务/库存数据。

**验收：**
- 并发支付通知与关单只能形成一个一致终态；
- 迟到成功通知不会重复销售或静默丢失；
- 外部渠道不可用时状态可恢复且库存不被错误释放/扣减；
- 任务重复运行和通知重放不产生重复库存变更或退款。

**2026-09-24 实施进度（第一批）：**
- 订单状态增加持久化 `closing` 中间态；过期任务和用户主动取消共用 `PaymentService.closeUnpaidOrder()`，微信查单/关单在数据库事务外执行。
- 只有查单确认已关闭，或关单请求明确成功后，才在同一数据库事务内条件取消订单并释放预留库存。查单超时会保留 `closing`，定时任务会持续重试所有 `closing` 订单。
- 支付回调允许将 `pending_payment/closing` 原子转为已支付；若订单已取消，则按微信交易号幂等写入 `ShopPaymentException`，不再修改库存。对账任务会报告待人工核查事件。
- 新增 `20260924000200_add_shop_payment_exceptions` migration。该迁移尚未在任何业务库或隔离库执行。
- Prisma Schema 校验、Prisma Client 生成、API type-check 与 API build 通过。新增全 mock Jest 测试已编写，但当前仓库 Jest 运行器将 NestJS ESM 包错误地按 CommonJS 加载，定向测试未能执行；需先修复/确认 Jest 模块配置，再以测试结果验收并补并发重放覆盖。
- 尝试新建隔离数据库重放 25 个活动迁移时，当前本地 PostgreSQL 角色没有 `CREATEDB` 权限，数据库未创建、未对任何现有库执行迁移；需由具备权限的隔离数据库或 DBA 提供一次重放环境。
- 微信支付适配器仍为失败关闭的空实现；真实渠道查单/关单属于 Task 4。Task 2 尚未完成，异常事件的管理端核查/补偿操作也尚未实现，不得据此开放真实支付或试运营。

### Task 3：退款异常恢复与审计

**目标：** 让退款请求失败、超时和重复通知有清晰可操作的恢复路径。

**涉及文件：**
- 修改：`apps/api/src/shop/refund/refund.service.ts`
- 修改：`apps/api/src/shop/payment/payment.service.ts`
- 修改：`apps/api/src/shop/payment/wechat-pay.service.ts`
- 修改：`apps/api/src/shop/refund/refund.controller.ts`
- 修改：`apps/admin/src/views/shop/refund.vue`
- 测试：退款服务测试及 Admin 退款操作测试

**步骤：**
1. 为适配器定义退款提交、退款查询及明确失败/结果未知的返回契约。
2. 添加测试覆盖渠道拒绝、网络超时但渠道实际成功、重复审批、重复回调、退款查单后重试。
3. 保持同一个 outRefundNo 作为重试幂等键；不确定时先查询，不创建第二笔退款。
4. 提供管理端异常列表、渠道状态/最后错误、核查和受控重试操作。
5. 记录管理员身份、操作原因、前后状态及渠道结果；禁止手工直接改成功状态冒充退款完成。

**验收：**
- 任一 `processing` 记录可查出当前原因及下一步动作；
- 渠道未知结果不会触发重复退款；
- 所有人工核查和重试都有审计记录；
- 累计退款不超过已支付金额，退款成功通知幂等。

### Task 4：实现微信支付 V3 适配器

**前置条件：** Task 1–3 的状态恢复设计通过评审；商户、应用、回调域名及密钥由安全渠道准备。

**涉及文件：**
- 修改：`apps/api/src/shop/payment/wechat-pay.service.ts`
- 修改：`apps/api/src/shop/payment/payment.service.ts`
- 修改：`apps/api/src/shop/payment/payment.controller.ts`
- 修改：`apps/api/src/shop/refund/refund.service.ts`
- 修改：`apps/api/src/shop/refund/refund.controller.ts`
- 修改：`apps/api/package.json`（仅在选定官方/可信 SDK 且确有需要时）
- 测试：支付签名、通知验签/解密、退款适配器测试
- 修改：`docs/GO_LIVE_CHECKLIST.md`

**步骤：**
1. 比较受维护 SDK 与 Node.js 原生 HTTP + 加密实现，优先采用可验证、维护状态明确的方案，并记录决策。
2. 实现 JSAPI 下单，验证 AppID、商户号、金额单位、订单号、通知 URL 和客户端调起参数。
3. 使用原始请求体验签，校验证书序列号/时间戳/随机串，并解密支付和退款资源。
4. 校验商户号、AppID、订单号、金额、币种和渠道交易号后，才调用领域状态转换。
5. 实现微信关单、查单、退款提交和退款查单；密钥仅从服务端密钥管理/环境注入。
6. 以官方样例或隔离凭据测试签名与解密边界；真实凭据不进仓库、日志、快照或测试输出。

**验收：**
- 缺配置、错误证书、验签失败、金额不符均失败关闭；
- 支付与退款通知原文验签/解密通过正反向测试；
- 客户端只获得真实渠道参数；
- 真实交易状态以服务端校验后的回调/查单结果为准。

### Task 5：受控联调与试运营门禁

**涉及文件：**
- 修改：`docs/GO_LIVE_CHECKLIST.md`
- 更新：`docs/shop-module-design-optimized.md`
- 检查：Admin、小程序与 API 的商城流程和环境配置

**步骤：**
1. 在微信测试商户能力允许的环境完成下单、支付、支付通知、退款和退款通知联调。
2. 覆盖重复/乱序通知、订单过期、网络超时、查单恢复及退款拒绝等故障注入场景。
3. 若无法使用沙箱，使用审批后的受控小额真实订单，明确金额上限、测试账号、退款责任人及停止开关。
4. 验证正式 HTTPS 回调可达、微信合法域名、迁移、备份恢复、日志脱敏、告警和人工核查责任。
5. 仅在所有门禁满足后将商城状态更新为“受控试运营”；扩量需单独复盘。

**验收：**
- 下单至退款的端到端记录可与微信商户平台账单核对；
- 迟到通知、重复通知和异常结果均有可审计处置；
- 生产密钥没有进入 Git 或日志；
- 值班/人工退款核查负责人、响应时限和暂停交易办法明确；
- 所有上线检查项有证据，不以构建通过替代支付联调。

## 推迟范围

以下功能不属于本计划，需以真实业务需求和交易稳定性为启动条件另行设计：

- 多规格 SKU 与 SKU 级库存；
- 虚拟兑换码、课程/场地预约和自动履约；
- 第三方商家入驻、商家数据隔离与店铺后台；
- 微信支付自动分账、平台佣金、结算和提现；
- 优惠券、秒杀、拼团、个性化推荐和独立消息队列。

如果 SKU 已成为当前销售阻塞，先收集商品规格数量、库存差异、价格差异、订单快照和售后规则，再单独调整本计划；不能只在管理端增加规格输入框而不扩展订单、库存和退款模型。

## 推进决策

**推荐顺序：** Task 1 → Task 2 → Task 3 → Task 4 → Task 5。

**备选路径：**

- **安全优先（推荐）：** 先完成数据库/状态恢复，再接支付，最后受控试运营。风险最低，适合当前存在支付适配器空实现和异常状态悬挂的情况。
- **业务验证优先：** 若近期必须验证用户购买意愿，可先部署不收款的商品浏览/购物车演示，或由线下人工收款并在系统标记为测试流程；不得调用伪支付、伪造支付成功或将其混入真实订单账务。

第二条路径不能替代微信支付上线验收。

## 原则与风险

- **KISS / YAGNI：** 先处理真实交易异常，不并行开发 SKU、分账和促销。
- **SOLID：** 支付渠道能力收敛在适配器中；订单状态和库存转换仍由领域服务负责。
- **DRY：** 小程序、Admin 和 API 使用同一订单/退款状态语义，避免各端自行推断支付结果。
- **安全与运维风险：** 支付私钥泄露、回调公网不可达、数据库 migration drift、退款结果未知和通知延迟均为上线阻断项；通过密钥管理、联调演练、迁移审查、告警及人工恢复预案控制。
