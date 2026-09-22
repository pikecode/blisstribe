#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 BlissTribe 开发环境启动${NC}"
echo ""

# 配置端口
API_PORT=${API_PORT:-3000}
ADMIN_PORT=${ADMIN_PORT:-5173}
MINIAPP_PORT=${MINIAPP_PORT:-5174}
PG_PORT=${PG_PORT:-5432}
REDIS_PORT=${REDIS_PORT:-6379}

# 函数：检查和 kill 占用的端口
kill_port() {
  local port=$1
  local port_name=$2

  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  端口 $port ($port_name) 被占用，正在释放...${NC}"
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ 端口 $port 已释放${NC}"
  fi
}

echo "1️⃣  检查并释放被占用的端口..."
kill_port $API_PORT "API"
kill_port $ADMIN_PORT "Admin"
kill_port $MINIAPP_PORT "MiniApp"
kill_port $PG_PORT "PostgreSQL"
kill_port $REDIS_PORT "Redis"
echo ""

echo "2️⃣  启动本地数据库服务..."

# 启动 PostgreSQL（使用 homebrew 安装）
if ! pgrep -x "postgres" > /dev/null; then
  echo "  启动 PostgreSQL..."
  brew services start postgresql-15 2>/dev/null || {
    echo "  尝试用 pg_ctl 启动..."
    pg_ctl -D /usr/local/var/postgres start 2>/dev/null || true
  }
  sleep 2
fi
echo -e "${GREEN}✓ PostgreSQL 已运行 (端口 $PG_PORT)${NC}"

# 启动 Redis
if ! pgrep -x "redis-server" > /dev/null; then
  echo "  启动 Redis..."
  brew services start redis 2>/dev/null || {
    echo "  尝试用 redis-server 启动..."
    redis-server --daemonize yes --port $REDIS_PORT >/dev/null 2>&1 || true
  }
  sleep 1
fi
echo -e "${GREEN}✓ Redis 已运行 (端口 $REDIS_PORT)${NC}"
echo ""

echo "3️⃣  初始化数据库..."
cd apps/api

# 创建数据库（如果不存在）
createdb blisstribe -E UTF8 2>/dev/null || true
echo "  数据库 'blisstribe' 已就绪"

# 生成 Prisma client
echo "  生成 Prisma Client..."
npx prisma generate 2>&1 | grep -v "already generated" || true

# 运行迁移
echo "  运行数据库迁移..."
npx prisma migrate deploy 2>&1 || {
  echo "  首次迁移，运行 reset..."
  npx prisma migrate reset --force --skip-generate 2>&1 || true
}

# 初始化测试数据
echo "  创建测试数据..."
npx prisma db seed 2>&1 || true
echo ""

echo -e "${GREEN}✅ 数据库初始化完成！${NC}"
echo ""

echo -e "${YELLOW}📋 登录凭证：${NC}"
echo -e "  后台管理: admin@test.com / admin123"
echo -e "  普通用户: user@test.com / user123"
echo ""

echo -e "${YELLOW}🎯 下一步 - 在不同终端运行以下命令：${NC}"
echo ""
echo -e "${GREEN}终端1 (API 后端):${NC}"
echo "  cd apps/api && npm run start:dev"
echo "  监听: http://localhost:$API_PORT"
echo ""
echo -e "${GREEN}终端2 (Admin 后台):${NC}"
echo "  cd apps/admin && npm run dev"
echo "  访问: http://localhost:$ADMIN_PORT"
echo ""
echo -e "${GREEN}终端3 (MiniApp 小程序):${NC}"
echo "  cd apps/miniapp && npm run dev"
echo ""

echo -e "${YELLOW}或者一键启动所有服务：${NC}"
echo "  bash scripts/dev-all.sh"
echo ""
