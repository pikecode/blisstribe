# 上线前检查清单

本文档用于 BlissTribe 从测试部署进入公网验收或正式上线前的最后检查。

## 1. 当前发布基线

- 当前生产方式：宿主机部署；本地执行 `./scripts/deploy-host.sh`。
- 服务器目录：`/opt/blisstribe`。
- API：`blisstribe-api.service` 监听宿主机 `14000`，由 Nginx 反向代理。
- Admin：静态文件由宿主机 Nginx 提供。

## 2. 必做项

### 2.1 阿里云安全组

放行公网入口：

```text
TCP 80
```

暂不建议公网放行：

```text
TCP 5432   # 宿主机 PostgreSQL，仅本机访问
TCP 6379   # 宿主机 Redis，仅本机访问
```

API `14000` 仅绑定本机回环地址，由 Nginx 代理；PostgreSQL、Redis 和 API 端口均不得开放公网访问。

### 2.2 域名与 HTTPS

上线前建议完成：

- 域名解析到服务器公网 IP。
- HTTPS 证书配置。
- 小程序接口域名使用 HTTPS。
- 微信小程序后台配置 request/upload/download 合法域名。

### 2.3 密钥与账号

必须处理：

- 修改默认管理员密码：`admin / admin123`。
- 更换服务器 root 密码。
- 确认 SSH key 登录可用后，关闭 root 密码登录。
- 使用强随机值配置 `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`。
- 补齐真实 `WX_APP_ID`、`WX_APP_SECRET`。
- 生产 `.env` 不提交 Git。

### 2.4 数据库

**迁移门禁：** 2026-09-24 只读核验确认生产由宿主机 systemd/Nginx/PostgreSQL/Redis 运行，API 本机探测 HTTP 200；旧 Docker Compose 容器停止不代表生产停机。生产 migration history 有 23 条已完成迁移、无回滚记录，最新为 `20260901100000_add_venue_facility_dictionary`；无 `0_init_shop_tables` 记录，且无 `Shop%` 表。最终迁移 SQL 已与 Prisma 生成的差异核对；生产 schema-only 副本和空白隔离库均迁移成功，迁移后 Schema diff 为空。`ProductLead.archived`、`RecommendationEvent.clicked/converted` 当前允许 NULL，但生产 NULL 行数均为 0。生产尚未执行新迁移；执行前仍须完成实际数据库备份及隔离恢复演练、审批和维护窗口确认。

恢复流程已用不含业务数据的生产 schema-only 副本完成演练，恢复后 Schema diff 为空；这不替代发布前对实际生产备份进行恢复和数据校验。

生产侧核验只读取以下记录，不要手工更新 `_prisma_migrations`：

```sql
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations"
WHERE migration_name IN ('0_init_shop_tables', '20260701081229_init')
ORDER BY started_at;
```

如生产基线变化或迁移内容调整，重新核对实际列定义、NULL 行数和 migration history；约束数据不满足时，先设计并验证回填方案。

生产数据库备份与恢复演练（在服务器执行备份；恢复目标必须是隔离实例，禁止覆盖生产库）：

```bash
ssh blisstribe-prod
set -a
. /etc/blisstribe/api.env
set +a
DB_URL="${DATABASE_URL%%\?*}"
umask 077
BACKUP_FILE="/var/backups/blisstribe/pre-migration-$(date -u +%Y%m%dT%H%M%SZ).dump"
mkdir -p /var/backups/blisstribe
pg_dump "$DB_URL" --format=custom --file="$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" >/dev/null
```

将备份在隔离 PostgreSQL 实例恢复并校验核心表/记录及应用连通性后，记录备份文件、校验结果、恢复目标和执行人。恢复命令示例（`RESTORE_DATABASE_URL` 必须指向隔离目标库）：

```bash
pg_restore --exit-on-error --dbname="$RESTORE_DATABASE_URL" "$BACKUP_FILE"
```

生产迁移前必须确认目标环境、备份恢复演练、迁移 SQL 审查结果和维护窗口。实际发布脚本 `./scripts/deploy-host.sh` 在默认 `CUTOVER=1` 时会执行 `prisma migrate deploy`，因此只有全部门禁通过后才能运行；`CUTOVER=0` 仅构建/同步，不迁移、不切换。不得把本地 `migrate status` 当作生产验证。

上线前执行：

```bash
./scripts/deploy-host.sh
```

正式运营前补充：

- PostgreSQL 定时备份。
- 备份恢复演练。
- 敏感数据字段检查。

### 2.5 微信支付

当前微信支付 V3 适配器尚未实现真实统一下单、回调验签/解密和退款请求；即使填入以下配置，API 仍会失败关闭。此项完成并通过联调前，不得开放真实支付或退款，也不得将商城标记为支付闭环已上线。

- [ ] 配置 `WECHAT_APP_ID`、`WECHAT_MCH_ID`、`WECHAT_API_V3_KEY`。
- [ ] 通过密钥系统注入 `WECHAT_MCH_PRIVATE_KEY`，并配置 `WECHAT_MCH_CERT_SERIAL_NO` 与 `WECHAT_PLATFORM_PUBLIC_KEY`；不得提交真实密钥、私钥或证书。
- [ ] 配置 `API_BASE_URL` 为带 `/api/v1` 的公网 HTTPS API 基址；微信支付通知地址应为 `<API_BASE_URL>/shop/webhooks/wechat-pay`。
- [ ] 在微信商户平台配置并验证支付通知 URL；确认生产回调可访问且请求体原文可用于验签。
- [ ] 使用测试商户环境或受控小额交易完成下单、签名参数、支付回调验签/解密、金额校验、重复回调和超时关闭验证。
- [ ] 完成退款申请、审核、退款通知及重复通知验证，并确认失败/未知结果有人工核对和可恢复流程。
- [ ] 确认应用端只在获得真实签名参数后调用 `wx.requestPayment`，支付结果以服务端订单状态为准。

## 3. 发布验收

本地发布：

```bash
pnpm deploy:acr
```

服务器本机验收：

```bash
ssh blisstribe-prod
cd /opt/blisstribe
docker compose -f docker-compose.prod.yml ps
curl -fsSI http://localhost
curl -fsS http://localhost/api/v1/agreements/current/user
```

公网验收：

```bash
curl -fsSI http://47.99.183.31
curl -fsS http://47.99.183.31/api/v1/agreements/current/user
```

如果已配置域名和 HTTPS：

```bash
curl -fsSI https://<domain>
curl -fsS https://<domain>/api/v1/agreements/current/user
```

## 4. 小程序验收

构建小程序：

```bash
pnpm build:miniapp
```

微信开发者工具导入：

```text
apps/miniapp/dist/build/mp-weixin
```

如果需要开发模式热更新：

```bash
pnpm dev:miniapp
```

微信开发者工具导入：

```text
apps/miniapp/dist/dev/mp-weixin
```

注意：当前已关闭小程序 sourcemap，避免微信开发者工具 source-map 解析异常。

## 5. 工程原则

- KISS：单机宿主机服务 + Nginx 足够支撑当前阶段。
- YAGNI：暂不引入 Kubernetes、服务网格和全自动 CI/CD。
- SOLID：API、Admin、小程序、共享包保持独立边界。
- DRY：发布流程统一走 `scripts/deploy-acr.sh`，不要手工复制散落命令。
