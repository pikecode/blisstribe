#!/usr/bin/env bash
#
# BlissTribe 本地开发启动脚本
#
# 用法:
#   ./start.sh                 启动依赖容器、API、Admin、小程序开发编译
#   ./start.sh api             仅启动 API
#   ./start.sh admin           仅启动 Admin
#   ./start.sh miniapp         仅启动小程序开发编译
#   ./start.sh api admin       启动 API + Admin
#   ./start.sh infra           仅启动 Postgres + Redis
#   ./start.sh stop            停止本脚本启动的应用进程
#   ./start.sh restart         重启本地应用进程
#   ./start.sh status          查看本地状态
#
# 常用开关:
#   SKIP_INFRA=1 ./start.sh    不检查/启动 Docker 依赖
#   RUN_MIGRATE=0 ./start.sh   不应用 Prisma 迁移
#   RUN_SEED=1 ./start.sh      启动前刷新种子数据
#   API_PORT=4001 ./start.sh   修改 API 端口
#   ADMIN_PORT=5175 ./start.sh 修改 Admin 端口
#

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

API_PORT="${API_PORT:-4000}"
ADMIN_PORT="${ADMIN_PORT:-5174}"
MINIAPP_PORT="${MINIAPP_PORT:-5173}"
SKIP_INFRA="${SKIP_INFRA:-0}"
RUN_MIGRATE="${RUN_MIGRATE:-1}"
RUN_SEED="${RUN_SEED:-0}"

log() {
  echo -e "${BLUE}[start]${NC} $1"
}

ok() {
  echo -e "${GREEN}[ok]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[warn]${NC} $1"
}

err() {
  echo -e "${RED}[err]${NC} $1"
}

show_help() {
  cat <<EOF
BlissTribe 本地开发启动脚本

用法:
  ./start.sh [命令或服务...]

服务:
  infra     启动 Docker 依赖: Postgres + Redis
  api       启动 API 服务: http://localhost:${API_PORT}/api/v1
  admin     启动后台管理: http://localhost:${ADMIN_PORT}
  miniapp   启动小程序开发编译
  all       启动 infra + api + admin + miniapp，默认命令

命令:
  stop      停止本脚本启动的 api/admin/miniapp 进程
  restart   重启本地应用进程，确保加载最新代码
  status    查看端口、PID、Docker 依赖状态
  logs      查看日志
  clean     清理日志和 PID 文件
  help      查看帮助

环境变量:
  API_PORT=4001
  ADMIN_PORT=5175
  MINIAPP_PORT=5173
  SKIP_INFRA=1
  RUN_MIGRATE=0
  RUN_SEED=1

示例:
  ./start.sh
  ./start.sh api admin
  RUN_SEED=1 ./start.sh
  SKIP_INFRA=1 RUN_MIGRATE=0 ./start.sh api
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少命令: $1"
    exit 1
  fi
}

check_dependencies() {
  require_cmd node
  require_cmd pnpm
  require_cmd lsof
}

check_port() {
  local port="$1"
  lsof -Pi ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1
}

port_pids() {
  local port="$1"
  lsof -Pi ":${port}" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' '
}

is_pid_alive() {
  local pid="$1"
  [ -n "${pid}" ] && kill -0 "${pid}" >/dev/null 2>&1
}

pid_for() {
  local name="$1"
  local pid_file="$PID_DIR/${name}.pid"
  [ -f "${pid_file}" ] && cat "${pid_file}" || true
}

is_service_running_by_pid() {
  local name="$1"
  local pid
  pid="$(pid_for "${name}")"
  is_pid_alive "${pid}"
}

child_pids() {
  local pid="$1"
  pgrep -P "${pid}" 2>/dev/null || true
}

kill_process_tree() {
  local pid="$1"
  local child

  for child in $(child_pids "${pid}"); do
    kill_process_tree "$child"
  done

  if is_pid_alive "${pid}"; then
    kill "${pid}" >/dev/null 2>&1 || true
  fi
}

