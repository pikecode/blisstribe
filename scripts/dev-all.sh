#!/usr/bin/env bash
# 启动本机 API、管理后台和小程序编译监听。
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

exec pnpm exec concurrently --kill-others -n 'API+Admin,MiniApp' \
  "pnpm dev:local" \
  "pnpm dev:miniapp"
