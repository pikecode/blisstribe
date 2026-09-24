#!/bin/bash
# BlissTribe 停止开发服务
# 用法: bash stop-dev.sh

echo "→ 停止 API / Admin 服务 ..."
lsof -ti:4000,5174,5175,5176 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
echo "✓ 已停止"
