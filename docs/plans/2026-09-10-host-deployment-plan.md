# 宿主机生产部署实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 BlissTribe 在生产服务器上以宿主机服务运行，不依赖 Docker。

**Architecture:** 保留宿主机 Nginx 和现有域名；Admin 构建为静态文件；API 由 systemd 管理；PostgreSQL 和 Redis 使用系统服务。生产切换前通过备份和回滚目录保护现有数据。

**Tech Stack:** Node.js 20、pnpm 10.22.0、NestJS、Vue/Vite、PostgreSQL 15、Redis 7、systemd、Nginx。

---

### Task 1: 增加宿主机部署脚本

**Files:**
- Create: `scripts/deploy-host.sh`

**Steps:**
1. 检查 Node、pnpm、PostgreSQL、Redis 和目标目录。
2. 在版本目录安装依赖并构建 shared、API、Admin。
3. 执行 `prisma migrate deploy`。
4. 同步 API 构建产物、Admin 静态文件和上传目录。
5. 重启 API systemd 服务并执行本机 HTTP 验收。

### Task 2: 增加 API systemd 模板

**Files:**
- Create: `deploy/systemd/blisstribe-api.service`

**Steps:**
1. 使用专用非 root 用户运行 API。
2. 从 `/etc/blisstribe/api.env` 加载生产环境变量。
3. 失败自动重启，日志进入 journald。

### Task 3: 更新 Nginx 和生产运行手册

**Files:**
- Create: `deploy/nginx/host-admin.conf`
- Modify: `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`
- Modify: `docs/DEPLOYMENT.md`

**Steps:**
1. Admin 改为宿主机静态目录。
2. API 反向代理改为宿主机 `127.0.0.1:14000`。
3. 补充 PostgreSQL、Redis、上传文件迁移和回滚步骤。

### Task 4: 验证

**Steps:**
1. 执行 `bash -n scripts/deploy-host.sh` 和 `bash -n deploy/systemd/*.service` 不适用检查。
2. 执行 API、Admin、Miniapp 类型检查和 API/Admin 构建。
3. 在测试服务器验证 systemd、迁移、Nginx 和公网域名。
4. 生产切换前完成 PostgreSQL dump、上传文件备份和 Docker 回滚点确认。
