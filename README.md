# BlissTribe

心悦部落 — 小程序 + 后台管理 + API monorepo。

## 目录结构

```
blisstribe/
├── apps/
│   ├── miniapp/    # 小程序（UniApp + Vue3 + TS）
│   ├── admin/      # 后台管理（Vue3 + Element Plus）
│   └── api/        # 后端 API（NestJS + Prisma + PostgreSQL）
├── packages/
│   └── shared/     # 共享类型 + 错误码
├── docs/           # 设计文档（PRD/架构/API/数据库/前端/安全）
└── docker-compose.yml  # PostgreSQL + Redis
```

## 环境要求

- Node.js >= 20
- pnpm >= 10
- 本机数据库可使用 Docker Compose，或 macOS 上的 Homebrew PostgreSQL 17 + Redis

## 快速开始

### 1. 启动数据库（二选一）

```bash
pnpm docker:up        # 启动 PostgreSQL + Redis
```

macOS 也可以使用 Homebrew 本机服务（需预先安装 `postgresql@17` 和 `redis`）：

```bash
brew install postgresql@17 redis
```

服务会由下面的 `pnpm dev:local` 启动并检查就绪状态。

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置 API 环境变量

```bash
cp apps/api/.env.example apps/api/.env
# 填入微信 appid/secret、RSA 密钥对等
```

### 4. 初始化数据库

```bash
pnpm db:generate      # 生成 Prisma Client
pnpm db:migrate       # 执行迁移
pnpm --filter @blisstribe/api prisma:seed   # 创建初始管理员 + 协议
```

管理员默认账号：`admin / admin123`

### 5. 启动开发服务

**Docker 环境**：自动检查 Docker → 启动数据库 → 启动 API + Admin

```bash
./scripts/dev.sh
```

**macOS + Homebrew 环境（不需要 Docker）**：检查并启动本机 PostgreSQL/Redis、等待就绪、执行未应用迁移后启动 API + Admin。该脚本不会重置数据库。

```bash
pnpm dev:local
```

如果还要同时监听小程序编译：

```bash
pnpm dev:all
```

或手动分别启动：

```bash
pnpm dev:api          # 后端 API → http://localhost:4000
pnpm dev:admin        # 后台管理 → http://localhost:5174
pnpm dev:miniapp      # 小程序（需微信开发者工具导入 dist/dev/mp-weixin）
```

## 文档

详见 `docs/` 目录：

- [PRD](docs/PRD.md) — 产品需求
- [系统架构](docs/ARCHITECTURE.md)
- [API 设计](docs/API.md)
- [数据库设计](docs/DATABASE.md)
- [前端架构](docs/FRONTEND.md)
- [安全设计](docs/SECURITY.md)
- [Docker 部署标准](docs/DEPLOYMENT.md)
- [上线前检查清单](docs/GO_LIVE_CHECKLIST.md)
- [产品精准推荐阶段路线图](docs/plans/2026-08-25-product-recommendation-roadmap.md)

## 技术栈

| 模块 | 技术 |
|------|------|
| 小程序 | UniApp 3 + Vue 3 + TypeScript + Pinia + uni-ui |
| 后台 | Vue 3 + Element Plus + Vite + ECharts |
| API | NestJS + Prisma + PostgreSQL + Redis |
| 共享 | pnpm workspace + @blisstribe/shared |
