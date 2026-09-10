# BlissTribe 生产部署运行手册

本文档记录 2026-09-02 实际部署到 `47.99.183.31` 的生产环境基线。后续部署、回滚、排障优先参考本文档，再结合 `docs/DEPLOYMENT.md` 的通用策略。

## 1. 当前生产基线

### 1.1 服务器与访问入口

```text
服务器 SSH 别名：blisstribe-prod
服务器目录：/opt/blisstribe
后台管理域名：https://admin.ytxybl.com
API 域名：https://api.ytxybl.com
小程序 API Base URL：https://api.ytxybl.com/api/v1
```

SSH 已配置密钥登录：

```bash
ssh blisstribe-prod
```

安全组和防火墙原则：

```text
公网只开放：22、80、443
API 容器端口：仅绑定 127.0.0.1:14000
Admin 容器端口：仅绑定 127.0.0.1:18080
PostgreSQL：仅绑定 127.0.0.1:15432
Redis：仅绑定 127.0.0.1:16379
```

当前 UFW 入站规则：

```text
OpenSSH
80/tcp
443/tcp
```

### 1.2 容器拓扑

生产环境使用 Docker Compose 单机部署：

```text
宿主机 Nginx
  ├─ api.ytxybl.com   -> 127.0.0.1:14000 -> blisstribe-prod-api:4000
  └─ admin.ytxybl.com -> 127.0.0.1:18080 -> blisstribe-prod-admin:80

Docker Compose
  ├─ blisstribe-prod-api
  ├─ blisstribe-prod-admin
  ├─ blisstribe-prod-db
  └─ blisstribe-prod-redis
```

当前镜像基线：

```text
API：blisstribe-api:20260902164910
Admin：blisstribe-admin:20260902190300
PostgreSQL：postgres:15-alpine
Redis：redis:7-alpine
```

### 1.3 关键文件

服务器：

```text
/opt/blisstribe/docker-compose.prod.yml
/opt/blisstribe/.env
/opt/blisstribe/.env.production
/etc/nginx/sites-enabled/api.ytxybl.com
/etc/nginx/sites-enabled/admin.ytxybl.com
/etc/letsencrypt/live/api.ytxybl.com/
```

本地仓库：

```text
docker-compose.prod.yml
Dockerfile.api
Dockerfile.admin
apps/api/src/main.ts
apps/miniapp/.env
apps/miniapp/.env.development
apps/miniapp/.env.production
apps/miniapp/src/config/index.ts
apps/miniapp/src/manifest.json
```

敏感信息只保存在服务器 `.env` / `.env.production`，不要提交到 Git。

## 2. 部署前检查

### 2.1 本地代码检查

```bash
git status --short
pnpm --filter @blisstribe/api type-check
pnpm --filter @blisstribe/admin type-check
pnpm --filter @blisstribe/miniapp type-check
```

涉及 API 或 Admin 发布时，建议先本地构建：

```bash
pnpm --filter @blisstribe/api build
pnpm --filter @blisstribe/admin build
```

涉及小程序发布时：

```bash
pnpm --filter @blisstribe/miniapp build:mp-weixin
```

微信开发者工具导入目录：

```text
apps/miniapp/dist/build/mp-weixin
```

### 2.2 生产环境变量检查

服务器 `.env` 至少应包含：

```env
API_IMAGE=blisstribe-api:<tag>
ADMIN_IMAGE=blisstribe-admin:<tag>
POSTGRES_USER=<db-user>
POSTGRES_PASSWORD=<db-password>
POSTGRES_DB=<db-name>
DATABASE_URL=postgresql://<db-user>:<db-password>@postgres:5432/<db-name>?schema=public
REDIS_URL=redis://redis:6379
PORT=4000
UPLOAD_DIR=/app/uploads
PUBLIC_BASE_URL=https://api.ytxybl.com
CORS_ORIGIN=https://admin.ytxybl.com
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
WX_APP_ID=<wechat-miniapp-appid>
WX_APP_SECRET=<wechat-miniapp-secret>
```

注意：

- `DATABASE_URL` 和 `REDIS_URL` 在容器内使用 Compose 服务名 `postgres`、`redis`，不能写 `localhost`。
- `PUBLIC_BASE_URL` 决定上传文件返回的公网 URL，当前应为 `https://api.ytxybl.com`。
- `UPLOAD_DIR` 当前为 `/app/uploads`，API 静态文件挂载必须支持绝对路径。
- 小程序 AppID 当前为 `wx79953fe2080835f6`，服务端 `WX_APP_ID` 和 `WX_APP_SECRET` 必须匹配同一个小程序。

## 3. 首次初始化服务器

仅新服务器或重装系统后执行。

### 3.1 系统组件

```bash
ssh blisstribe-prod
apt update
apt install -y nginx certbot python3-certbot-nginx ufw
```

