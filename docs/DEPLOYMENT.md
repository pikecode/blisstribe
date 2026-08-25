# Docker 部署标准与操作流程

## 1. 文档目的

本文档沉淀 BlissTribe 的本地开发、Docker 部署、镜像发布和后续 CI/CD 演进标准。后续讨论部署、服务器初始化、镜像构建、发布、回滚和验收时，默认以本文档为基准。

适用范围：
- `apps/api`：NestJS API 服务。
- `apps/admin`：Vue 后台管理站点。
- `apps/miniapp`：微信小程序构建与发布说明。
- `PostgreSQL`、`Redis`：本地、测试和生产环境的数据依赖。

---

## 2. 核心原则

### 2.1 KISS：先跑通最短生产路径

当前阶段优先使用 Docker Compose，而不是 Kubernetes。单机部署足以支持早期测试和 MVP 验证，避免过早引入集群、服务网格和复杂流水线。

### 2.2 YAGNI：CI/CD 分阶段演进

不要一开始就强制搭完整 CI/CD。先手动跑通 Docker 构建、镜像分发、服务器启动和验收，再逐步自动化。

### 2.3 SOLID：构建、运行、配置职责分离

- Dockerfile 负责构建镜像。
- Docker Compose 负责运行和服务编排。
- `.env` 负责环境变量。
- Nginx 负责静态资源和反向代理。
- Prisma 迁移负责数据库结构变更。

### 2.4 DRY：部署配置复用

本地部署测试、测试服务器和生产服务器应尽量复用同一套 Dockerfile、Compose 服务名和环境变量命名，减少多环境重复配置。

---

## 3. 推荐部署架构

### 3.1 开发环境

日常开发推荐：

```text
PostgreSQL + Redis：Docker
API + Admin：本机 pnpm dev
```

命令：

```bash
pnpm docker:up
pnpm dev
```

优点：
- API 和 Admin 热更新快。
- 数据库版本稳定。
- 调试成本低。

### 3.2 发布前本地验收

发布前建议跑完整 Docker 形态：

```text
API：Docker 容器
Admin：Nginx 容器
PostgreSQL：Docker 容器
Redis：Docker 容器
```

目标是提前发现：
- Dockerfile 构建失败。
- 容器内环境变量错误。
- `localhost` 和 Compose 服务名混用。
- Nginx 静态资源或代理配置错误。
- 上传目录、日志目录、数据卷权限问题。

### 3.3 测试服务器

测试服务器推荐先用 Docker Compose：

```text
服务器拉代码或拉镜像
Docker Compose 启动 API / Admin / PostgreSQL / Redis
```

测试阶段 PostgreSQL 可以用容器承载；正式生产阶段建议优先使用云托管数据库。

### 3.4 正式生产

正式生产推荐：

```text
API：Docker 镜像
Admin：Nginx 静态站点镜像或 CDN
PostgreSQL：云托管数据库优先
Redis：云托管或 Docker 容器
Nginx：HTTPS、反向代理、静态资源
```

---

## 4. Docker 部署原理

Docker 部署的核心是把应用和运行环境打成镜像，服务器只负责运行镜像。

```text
代码 + 依赖 + 启动命令
        ↓
    Dockerfile
        ↓
    docker build
        ↓
      镜像 image
        ↓
    docker run / docker compose up
        ↓
      容器 container
```

概念：
- 镜像：打包好的应用模板，类似安装包。
- 容器：镜像运行起来后的进程实例。
- 镜像仓库：存放镜像的制品库，类似 Docker 镜像的 Git 仓库。

---

## 5. 部署方案选择

### 5.1 方案 A：服务器拉代码构建

流程：

```text
本地提交代码
服务器 git pull
服务器 docker compose up -d --build
```

适用场景：
- 初期测试。
- 单人开发。
- 部署频率低。
- 暂时没有镜像仓库。

优点：
- 最简单。
- 不需要镜像仓库。
- 容易理解和排查。

缺点：
- 服务器保存源码。
- 构建消耗服务器 CPU 和内存。
- 回滚依赖 Git 版本和本地构建状态。

