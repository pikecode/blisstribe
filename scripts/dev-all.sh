#!/usr/bin/env bash
# 启动本机 API、管理后台和小程序编译监听。
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 先完成数据库迁移和共享包构建，再同时启动应用。
exec bash "$PROJECT_ROOT/scripts/dev-local.sh" --all
