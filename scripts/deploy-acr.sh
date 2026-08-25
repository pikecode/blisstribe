#!/usr/bin/env bash
# ACR 发布脚本：本地构建并推送镜像，服务器从 ACR 拉取并重启。
set -euo pipefail

cd "$(dirname "$0")/.."

TAG="${TAG:-$(date +%Y%m%d%H%M)}"
PLATFORM="${PLATFORM:-linux/amd64}"
NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-https://registry.npmmirror.com}"

PUSH_REGISTRY="${PUSH_REGISTRY:-crpi-yn27wibgl46ugj8h.cn-hangzhou.personal.cr.aliyuncs.com}"
PULL_REGISTRY="${PULL_REGISTRY:-crpi-yn27wibgl46ugj8h-vpc.cn-hangzhou.personal.cr.aliyuncs.com}"
NAMESPACE="${NAMESPACE:-pikecode}"

API_REPO="${API_REPO:-blisstribe-api}"
ADMIN_REPO="${ADMIN_REPO:-blisstribe-admin}"

SSH_HOST="${SSH_HOST:-blisstribe-prod}"
SERVER_DIR="${SERVER_DIR:-/opt/blisstribe}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

RUN_CHECKS="${RUN_CHECKS:-1}"
RUN_MIGRATE="${RUN_MIGRATE:-1}"
DRY_RUN="${DRY_RUN:-0}"

API_PUSH_IMAGE="${PUSH_REGISTRY}/${NAMESPACE}/${API_REPO}:${TAG}"
ADMIN_PUSH_IMAGE="${PUSH_REGISTRY}/${NAMESPACE}/${ADMIN_REPO}:${TAG}"
API_PULL_IMAGE="${PULL_REGISTRY}/${NAMESPACE}/${API_REPO}:${TAG}"
ADMIN_PULL_IMAGE="${PULL_REGISTRY}/${NAMESPACE}/${ADMIN_REPO}:${TAG}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy-acr]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err() { echo -e "${RED}[err]${NC} $1"; }

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "+ $*"
  else
    "$@"
  fi
}

run_ssh() {
  local command="$1"
  if [ "$DRY_RUN" = "1" ]; then
    echo "+ ssh $SSH_HOST $command"
  else
    ssh "$SSH_HOST" "$command"
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少命令：$1"
    exit 1
  fi
}

require_cmd docker
require_cmd ssh
require_cmd scp

if [ "$DRY_RUN" != "1" ] && ! docker info >/dev/null 2>&1; then
  err "Docker 未启动，无法构建和推送镜像"
  exit 1
fi

log "发布版本：${TAG}"
log "本地 push 镜像：${API_PUSH_IMAGE}"
log "本地 push 镜像：${ADMIN_PUSH_IMAGE}"
log "服务器 pull 镜像：${API_PULL_IMAGE}"
log "服务器 pull 镜像：${ADMIN_PULL_IMAGE}"

if [ "$RUN_CHECKS" = "1" ]; then
  log "执行本地类型检查"
  run pnpm type-check
else
  warn "已跳过本地检查：RUN_CHECKS=${RUN_CHECKS}"
fi

log "构建 API 镜像"
run docker buildx build --platform "$PLATFORM" \
  --build-arg "NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}" \
  -f Dockerfile.api \
  -t "$API_PUSH_IMAGE" \
  --load .

log "构建 Admin 镜像"
run docker buildx build --platform "$PLATFORM" \
  --build-arg "NPM_CONFIG_REGISTRY=${NPM_CONFIG_REGISTRY}" \
  -f Dockerfile.admin \
  -t "$ADMIN_PUSH_IMAGE" \
  --load .

log "推送 API 镜像到 ACR"
run docker push "$API_PUSH_IMAGE"

log "推送 Admin 镜像到 ACR"
run docker push "$ADMIN_PUSH_IMAGE"

log "同步 Compose 文件到服务器"
run_ssh "mkdir -p '$SERVER_DIR'"
run scp "$COMPOSE_FILE" "$SSH_HOST:$SERVER_DIR/$COMPOSE_FILE"

log "更新服务器镜像 tag"
run_ssh "cd '$SERVER_DIR' && \
  touch .env && chmod 600 .env && \
  set_env_var() { key=\"\$1\"; value=\"\$2\"; tmp=\$(mktemp); awk -v k=\"\$key\" -v v=\"\$value\" 'BEGIN { found=0 } \$0 ~ \"^\" k \"=\" { print k \"=\" v; found=1; next } { print } END { if (!found) print k \"=\" v }' .env > \"\$tmp\" && mv \"\$tmp\" .env; }; \
  set_env_var API_IMAGE '$API_PULL_IMAGE'; \
  set_env_var ADMIN_IMAGE '$ADMIN_PULL_IMAGE'"

log "服务器拉取新镜像"
run_ssh "cd '$SERVER_DIR' && docker compose -f '$COMPOSE_FILE' pull api admin"

log "服务器重启服务"
run_ssh "cd '$SERVER_DIR' && docker compose -f '$COMPOSE_FILE' up -d --no-build"

if [ "$RUN_MIGRATE" = "1" ]; then
  log "执行数据库迁移"
  run_ssh "cd '$SERVER_DIR' && docker compose -f '$COMPOSE_FILE' exec -T api pnpm --filter @blisstribe/api exec prisma migrate deploy"
else
  warn "已跳过数据库迁移：RUN_MIGRATE=${RUN_MIGRATE}"
fi

log "执行服务器基础验收"
run_ssh "cd '$SERVER_DIR' && \
  docker compose -f '$COMPOSE_FILE' ps && \
  curl -fsSI http://localhost | head -n 5 && \
  curl -fsS http://localhost/api/v1/agreements/current/user >/dev/null"

log "发布完成：${TAG}"