### 5.2 方案 B：本地构建镜像，服务器只拉镜像运行

流程：

```text
本地 docker build
本地 docker push 到镜像仓库
服务器 docker pull
服务器 docker compose up -d
```

适用场景：
- 希望服务器不保存源码。
- 希望发布更接近生产。
- 需要清晰版本和回滚能力。

优点：
- 服务器只负责运行。
- 镜像版本清晰。
- 多台服务器可复用同一镜像。
- 后续容易接 CI/CD。

缺点：
- 需要镜像仓库。
- 需要管理镜像 tag、仓库账号和权限。

### 5.3 临时方案：docker save + scp

流程：

```text
本地 docker build
本地 docker save 成 tar
scp 传到服务器
服务器 docker load
服务器 docker compose up -d
```

适用场景：
- 没有镜像仓库。
- 临时部署一台测试服务器。

不建议长期使用，原因：
- 镜像文件通常较大。
- 多版本管理混乱。
- 多服务器分发低效。
- 回滚和清理依赖人工。

---

## 6. 镜像仓库标准

### 6.1 推荐选择

当前优先使用阿里云 ACR：

- ACR 个人版：适合开发测试，通常免费，但无 SLA。
- ACR 企业版：适合正式生产，有 SLA 和企业级能力。

当前阶段建议：

```text
测试部署：ACR 个人版
正式生产：根据业务稳定性要求评估 ACR 企业版或其他企业镜像仓库
```

### 6.2 镜像命名

推荐命名：

```text
registry.cn-hangzhou.aliyuncs.com/<namespace>/blisstribe-api:<version>
registry.cn-hangzhou.aliyuncs.com/<namespace>/blisstribe-admin:<version>
```

版本 tag 推荐：

```text
v1.0.0
v1.0.1
20260824-001
git-<short-sha>
```

生产不要只依赖 `latest`。`latest` 可以用于测试，但生产 Compose 应使用明确版本。

---

## 7. 本地构建与推送流程

以下为方案 B 的标准流程。

推荐使用脚本发布：

```bash
pnpm deploy:acr
```

脚本会自动完成：
1. 本地类型检查。
2. 构建 `linux/amd64` 的 API/Admin 镜像。
3. 推送到 ACR 公网地址。
4. 同步 `docker-compose.prod.yml` 到服务器。
5. 将服务器 `/opt/blisstribe/.env` 的 `API_IMAGE`、`ADMIN_IMAGE` 更新为 ACR VPC 地址。
6. 在服务器执行 `docker compose pull`、`up -d --no-build`。
7. 执行 `prisma migrate deploy`。
8. 做服务器本机 Admin/API 基础验收。

默认配置：

```bash
TAG=$(date +%Y%m%d%H%M)
PUSH_REGISTRY=crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com
PULL_REGISTRY=crpi-yn27wibgl46ugj8h-vpc.cn-hangzhou.personal.cr.aliyuncs.com
NAMESPACE=pikecode
SSH_HOST=blisstribe-prod
SERVER_DIR=/opt/blisstribe
```

发布指定版本：

```bash
TAG=202608241700 pnpm deploy:acr
```

跳过本地类型检查或数据库迁移：

```bash
RUN_CHECKS=0 pnpm deploy:acr
RUN_MIGRATE=0 pnpm deploy:acr
```

只预演命令，不实际构建、推送或重启：

```bash
DRY_RUN=1 pnpm deploy:acr
```

### 7.1 登录镜像仓库

```bash
docker login crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com
```

ACR 个人版当前地址：
- 本地构建推送使用公网域名：`crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com`
- 阿里云同地域 ECS 拉取可使用 VPC 内网域名：`crpi-yn27wibgl46ugj8h-vpc.cn-hangzhou.personal.cr.aliyuncs.com`

注意：Docker 登录凭据按域名保存。公网域名和 VPC 域名是两个不同登录目标，私有仓库通常需要分别登录。

### 7.2 构建镜像

