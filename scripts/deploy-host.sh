#!/usr/bin/env bash

set -euo pipefail

SSH_HOST="${SSH_HOST:-blisstribe-prod}"
SERVER_DIR="${SERVER_DIR:-/opt/blisstribe}"
TAG="${TAG:-$(date +%Y%m%d%H%M%S)}"
RELEASE_DIR="$SERVER_DIR/releases/$TAG"
CUTOVER="${CUTOVER:-1}"

log() { printf '[deploy-host] %s\n' "$1"; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "缺少命令: $1" >&2; exit 1; }; }

require_cmd rsync
require_cmd ssh
require_cmd pnpm

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf '%s\n' '用法: ./scripts/deploy-host.sh' '环境变量: SSH_HOST、SERVER_DIR、TAG'
  exit 0
fi

log "本地构建 Admin 静态文件"
VITE_API_BASE_URL="${ADMIN_API_BASE_URL:-https://api.ytxybl.com/api/v1}" \
  pnpm --filter @blisstribe/admin build

log "检查服务器 Node.js 和 pnpm"
ssh "$SSH_HOST" 'command -v node >/dev/null && command -v pnpm >/dev/null || { echo "服务器缺少 Node.js 或 pnpm，请先完成宿主机初始化" >&2; exit 1; }'

log "同步代码到 $SSH_HOST:$RELEASE_DIR"
ssh "$SSH_HOST" "mkdir -p '$RELEASE_DIR'"
ssh "$SSH_HOST" "chmod 755 '$SERVER_DIR' '$SERVER_DIR/releases'"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'apps/api/.env' \
  --exclude '.env*' \
  --exclude 'apps/miniapp/dist' \
  ./ "$SSH_HOST:$RELEASE_DIR/"

log "服务器安装依赖并构建"
ssh "$SSH_HOST" "cd '$RELEASE_DIR' && \
  pnpm install --frozen-lockfile && \
  pnpm --filter @blisstribe/shared build && \
  pnpm --filter @blisstribe/api exec prisma generate && \
  pnpm --filter @blisstribe/api build"

if [ "$CUTOVER" = "1" ]; then
  log "执行数据库迁移"
  ssh "$SSH_HOST" "cd '$RELEASE_DIR' && \
    set -a && . /etc/blisstribe/api.env && set +a && \
    pnpm --filter @blisstribe/api exec prisma migrate deploy"

  log "切换当前版本并重启 API"
  ssh "$SSH_HOST" "ln -sfn '$RELEASE_DIR' '$SERVER_DIR/current' && \
    systemctl restart blisstribe-api && \
    systemctl is-active --quiet blisstribe-api && \
    curl -fsS http://127.0.0.1:14000/api/v1/agreements/current/user >/dev/null"
else
  log "已完成构建，跳过生产数据库迁移和版本切换: CUTOVER=$CUTOVER"
fi

log "发布完成: $TAG"