wait_for_port() {
  local name="$1"
  local port="$2"
  local seconds="${3:-30}"

  for _ in $(seq 1 "$seconds"); do
    if check_port "${port}"; then
      return 0
    fi
    sleep 1
  done

  err "${name} 启动超时，端口 ${port} 未监听。日志: $LOG_DIR/${name}.log"
  return 1
}

wait_for_pid_alive() {
  local name="$1"
  local seconds="${2:-10}"
  local pid

  for _ in $(seq 1 "$seconds"); do
    pid="$(pid_for "${name}")"
    if is_pid_alive "${pid}"; then
      return 0
    fi
    sleep 1
  done

  err "${name} 启动失败。日志: $LOG_DIR/${name}.log"
  return 1
}

ensure_root_dependencies() {
  if [ ! -d "$ROOT_DIR/node_modules" ]; then
    log "安装工作区依赖"
    pnpm install
  fi
}

ensure_env_file() {
  if [ ! -f "$ROOT_DIR/apps/api/.env" ]; then
    warn "未找到 apps/api/.env，请先根据项目环境配置数据库、Redis 和密钥"
  fi
}

docker_compose() {
  docker compose "$@"
}

ensure_infra() {
  if [ "$SKIP_INFRA" = "1" ]; then
    warn "已跳过 Docker 依赖检查: SKIP_INFRA=1"
    return
  fi

  require_cmd docker

  if ! docker info >/dev/null 2>&1; then
    err "Docker 未启动。请先打开 Docker Desktop，再重试 ./start.sh"
    exit 1
  fi

  log "启动 Postgres + Redis"
  docker_compose up -d postgres redis
  ok "Docker 依赖已启动"
}

run_database_prepare() {
  if [ "$RUN_MIGRATE" = "1" ]; then
    log "应用数据库迁移"
    pnpm --filter @blisstribe/api exec prisma migrate deploy
  else
    warn "已跳过数据库迁移: RUN_MIGRATE=0"
  fi

  if [ "$RUN_SEED" = "1" ]; then
    log "刷新种子数据"
    pnpm --filter @blisstribe/api prisma:seed
  fi
}

start_process() {
  local name="$1"
  local workdir="$2"
  local log_file="$LOG_DIR/${name}.log"
  shift 2

  if is_service_running_by_pid "${name}"; then
    warn "${name} 已由 start.sh 启动，PID: $(pid_for "${name}")"
    return
  fi

  log "启动 ${name}"
  nohup bash -c 'cd "$1"; shift; exec "$@"' _ "$workdir" "$@" </dev/null > "$log_file" 2>&1 &
  echo $! > "$PID_DIR/${name}.pid"
}

start_api() {
  if check_port "$API_PORT"; then
    warn "API 端口 $API_PORT 已被占用，PID: $(port_pids "$API_PORT")"
    return
  fi

  ensure_root_dependencies
  ensure_env_file
  start_process "api" "$ROOT_DIR/apps/api" env PORT="$API_PORT" pnpm dev
  wait_for_port "api" "$API_PORT" 40
  ok "API 已启动: http://localhost:${API_PORT}/api/v1"
}

start_admin() {
  if check_port "$ADMIN_PORT"; then
    warn "Admin 端口 $ADMIN_PORT 已被占用，PID: $(port_pids "$ADMIN_PORT")"
    return
  fi

  ensure_root_dependencies
  start_process "admin" "$ROOT_DIR/apps/admin" pnpm exec vite --host 0.0.0.0 --port "$ADMIN_PORT"
  wait_for_port "admin" "$ADMIN_PORT" 40
  ok "Admin 已启动: http://localhost:${ADMIN_PORT}"
}

start_miniapp() {
  ensure_root_dependencies
  start_process "miniapp" "$ROOT_DIR/apps/miniapp" pnpm dev:mp-weixin
  wait_for_pid_alive "miniapp" 10

  if check_port "$MINIAPP_PORT"; then
    ok "Miniapp 开发服务已启动: http://localhost:${MINIAPP_PORT}"
  else
    ok "Miniapp 开发编译已启动，请在微信开发者工具导入 dist/dev/mp-weixin"
  fi
}

