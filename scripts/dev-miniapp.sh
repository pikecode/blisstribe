#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[miniapp]${NC} 启动小程序开发编译..."
echo -e "${GREEN}[miniapp]${NC} 编译完成后用微信开发者工具打开："
echo -e "${GREEN}[miniapp]${NC}   apps/miniapp/dist/dev/mp-weixin"
echo ""

pnpm --filter @blisstribe/miniapp dev:mp-weixin
