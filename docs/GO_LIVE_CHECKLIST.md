# 上线前检查清单

本文档用于 BlissTribe 从测试部署进入公网验收或正式上线前的最后检查。

## 1. 当前发布基线

- 发布方式：本地执行 `pnpm deploy:acr`。
- 本机推送镜像：ACR 公网地址。
- 服务器拉取镜像：ACR VPC 内网地址。
- 服务器目录：`/opt/blisstribe`。
- 服务器入口：Admin 容器监听宿主机 `80`。
- API 调试口：宿主机 `14000`，正式访问优先走 Admin Nginx 的 `/api/` 代理。

## 2. 必做项

### 2.1 阿里云安全组

放行公网入口：

```text
TCP 80
```

暂不建议公网放行：

```text
TCP 15432  # Postgres
TCP 16379  # Redis
```

API 调试口 `14000` 只在需要临时排查时放行，正式环境建议关闭公网入口。

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

上线前执行：

```bash
ssh blisstribe-prod
cd /opt/blisstribe
docker compose -f docker-compose.prod.yml exec -T api pnpm --filter @blisstribe/api exec prisma migrate deploy
```

正式运营前补充：

- PostgreSQL 定时备份。
- 备份恢复演练。
- 敏感数据字段检查。

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

- KISS：单机 Docker Compose + ACR 足够支撑当前阶段。
- YAGNI：暂不引入 Kubernetes、服务网格和全自动 CI/CD。
- SOLID：API、Admin、小程序、共享包保持独立边界。
- DRY：发布流程统一走 `scripts/deploy-acr.sh`，不要手工复制散落命令。
