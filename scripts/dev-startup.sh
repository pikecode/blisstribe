#!/usr/bin/env bash
# 兼容旧入口；统一交给安全的本机开发启动脚本。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/dev-local.sh" "$@"
