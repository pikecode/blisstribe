#!/usr/bin/env bash
# 启动 API 和管理后台，可选开启小程序热编译。
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 补齐 Homebrew 命令路径。
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@17/bin:/usr/local/bin:/usr/local/opt/postgresql@17/bin:$PATH"
case "${1:-}" in
  '') exec bash "$PROJECT_ROOT/scripts/dev-local.sh" ;;
  --miniapp) exec bash "$PROJECT_ROOT/scripts/dev-all.sh" ;;
  *) printf '用法：./start.sh [--miniapp]\n' >&2; exit 1 ;;
esac
