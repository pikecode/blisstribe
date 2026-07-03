#!/usr/bin/env bash
#
# BlissTribe 一键启动脚本
# 同时启动: API (NestJS) + Admin (Vite) + Miniapp (uni-app)
#
# 用法:
#   ./start.sh          # 启动全部服务
#   ./start.sh api      # 仅启动 API
#   ./start.sh admin    # 仅启动 Admin
#   ./start.sh miniapp  # 仅启动 Miniapp
#   ./start.sh api admin # 启动 API + Admin
#

set -euo pipefail

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 日志文件
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

# 进程 PID 文件
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$PID_DIR"

# 帮助信息
show_help() {
  echo "BlissTribe 一键启动脚本"
  echo ""
  echo "用法: ./start.sh [服务...]"
  echo ""
  echo "服务选项:"
  echo "  api       启动 API 服务 (NestJS, port 4000)"
  echo "  admin     启动后台管理 (Vite, port 5174)"
  echo "  miniapp   启动小程序开发 (uni-app, port 5173)"
  echo "  all       启动所有服务 (默认)"
  echo ""
  echo "其他命令:"
  echo "  stop      停止所有服务"
  echo "  status    查看服务状态"
  echo "  logs      查看所有日志"
  echo "  clean     清理日志和 PID 文件"
  echo ""
  echo "示例:"
  echo "  ./start.sh              # 启动所有服务"
  echo "  ./start.sh api admin    # 仅启动 API + Admin"
  echo "  ./start.sh stop         # 停止所有服务"
}

# 检查依赖
check_dependencies() {
  if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: 未找到 pnpm，请先安装: npm install -g pnpm${NC}"
    exit 1
  fi

  if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js${NC}"
    exit 1
  fi
}

# 检查端口是否被占用
check_port() {
  local port=$1
  if lsof -Pi ":$port" -sTCP:LISTEN -t &> /dev/null; then
    return 0
  fi
  return 1
}

# 启动 API 服务
start_api() {
  if check_port 4000; then
    echo -e "${YELLOW}⚠️  API 服务已在端口 4000 运行${NC}"
    return
  fi

  echo -e "${BLUE}🚀 启动 API 服务 (NestJS)...${NC}"
  cd "$ROOT_DIR/apps/api"

  # 检查 node_modules
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 正在安装 API 依赖...${NC}"
    pnpm install
  fi

  # 检查 .env
  if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件，请复制 .env.example 并配置${NC}"
  fi

  nohup pnpm dev > "$LOG_DIR/api.log" 2>&1 &
  echo $! > "$PID_DIR/api.pid"

  # 等待服务启动
  echo -e "${BLUE}⏳ 等待 API 服务启动...${NC}"
  for i in {1..30}; do
    if check_port 4000; then
      echo -e "${GREEN}✅ API 服务已启动: http://localhost:4000/api/v1${NC}"
      return
    fi
    sleep 1
  done
  echo -e "${RED}❌ API 服务启动超时，请检查日志: $LOG_DIR/api.log${NC}"
}

# 启动 Admin 服务
start_admin() {
  if check_port 5174; then
    echo -e "${YELLOW}⚠️  Admin 服务已在端口 5174 运行${NC}"
    return
  fi

  echo -e "${BLUE}🚀 启动 Admin 后台管理 (Vite)...${NC}"
  cd "$ROOT_DIR/apps/admin"

  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 正在安装 Admin 依赖...${NC}"
    pnpm install
  fi

  nohup pnpm dev > "$LOG_DIR/admin.log" 2>&1 &
  echo $! > "$PID_DIR/admin.pid"

  echo -e "${BLUE}⏳ 等待 Admin 服务启动...${NC}"
  for i in {1..30}; do
    if check_port 5174; then
      echo -e "${GREEN}✅ Admin 后台已启动: http://localhost:5174${NC}"
      return
    fi
    sleep 1
  done
  echo -e "${RED}❌ Admin 服务启动超时，请检查日志: $LOG_DIR/admin.log${NC}"
}

# 启动 Miniapp 服务
start_miniapp() {
  if check_port 5173; then
    echo -e "${YELLOW}⚠️  Miniapp 服务已在端口 5173 运行${NC}"
    return
  fi

  echo -e "${BLUE}🚀 启动 Miniapp 小程序开发 (uni-app)...${NC}"
  cd "$ROOT_DIR/apps/miniapp"

  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 正在安装 Miniapp 依赖...${NC}"
    pnpm install
  fi

  nohup pnpm dev:mp-weixin > "$LOG_DIR/miniapp.log" 2>&1 &
  echo $! > "$PID_DIR/miniapp.pid"

  echo -e "${BLUE}⏳ 等待 Miniapp 服务启动...${NC}"
  for i in {1..30}; do
    if check_port 5173; then
      echo -e "${GREEN}✅ Miniapp 开发服务已启动: http://localhost:5173${NC}"
      return
    fi
    sleep 1
  done
  echo -e "${RED}❌ Miniapp 服务启动超时，请检查日志: $LOG_DIR/miniapp.log${NC}"
}

# 停止指定服务
stop_service() {
  local name=$1
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo -e "${GREEN}🛑 已停止 $name 服务${NC}"
    fi
    rm -f "$pid_file"
  fi
}

# 停止所有服务
stop_all() {
  echo -e "${BLUE}🛑 停止所有服务...${NC}"
  stop_service "api"
  stop_service "admin"
  stop_service "miniapp"
  echo -e "${GREEN}✅ 所有服务已停止${NC}"
}

# 查看服务状态
show_status() {
  echo -e "${BLUE}📊 服务状态:${NC}"
  echo ""

  local services=("api:4000" "admin:5174" "miniapp:5173")
  for service in "${services[@]}"; do
    local name=$(echo "$service" | cut -d: -f1)
    local port=$(echo "$service" | cut -d: -f2)

    if check_port "$port"; then
      echo -e "  ${GREEN}●${NC} $name (端口 $port) - 运行中"
    else
      echo -e "  ${RED}○${NC} $name (端口 $port) - 未运行"
    fi
  done
}

# 查看日志
show_logs() {
  if [ -d "$LOG_DIR" ]; then
    tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "暂无日志文件"
  fi
}

# 清理日志和 PID
 clean_logs() {
  echo -e "${BLUE}🧹 清理日志和 PID 文件...${NC}"
  rm -rf "$LOG_DIR" "$PID_DIR"
  echo -e "${GREEN}✅ 清理完成${NC}"
}

# 主逻辑
main() {
  check_dependencies

  case "${1:-all}" in
    help|--help|-h)
      show_help
      ;;
    stop)
      stop_all
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
      start_api
      start_admin
      start_miniapp
      echo ""
      echo -e "${GREEN}🎉 所有服务已启动！${NC}"
      echo ""
      show_status
      ;;
    api)
      start_api
      ;;
    admin)
      start_admin
      ;;
    miniapp)
      start_miniapp
      ;;
    *)
      # 解析多个服务参数
      for arg in "$@"; do
        case "$arg" in
          api) start_api ;;
          admin) start_admin ;;
          miniapp) start_miniapp ;;
        esac
      done
      ;;
  esac
}

main "$@"
