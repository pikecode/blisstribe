#!/usr/bin/env bash
# 一键启动开发环境：检查 Docker → 启动 DB → 启动 API + Admin
set -e

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[err]${NC} $1"; }

# 1. 检查 Docker
if ! command -v docker &>/dev/null; then
  err "未安装 Docker，请先安装：https://docs.docker.com/get-docker"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  err "Docker daemon 未运行，请先启动 Docker Desktop"
  exit 1
fi

# 2. 启动数据库（若未启动）
if ! docker compose ps | grep -q "blisstribe-db"; then
  log "启动 PostgreSQL + Redis ..."
  docker compose up -d
else
  log "数据库已在运行"
fi

# 3. 等待 PostgreSQL 就绪
log "等待 PostgreSQL 就绪 ..."
for i in $(seq 1 15); do
  if docker exec blisstribe-db pg_isready -U blisstribe &>/dev/null 2>&1; then
    log "PostgreSQL 就绪"
    break
  fi
  sleep 2
  if [ "$i" -eq 15 ]; then
    err "PostgreSQL 启动超时"
    exit 1
  fi
done

# 4. 检查 .env
if [ ! -f apps/api/.env ]; then
  warn "apps/api/.env 不存在，从 .env.example 复制"
  cp apps/api/.env.example apps/api/.env
  warn "请编辑 apps/api/.env 填入真实配置后重新运行"
fi

# 5. 检查 Prisma Client
if [ ! -d node_modules/.pnpm/@prisma+client@* ]; then
  log "生成 Prisma Client ..."
  pnpm db:generate
fi

# 5.5 构建 shared 包（API 用 CJS 产物）
if [ ! -f packages/shared/dist/index.js ]; then
  log "构建 @blisstribe/shared ..."
  pnpm --filter @blisstribe/shared build
fi

# 6. 启动 API + Admin
echo ""
log "启动 API (:4000) + Admin (:5174)"
log "API:    http://localhost:4000/api/v1"
log "Admin:  http://localhost:5174  (账号 admin / admin123)"
log "按 Ctrl+C 停止所有服务"
echo ""

trap 'warn "正在停止服务..."; kill 0 2>/dev/null' EXIT INT TERM

pnpm dev