示例：

```bash
docker buildx build --platform linux/amd64 \
  --build-arg NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
  -f Dockerfile.api \
  -t crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com/pikecode/blisstribe-api:v1.0.0 \
  --load .

docker buildx build --platform linux/amd64 \
  --build-arg NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
  -f Dockerfile.admin \
  -t crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com/pikecode/blisstribe-admin:v1.0.0 \
  --load .
```

如果本机和服务器 CPU 架构一致，可以省略 `--platform`。当前本机 Docker Desktop 是 ARM，服务器是 x86_64，所以必须构建 `linux/amd64` 镜像。

### 7.3 推送镜像

```bash
docker push crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com/pikecode/blisstribe-api:v1.0.0
docker push crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com/pikecode/blisstribe-admin:v1.0.0
```

### 7.4 服务器拉取并启动

```bash
ssh blisstribe-prod
cd /opt/blisstribe
docker compose -f docker-compose.prod.yml pull api admin
docker compose -f docker-compose.prod.yml up -d --no-build
```

---

## 8. Compose 配置要点

服务器只拉镜像运行时，`docker-compose.prod.yml` 应使用 `image`，不要使用 `build`。

对外端口只开放用户需要访问的服务。当前测试部署约定：
- Admin：`80:80`，公网用户访问入口。
- API：`14000:4000`，仅用于临时调试；正常前端请求通过 Admin Nginx 的 `/api/` 反向代理进入 API。
- Postgres：`127.0.0.1:15432:5432`，只允许服务器本机访问。
- Redis：`127.0.0.1:16379:6379`，只允许服务器本机访问。

示例：

```yaml
services:
  api:
    image: crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com/pikecode/blisstribe-api:v1.0.0
    env_file:
      - .env.production
    restart: unless-stopped
    depends_on:
      - redis
    ports:
      - "4000:4000"

  admin:
    image: crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com/pikecode/blisstribe-admin:v1.0.0
    restart: unless-stopped
    ports:
      - "80:80"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data

volumes:
  redisdata:
```

测试环境如果使用容器 PostgreSQL，可加入：

```yaml
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: blisstribe
      POSTGRES_PASSWORD: <strong-password>
      POSTGRES_DB: blisstribe
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 9. 环境变量标准

生产环境变量放在服务器，不提交到 Git。

推荐路径：

```text
/opt/blisstribe/.env.production
```

关键变量：

```env
DATABASE_URL=postgresql://blisstribe:<password>@postgres:5432/blisstribe?schema=public
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
ACCESS_TOKEN_EXPIRES=2h
REFRESH_TOKEN_EXPIRES=7d
RSA_PRIVATE_KEY=<pem-or-secret-ref>
RSA_PUBLIC_KEY=<pem-or-secret-ref>
WX_APP_ID=<wechat-app-id>
WX_APP_SECRET=<wechat-secret>
UPLOAD_DIR=/app/uploads
PUBLIC_BASE_URL=https://api.example.com
CORS_ORIGIN=https://admin.example.com
PORT=4000
```

注意：

```text
Docker Compose 内部访问数据库和 Redis 应使用服务名，不使用 localhost。
```

示例：

```env
DATABASE_URL=postgresql://blisstribe:password@postgres:5432/blisstribe?schema=public
REDIS_URL=redis://redis:6379
```

原因：容器内的 `localhost` 指容器自己，不是其他容器。

---

## 10. 数据库迁移与 Seed

### 10.1 迁移

生产部署后执行：

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @blisstribe/api exec prisma migrate deploy
```

也可以将迁移做成一次性 job，但当前阶段先手动执行，降低复杂度。

### 10.2 Seed

Seed 只用于初始化管理员、协议、基础 RBAC 等数据。生产环境执行前必须确认脚本是幂等的。

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @blisstribe/api prisma:seed
```

---

## 11. 验收标准

每次部署至少执行：

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api
curl -f http://127.0.0.1:14000/api/v1/agreements/current/user
```

如果是测试环境，执行 S2B2C 主链路验收：