stop_service() {
  local name="$1"
  local pid_file="$PID_DIR/${name}.pid"
  local pid

  if [ ! -f "${pid_file}" ]; then
    warn "${name} 没有 PID 文件"
    return
  fi

  pid="$(cat "${pid_file}")"
  if is_pid_alive "${pid}"; then
    kill_process_tree "${pid}"
    ok "已停止 ${name}，PID: ${pid}"
  else
    warn "${name} PID 已失效: ${pid}"
  fi
  rm -f "${pid_file}"
}

stop_all() {
  log "停止本地应用进程"
  stop_service api
  stop_service admin
  stop_service miniapp
}

restart_all() {
  stop_all
  start_all
}

show_one_status() {
  local name="$1"
  local port="${2:-}"
  local pid
  pid="$(pid_for "${name}")"

  if [ -n "${port}" ] && check_port "${port}"; then
    echo -e "  ${GREEN}●${NC} ${name} 端口 ${port} 运行中，监听 PID: $(port_pids "${port}")"
  elif is_pid_alive "${pid}"; then
    echo -e "  ${GREEN}●${NC} ${name} 进程运行中，PID: ${pid}"
  else
    echo -e "  ${RED}○${NC} ${name} 未运行"
  fi
}

show_infra_status() {
  if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo -e "  ${YELLOW}○${NC} docker 未启动或不可用"
    return
  fi

  docker_compose ps postgres redis
}

show_status() {
  log "本地服务状态"
  show_one_status api "$API_PORT"
  show_one_status admin "$ADMIN_PORT"
  show_one_status miniapp "$MINIAPP_PORT"
  echo ""
  show_infra_status
}

show_logs() {
  if ls "$LOG_DIR"/*.log >/dev/null 2>&1; then
    tail -f "$LOG_DIR"/*.log
  else
    warn "暂无日志文件"
  fi
}

clean_logs() {
  log "清理日志和 PID 文件"
  rm -rf "$LOG_DIR" "$PID_DIR"
  mkdir -p "$LOG_DIR" "$PID_DIR"
  ok "清理完成"
}

start_all() {
  ensure_infra
  run_database_prepare
  start_api
  start_admin
  start_miniapp
  echo ""
  ok "本地开发服务已启动"
  show_status
}

start_selected_services() {
  local ran_infra=0
  local needs_infra=0
  local needs_db_prepare=0

  for arg in "$@"; do
    case "$arg" in
      infra)
        ensure_infra
        ran_infra=1
        ;;
      api)
        needs_infra=1
        needs_db_prepare=1
        ;;
      admin|miniapp) ;;
      *)
        err "未知命令或服务: $arg"
        show_help
        exit 1
        ;;
    esac
  done

  if [ "$RUN_SEED" = "1" ]; then
    needs_infra=1
  fi

  if [ "$needs_infra" = "1" ] && [ "$ran_infra" = "0" ] && [ "$SKIP_INFRA" != "1" ]; then
    ensure_infra
  fi

  if [ "$needs_db_prepare" = "1" ] || [ "$RUN_SEED" = "1" ]; then
    run_database_prepare
  fi

  for arg in "$@"; do
    case "$arg" in
      api) start_api ;;
      admin) start_admin ;;
      miniapp) start_miniapp ;;
      infra) ;;
    esac
  done
}

main() {
  check_dependencies

  case "${1:-all}" in
    help|--help|-h)
      show_help
      ;;
    stop)
      stop_all
      ;;
    restart)
      restart_all
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs
      ;;
    clean)
      clean_logs
      ;;
    all)
      start_all
      ;;
    api|admin|miniapp|infra)
      start_selected_services "$@"
      ;;
    *)
      start_selected_services "$@"
      ;;
  esac
}

main "$@"
