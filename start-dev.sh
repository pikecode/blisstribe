#!/bin/bash
# BlissTribe 本地开发启动脚本
# 用法: bash start-dev.sh

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

API_PORT=4000
ADMIN_PORT=5174

echo "════════════════════════════════════════════"
echo "  BlissTribe 开发环境启动"
echo "════════════════════════════════════════════"

# 1. 清理端口占用
echo "→ 清理端口 $API_PORT / $ADMIN_PORT ..."
lsof -ti:$API_PORT,$ADMIN_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# 2. 生成 Prisma Client
echo "→ 生成 Prisma Client ..."
(cd apps/api && pnpm prisma generate >/dev/null 2>&1) || echo "  ⚠ prisma generate 跳过"

# 3. 启动 API（后台）
echo "→ 启动 API (端口 $API_PORT) ..."
(cd apps/api && pnpm run dev > /tmp/blisstribe-api.log 2>&1 &)

# 4. 等待 API 就绪
echo "→ 等待 API 就绪 ..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$API_PORT/api/v1/shop/products" >/dev/null 2>&1; then
    echo "  ✓ API 已就绪"
    break
  fi
  sleep 1
done

# 5. 启动 Admin（后台）
echo "→ 启动 Admin 后台 (端口 $ADMIN_PORT) ..."
(cd apps/admin && pnpm run dev > /tmp/blisstribe-admin.log 2>&1 &)
sleep 5

echo ""
echo "════════════════════════════════════════════"
echo "  ✓ 启动完成"
echo "════════════════════════════════════════════"
echo "  API:    http://localhost:$API_PORT/api/v1"
echo "  Admin:  http://localhost:$ADMIN_PORT"
echo ""
echo "  管理员账号: admin / admin123"
echo ""
echo "  日志文件:"
echo "    API   → tail -f /tmp/blisstribe-api.log"
echo "    Admin → tail -f /tmp/blisstribe-admin.log"
echo ""
echo "  停止服务: bash stop-dev.sh"
echo "════════════════════════════════════════════"
