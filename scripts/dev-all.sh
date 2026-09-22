#!/bin/bash

# 启动所有开发服务（API、Admin、MiniApp）
# 需要三个终端窗口

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}启动所有开发服务${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查依赖
cd "$PROJECT_ROOT"
if [ ! -d "node_modules" ]; then
  echo "安装全局依赖..."
  pnpm install
fi

echo ""
echo -e "${YELLOW}正在启动各服务...${NC}"
echo ""

# 启动 API (端口 3000)
echo -e "${GREEN}[1/3] 启动 API 后端 (port 3000)${NC}"
(
  cd apps/api
  pnpm install 2>/dev/null
  npm run start:dev
) &
API_PID=$!
echo "      PID: $API_PID"
sleep 2

# 启动 Admin (端口 5173)
echo -e "${GREEN}[2/3] 启动 Admin 后台 (port 5173)${NC}"
(
  cd apps/admin
  pnpm install 2>/dev/null
  npm run dev
) &
ADMIN_PID=$!
echo "      PID: $ADMIN_PID"
sleep 2

# 启动 MiniApp (可选，端口 5174+)
echo -e "${GREEN}[3/3] 启动 MiniApp 小程序 (port 5174+)${NC}"
(
  cd apps/miniapp
  pnpm install 2>/dev/null
  npm run dev
) &
MINIAPP_PID=$!
echo "      PID: $MINIAPP_PID"
sleep 2

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}【所有服务已启动】${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "API Backend:    http://localhost:3000"
echo "Admin Frontend: http://localhost:5173"
echo "MiniApp Dev:    http://localhost:5174+"
echo ""
echo -e "${YELLOW}进程 PID:${NC}"
echo "  API:     $API_PID"
echo "  Admin:   $ADMIN_PID"
echo "  MiniApp: $MINIAPP_PID"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo ""

# 清理函数
cleanup() {
  echo ""
  echo -e "${YELLOW}关闭所有服务...${NC}"
  kill $API_PID $ADMIN_PID $MINIAPP_PID 2>/dev/null || true
  wait $API_PID $ADMIN_PID $MINIAPP_PID 2>/dev/null || true
  echo -e "${GREEN}✓ 所有服务已关闭${NC}"
}

trap cleanup EXIT SIGINT SIGTERM

# 保持运行
wait