安装 Docker Engine 和 Docker Compose v2 后确认：

```bash
docker version
docker compose version
systemctl enable --now docker
```

小规格服务器建议配置 2G swap，避免镜像加载或迁移时内存不足。

### 3.2 防火墙

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status numbered
```

### 3.3 目录准备

```bash
mkdir -p /opt/blisstribe
chmod 700 /opt/blisstribe
```

把本地 `docker-compose.prod.yml` 同步到服务器：

```bash
scp docker-compose.prod.yml blisstribe-prod:/opt/blisstribe/docker-compose.prod.yml
```

在服务器创建 `/opt/blisstribe/.env` 和 `/opt/blisstribe/.env.production`。这两个文件包含生产密钥，权限应设置为：

```bash
chmod 600 /opt/blisstribe/.env /opt/blisstribe/.env.production
```

## 4. Nginx 与 HTTPS

### 4.1 DNS

域名应解析到服务器公网 IP：

```text
admin.ytxybl.com -> 47.99.183.31
api.ytxybl.com   -> 47.99.183.31
ytxybl.com       -> 47.99.183.31
www.ytxybl.com   -> 47.99.183.31
```

### 4.2 Nginx 反向代理

`/etc/nginx/sites-enabled/api.ytxybl.com` 核心配置：

```nginx
server {
    server_name api.ytxybl.com;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:14000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`/etc/nginx/sites-enabled/admin.ytxybl.com` 核心配置：

```nginx
server {
    server_name admin.ytxybl.com;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:18080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

### 4.3 证书

使用 Certbot 申请并托管证书：

```bash
certbot --nginx -d api.ytxybl.com -d admin.ytxybl.com
certbot --nginx -d ytxybl.com -d www.ytxybl.com
```

检查自动续期：

```bash
systemctl is-enabled certbot.timer
systemctl is-active certbot.timer
certbot renew --dry-run
```

## 5. 发布流程

当前实际使用的是“本地构建 linux/amd64 镜像，`docker save` 传到服务器，服务器 `docker load` 后重启容器”。这是临时可靠方案；后续稳定后建议迁移到 ACR 或 CI/CD。

### 5.1 构建镜像

设置版本号：

```bash
export TAG=$(date +%Y%m%d%H%M%S)
```

构建 API：

```bash
docker build --platform linux/amd64 \
  -f Dockerfile.api \
  -t blisstribe-api:${TAG} .
```

构建 Admin：

```bash
docker build --platform linux/amd64 \
  -f Dockerfile.admin \
  --build-arg VITE_API_BASE_URL=https://api.ytxybl.com/api/v1 \
  -t blisstribe-admin:${TAG} .
```

说明：

- 本机是 macOS/ARM，服务器是 x86_64，必须指定 `--platform linux/amd64`。
- Admin 的 `VITE_API_BASE_URL` 是构建时注入，改 API 域名后必须重新构建 Admin 镜像。
- 小程序的 `VITE_API_BASE_URL` 也是构建时注入，改 `.env` 后必须重新编译小程序。

### 5.2 传输镜像

传 API 镜像：

```bash
docker save blisstribe-api:${TAG} | gzip | ssh blisstribe-prod 'gunzip | docker load'
```

传 Admin 镜像：

```bash
docker save blisstribe-admin:${TAG} | gzip | ssh blisstribe-prod 'gunzip | docker load'
```

如果只改 API，只传 API 镜像；如果只改 Admin，只传 Admin 镜像。

### 5.3 更新服务器镜像标签

在本地确认 `TAG` 仍然是本次镜像标签：

```bash
echo "$TAG"
```

更新前备份服务器环境文件：

```bash
ssh blisstribe-prod 'cd /opt/blisstribe && cp .env .env.bak.$(date +%Y%m%d%H%M%S)'
```

更新 API：

```bash
ssh blisstribe-prod "cd /opt/blisstribe && \
  sed -i 's/^API_IMAGE=.*/API_IMAGE=blisstribe-api:${TAG}/' .env && \
  docker compose --env-file .env -f docker-compose.prod.yml up -d api"
```

更新 Admin：

```bash
ssh blisstribe-prod "cd /opt/blisstribe && \
  sed -i 's/^ADMIN_IMAGE=.*/ADMIN_IMAGE=blisstribe-admin:${TAG}/' .env && \
  docker compose --env-file .env -f docker-compose.prod.yml up -d admin"
```

整体启动：

```bash
ssh blisstribe-prod 'cd /opt/blisstribe && docker compose --env-file .env -f docker-compose.prod.yml up -d'
```

## 6. 数据库迁移与 Seed

部署后执行迁移：

```bash
ssh blisstribe-prod
cd /opt/blisstribe
docker compose --env-file .env -f docker-compose.prod.yml exec -T api \
  pnpm --filter @blisstribe/api exec prisma migrate deploy
```

首次初始化数据时执行 seed：

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec -T api \
  pnpm --filter @blisstribe/api prisma:seed
```

注意：

- Seed 会创建默认后台账号 `admin / admin123`，上线后必须立即修改密码。
- 生产环境执行 seed 前先确认脚本幂等，避免覆盖业务数据。

## 7. 发布验收

### 7.1 容器状态

```bash
ssh blisstribe-prod
cd /opt/blisstribe
docker compose --env-file .env -f docker-compose.prod.yml ps
docker logs --tail 100 blisstribe-prod-api
```

期望：

```text
blisstribe-prod-api：Up
blisstribe-prod-admin：Up
blisstribe-prod-db：healthy
blisstribe-prod-redis：healthy
```

### 7.2 公网 HTTP 验收

```bash
curl -I https://admin.ytxybl.com
curl -I https://api.ytxybl.com/api/v1/agreements/current/user
curl -I https://api.ytxybl.com/uploads/product-emotion.jpg
curl -I https://api.ytxybl.com/uploads/product-sleep.jpg
```

期望：

```text
Admin：首页返回 200
API：协议接口返回 200
Uploads：图片返回 200，Content-Type 为 image/jpeg 或 image/webp
```

### 7.3 CORS 验收

```bash
curl -I -X OPTIONS https://api.ytxybl.com/api/v1/agreements/current/user \
  -H 'Origin: https://admin.ytxybl.com' \
  -H 'Access-Control-Request-Method: GET'
```

期望：

```text
HTTP 204 或 200
Access-Control-Allow-Origin: https://admin.ytxybl.com
```

### 7.4 后台登录验收

使用后台页面：

```text
https://admin.ytxybl.com
```

默认初始化账号：

```text
admin / admin123
```

首次登录后立即修改密码。

## 8. 小程序发布要点

当前小程序配置：

```text
AppID：wx79953fe2080835f6
API Base URL：https://api.ytxybl.com/api/v1
```

相关文件：

```text
apps/miniapp/src/manifest.json
apps/miniapp/src/config/index.ts
apps/miniapp/.env
apps/miniapp/.env.development
apps/miniapp/.env.production
```

重新编译：

```bash
pnpm --filter @blisstribe/miniapp build:mp-weixin
```

微信开发者工具导入：

```text
apps/miniapp/dist/build/mp-weixin
```

微信公众平台需要配置服务器域名：

```text
request 合法域名：https://api.ytxybl.com
uploadFile 合法域名：https://api.ytxybl.com
downloadFile 合法域名：https://api.ytxybl.com
```

如果图片出现 `unsafe-url` 或无法加载，优先检查：

1. URL 是否返回 `200` 和正确 `Content-Type`。
2. `downloadFile 合法域名` 是否包含 `https://api.ytxybl.com`。
3. 图片 URL 是否仍指向旧域名或 `localhost`。
4. API 容器 `/app/uploads` 是否有对应文件。

## 9. 常见问题

### 9.1 `/uploads/*.jpg` 返回 404

检查文件是否在容器卷里：

```bash
ssh blisstribe-prod
docker exec blisstribe-prod-api sh -lc 'ls -la /app/uploads | head'
```

检查 URL：

```bash
curl -I https://api.ytxybl.com/uploads/product-emotion.jpg
```

已修复过的问题：`UPLOAD_DIR=/app/uploads` 是绝对路径，API 静态资源挂载必须按绝对路径处理，不能直接 `join(process.cwd(), uploadDir)`。

### 9.2 API 仍访问 `localhost`

检查小程序环境文件：

```bash
rg --hidden -n "localhost:4000|127\\.0\\.0\\.1:4000|http://localhost|VITE_API_BASE_URL" apps/miniapp -g '!node_modules'
```

改完 `.env` 后必须重新构建小程序：

```bash
pnpm --filter @blisstribe/miniapp build:mp-weixin
```

### 9.3 微信登录失败

小程序端和服务端必须匹配：

```text
apps/miniapp/src/manifest.json 的 mp-weixin.appid
服务器 .env / .env.production 的 WX_APP_ID
服务器 .env / .env.production 的 WX_APP_SECRET
```

只改 AppID 不改对应 secret，微信登录会失败。

### 9.4 CORS 风险

当前推荐配置：

```env
CORS_ORIGIN=https://admin.ytxybl.com
```

不要在生产环境使用：

```env
CORS_ORIGIN=*
```

小程序请求不依赖浏览器 CORS，但后台管理站点依赖 CORS。后台和 API 分域名时，应使用精确 Origin 白名单。

## 10. 回滚

回滚 API：

```bash
ssh blisstribe-prod
cd /opt/blisstribe
cp .env .env.bak.$(date +%Y%m%d%H%M%S)
sed -i "s/^API_IMAGE=.*/API_IMAGE=blisstribe-api:<previous-tag>/" .env
docker compose --env-file .env -f docker-compose.prod.yml up -d api
```

回滚 Admin：

```bash
sed -i "s/^ADMIN_IMAGE=.*/ADMIN_IMAGE=blisstribe-admin:<previous-tag>/" .env
docker compose --env-file .env -f docker-compose.prod.yml up -d admin
```

数据库迁移不自动回滚。涉及 schema 变更时，部署前必须先备份数据库。

## 11. 安全与运维待办

必须尽快完成：

- 修改默认后台账号密码。
- 修改服务器 root 密码。
- 确认 SSH key 登录可用后，关闭 root 密码登录。
- 为 PostgreSQL 配置定时备份和恢复演练。
- 定期清理旧 Docker 镜像，避免磁盘占满。

建议逐步完成：

- 创建非 root 部署用户。
- 接入镜像仓库，替代 `docker save | ssh docker load`。
- 增加应用健康检查接口。
- 增加 Nginx 访问日志轮转和 API 错误日志监控。

## 12. 工程原则

- KISS：当前阶段采用单机 Docker Compose + 宿主机 Nginx，链路清晰，排障成本低。
- YAGNI：暂不引入 Kubernetes、服务网格、复杂 CI/CD，先保证手动部署可重复。
- SOLID：Dockerfile 负责构建，Compose 负责编排，Nginx 负责公网入口，环境变量负责配置，职责边界清晰。
- DRY：域名、端口、镜像标签集中在 Compose 和服务器 `.env` 管理，小程序 API 地址集中到环境文件和 `APP_CONFIG` fallback。

## 13. 宿主机部署方案

如果生产环境禁止 Docker，保留宿主机 Nginx 和现有域名，API 使用 systemd 运行，Admin 构建为静态文件，PostgreSQL 和 Redis 使用系统服务。

### 13.1 服务器初始化

当前服务器安装 Node.js 22、pnpm 10.22.0、PostgreSQL 18、Redis 8，并创建非 root 用户：

```bash
useradd --system --home /opt/blisstribe --shell /usr/sbin/nologin blisstribe
mkdir -p /opt/blisstribe/releases /var/lib/blisstribe/uploads /etc/blisstribe
chown -R blisstribe:blisstribe /opt/blisstribe /var/lib/blisstribe
```

创建 `/etc/blisstribe/api.env`，至少包含：

```env
NODE_ENV=production
DATABASE_URL=postgresql://<db-user>:<db-password>@127.0.0.1:5432/<db-name>?schema=public
REDIS_URL=redis://127.0.0.1:6379
PORT=14000
UPLOAD_DIR=/var/lib/blisstribe/uploads
PUBLIC_BASE_URL=https://api.ytxybl.com
CORS_ORIGIN=https://admin.ytxybl.com
```

```bash
chmod 600 /etc/blisstribe/api.env
```

### 13.2 首次数据迁移

先备份现有 Docker 数据，再迁移到宿主机 PostgreSQL：

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U <db-user> -d <db-name> --format=custom > /opt/blisstribe/database.dump
pg_restore -U <db-user> -d <db-name> --clean --if-exists /opt/blisstribe/database.dump
```

复制现有 Docker 上传卷到 `/var/lib/blisstribe/uploads`。Redis 如果只承担缓存可以重建；如果保存业务状态，必须先备份并恢复 RDB/AOF。

### 13.3 安装服务

```bash
cp deploy/systemd/blisstribe-api.service /etc/systemd/system/
cp deploy/nginx/host-api.conf /etc/nginx/sites-enabled/api.ytxybl.com
cp deploy/nginx/host-admin.conf /etc/nginx/sites-enabled/admin.ytxybl.com
systemctl daemon-reload
systemctl enable --now postgresql redis-server
systemctl enable blisstribe-api
nginx -t && systemctl reload nginx
```

### 13.4 发布

从本地执行：

```bash
./scripts/deploy-host.sh
```

脚本会同步代码、在服务器构建、执行 Prisma 迁移、切换 `/opt/blisstribe/current` 并重启 API。Admin 静态文件由 Nginx 直接读取，不需要单独的 Admin 进程。

只构建和同步、不切换生产：

```bash
CUTOVER=0 TAG=staging-<timestamp> ./scripts/deploy-host.sh
```

### 13.5 回滚

```bash
ssh blisstribe-prod 'ln -sfn /opt/blisstribe/releases/<previous-tag> /opt/blisstribe/current && systemctl restart blisstribe-api'
```

数据库迁移不会自动回滚；涉及 schema 变更时必须先确认备份和兼容性。
