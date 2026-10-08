#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PG_SERVICE="${PG_SERVICE:-postgresql@17}"
PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

fail() { printf '[dev-local] 错误：%s\n' "$1" >&2; exit 1; }
log() { printf '[dev-local] %s\n' "$1"; }

[[ "$(uname -s)" == "Darwin" ]] || fail '此脚本用于 macOS + Homebrew；其他系统请使用 ./scripts/dev.sh。'
command -v brew >/dev/null || fail '未找到 Homebrew。'
command -v pnpm >/dev/null || fail '未找到 pnpm。'
command -v pg_isready >/dev/null || fail '未找到 pg_isready，请安装 PostgreSQL 客户端并加入 PATH。'
command -v redis-cli >/dev/null || fail '未找到 redis-cli，请安装 Redis 并加入 PATH。'
[[ -f apps/api/.env ]] || fail '缺少 apps/api/.env；请先从 apps/api/.env.example 创建并配置。'
brew list --versions "$PG_SERVICE" >/dev/null 2>&1 || fail "未安装 Homebrew 服务 $PG_SERVICE（可用 PG_SERVICE 指定已安装版本）。"
brew list --versions redis >/dev/null 2>&1 || fail '未安装 Homebrew Redis；请先安装 redis。'

wait_for() {
  local name="$1"
  shift
  for _ in {1..30}; do
    if "$@" >/dev/null 2>&1; then
      log "$name 已就绪"
      return 0
    fi
    sleep 1
  done
  fail "$name 未就绪；请检查 Homebrew 服务状态和端口配置。"
}
redis_ready() {
  [[ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null)" == "PONG" ]]
}

if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" >/dev/null 2>&1; then
  log "启动 Homebrew PostgreSQL（$PG_SERVICE）"
  brew services start "$PG_SERVICE"
fi
wait_for PostgreSQL pg_isready -h "$PG_HOST" -p "$PG_PORT"

if ! redis_ready; then
  log '启动 Homebrew Redis'
  brew services start redis
fi
wait_for Redis redis_ready

log '应用待执行的数据库迁移（不会重置或清空数据）'
pnpm --filter @blisstribe/api exec prisma migrate deploy
pnpm db:generate
pnpm --filter @blisstribe/shared build

log '启动 API（:4000）和管理后台（:5174）；按 Ctrl+C 停止'
exec pnpm dev