```bash
./scripts/e2e-s2b2c.sh
```

注意：该脚本会向测试数据库写入测试用户、测试 B 主体和客户关系数据，不应直接在生产数据库执行。

---

## 12. 回滚标准

回滚基于镜像 tag：

1. 修改 `docker-compose.prod.yml` 中 `api` 和 `admin` 的镜像 tag 为上一版。
2. 执行：

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

注意：
- 应用回滚容易。
- 数据库迁移回滚要谨慎，Prisma 生产迁移默认不自动回滚。
- 涉及破坏性数据库变更时，需要单独制定回滚脚本和备份策略。

---

## 13. CI/CD 演进路线

### 阶段 1：手动部署

```text
本地 build
本地 push
服务器 pull
服务器 up -d
```

适合当前阶段。

### 阶段 2：CI 自动构建镜像

```text
git push
CI build
CI push ACR
人工 SSH 到服务器部署
```

减少本地构建差异，但保留人工发布确认。

### 阶段 3：CI/CD 自动部署

```text
git tag / main 分支合并
CI build
CI push ACR
CI SSH 到服务器
docker compose pull
docker compose up -d
健康检查
```

适合多人协作、频繁发布和正式生产。

### CI/CD Secret 标准

CI 平台中保存：

```text
ACR_REGISTRY
ACR_USERNAME
ACR_PASSWORD
SERVER_HOST
SERVER_USER
SERVER_SSH_KEY
APP_VERSION
```

禁止把密码、密钥、生产 `.env` 提交到 Git。

---

## 14. 当前服务器基线

当前服务器 SSH 别名：

```bash
ssh blisstribe-prod
```

服务器已完成：
- SSH key 免密登录。
- Docker Engine 安装。
- Docker Compose 插件安装。
- Docker 开机自启。
- Docker Hub 镜像加速配置。
- Docker 容器日志轮转配置。

后续部署目录建议：

```text
/opt/blisstribe/
  docker-compose.prod.yml
  .env.production
  nginx/
  uploads/
```

安全加固建议：
- 创建非 root 部署用户。
- 改 root 密码。
- 确认 SSH key 登录后关闭 root 密码登录。
- 配置阿里云安全组，只开放必要端口。
- 生产环境启用 HTTPS。

---

## 15. 后续与 Codex 沟通模板

后续可以直接使用以下模板让我执行部署相关工作。

### 15.1 本地 Docker 部署测试

```text
按照 docs/DEPLOYMENT.md 的发布前本地验收流程，补齐 Dockerfile 和 docker-compose.prod.yml，并在本地完整 Docker 运行一遍。
```

### 15.2 服务器测试部署

```text
按照 docs/DEPLOYMENT.md 的临时镜像包部署方式，在本地构建 linux/amd64 镜像，上传到 blisstribe-prod 的 /opt/blisstribe，使用 docker compose --no-build 启动，完成迁移、seed 和 S2B2C 验收。
```

### 15.3 镜像仓库部署

```text
按照 docs/DEPLOYMENT.md 的方案 B，配置 ACR 镜像名、本地构建并推送镜像，然后在 blisstribe-prod 上拉镜像启动。
```

### 15.4 CI/CD 自动化

```text
按照 docs/DEPLOYMENT.md 的 CI/CD 阶段 2，创建 GitHub Actions/GitLab CI 流程，只自动构建并推送镜像，不自动部署。
```

### 15.5 生产发布前检查

```text
按照 docs/DEPLOYMENT.md 的验收标准，检查当前服务器部署状态、容器日志、数据库迁移状态和健康接口。
```

---

## 16. 当前推荐下一步

按顺序推进：

1. 按 [上线前检查清单](GO_LIVE_CHECKLIST.md) 放行安全组、配置域名和 HTTPS。
2. 修改默认管理员密码和服务器 root 密码。
3. 使用真实微信配置完成小程序联调。
4. 补齐数据库备份、日志和回滚策略。
5. 稳定后再考虑 CI/CD 自动构建和自动部署。
