# 微信支付生产部署记录

更新时间：2026-10-09。

## 正式访问地址

- API：`https://api.ytxybl.com/api/v1`
- 后台：`https://admin.ytxybl.com`
- 支付通知：`https://api.ytxybl.com/api/v1/shop/webhooks/wechat-pay`
- 退款通知：`https://api.ytxybl.com/api/v1/shop/webhooks/wechat-refund`

沿用服务器已有 API 子域名、HTTPS 证书和 Nginx 配置，减少域名迁移带来的配置变更。小程序生产配置已指向此 API 地址；微信公众平台的 request、uploadFile、downloadFile 合法域名应包含 `https://api.ytxybl.com`。

## 部署状态

- SSH 别名：`blisstribe-prod`。
- 发布目录：`/opt/blisstribe/releases/20261009-wechat-02`。
- 当前版本：`/opt/blisstribe/current`。
- 生产凭证：`/etc/blisstribe/api.env`，未提交到 Git。
- 微信渠道调用已启用，模拟支付已关闭；新支付入口保持暂停（`SHOP_PAYMENT_CHECKOUT_ENABLED=false`），查单、关单、退款和通知处理保留。
- `SHOP_PAYMENT_TEST_USER_ID=2`，仅用户 2 可发起真实支付，其他用户的新支付入口继续暂停。该设置使用后台用户 ID，不是 AppID 或 OpenID。
- API 与后台构建成功，六项商城数据库迁移已应用。
- 修正支付和退款通知的 `Wechatpay-*` 请求头读取。
- 微信请求携带 `Wechatpay-Serial`，使用配置的微信支付公钥 ID。
- 验签失败返回 HTTP 401，通知处理异常返回 HTTP 500。
- 支付后主动查单确认，未确认支付时不显示支付成功。
- 重复支付复用预支付记录，支付记录按商户单号幂等写入。
- 验签确认渠道订单未创建时，取消本地订单并释放预留库存。
- 退款成功通知校验金额和币种，进行中退款与发货通过订单行锁互斥。
- 公网 API、后台与商城商品接口正常。
- 微信只读查单返回预期的 `ORDER_NOT_EXIST`，商户签名和微信应答验签通过，未产生交易。

第二版使用相同依赖锁文件，并复用第一版依赖目录。保留第一版发布目录；后续正常发布安装独立依赖后可解除复用。

## 自动化验收

```bash
pnpm --filter @blisstribe/api test:shop-unit
pnpm --filter @blisstribe/miniapp type-check
pnpm --filter @blisstribe/miniapp build:mp-weixin
```

独立数据库 `blisstribe_paycheck_20261009` 仅复制生产表结构，未复制用户或订单数据。`tests/shop/payment-flow.check.js` 已验证实际事务中的下单、预留库存、重复支付、重复支付通知、退款及重复退款通知、取消订单、金额错误回滚、回调延迟补记账、退款与发货互斥、并发防超卖。微信渠道均使用模拟实现，不产生真实扣款。

该脚本只接受数据库名以 `blisstribe_paycheck_` 开头的连接，拒绝生产数据库。测试库保留用于后续验收。

## 后续发布

使用 `scripts/deploy-host.sh`。先生成 Prisma 客户端，再构建共享包和 API。现有生产表归 PostgreSQL 管理员所有，迁移使用本机管理员身份；应用账号仅获得业务表与序列的访问权限。

每次涉及数据库变更前备份数据库及生产环境文件。此次备份目录为 `/opt/blisstribe/backups/20261009-wechat-01`，含数据库、环境文件和上一版本路径；目录仅管理员可访问。

## 无交易回调检查

以下检查只发送无签名空通知，预期拒绝，不写入业务数据：

```bash
for event in wechat-pay wechat-refund; do
  status=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' \
    -X POST -H 'Content-Type: application/json' --data '{}' \
    "https://api.ytxybl.com/api/v1/shop/webhooks/$event")
  test "$status" = 401 || exit 1
done
```

## 尚未完成的联调

- 小程序真实付款、成功通知以及真实退款。
- 用户已确认微信公众平台合法域名完成配置，真机访问待验收。
- 交易类小程序订单发货管理的接入核查。
- 已在聊天中暴露的小程序 AppSecret 需要重置，并同步本地及生产配置。

真实付款验收前，不应将只读查单结果视为完整支付验收。

## 真实小额验收步骤

已创建商品 ID `1`、SKU ID `1`，名称「微信支付验收商品（0.01元，仅测试）」。初始总库存 2、预留 0、已售 0，验收后下架。详情路径：`/pages/shop/detail?id=1`。

1. 确认微信公众平台合法域名已包含 `https://api.ytxybl.com`，验收用户可登录并打开商城。
2. 使用微信开发者工具导入 `apps/miniapp/dist/build/mp-weixin`，真机预览当前版本。
3. 确认验收账号的后台用户 ID，配置生产 `SHOP_PAYMENT_TEST_USER_ID`，保留公众支付入口暂停。
4. 在后台准备明确标注的验收商品，价格 0.01 元、库存 2；记录商品 ID 和初始库存，不调整真实商品库存。
5. 真机取消一次支付，再次进入付款，检查支付成功、订单状态、微信交易号、库存预留转已售。
6. 刷新页面和再次查询，确认不会重复扣库存；后台核对微信商户平台记录。
7. 用户申请全额退款，管理员审批；确认微信退款到账、退款通知、退款金额及已售恢复。
8. 真实验收完成后移除验收用户配置；只有支付、退款、发货管理和凭证更新均确认完成，才恢复公众支付入口。
