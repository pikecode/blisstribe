# 开发环境启动指南

## 快速开始

### 第一次运行：初始化环境 + 创建测试数据

```bash
# 进入项目目录
cd /Users/peakom/workbd/blisstribe

# 运行初始化脚本（自动处理端口冲突、启动 Docker、创建测试数据）
bash scripts/dev-startup.sh
```

**脚本会自动执行：**
- ✓ 检查端口占用（3000, 5173, 5432, 6379）
- ✓ 自动 kill 占用进程
- ✓ 启动 PostgreSQL + Redis
- ✓ 数据库迁移
- ✓ 创建测试数据
- ✓ 输出登录凭证

### 启动所有开发服务

运行初始化后，用此脚本启动所有服务：

```bash
bash scripts/dev-all.sh
```

**会自动启动：**
- API 后端 (port 3000)
- Admin 后台 (port 5173)
- MiniApp 小程序 (port 5174+)

---

## 手动启动（分终端）

如果想分别在不同终端启动，按以下顺序：

### 终端 1：初始化 + 启动 API

```bash
cd apps/api
npm run start:dev
```

等到看到：`[Nest] XXXX - LOG [NestFactory] Application successfully started`

### 终端 2：启动 Admin 后台

```bash
cd apps/admin
npm run dev
```

访问：http://localhost:5173

### 终端 3（可选）：启动 MiniApp

```bash
cd apps/miniapp
npm run dev
```

---

## 测试数据

### 管理员账号
- 用户名：`admin`
- 密码：`admin123`

### 测试用户
- 电话：`138 0000 1111`
- 已完成健康评估，标签：睡眠改善、重点改善、线上咨询

### 测试数据包括
- **4 个产品模块**：健康、美学、家庭、情绪
- **20+ 个产品**：咨询、服务包、实物产品
- **4 个评估模板**：对应各模块
- **4 个活动**：包括线上、线下、混合型
- **1 个线下场地**：杭州体验点
- **示例线索**：演示咨询用户的跟进流程

---

## 故障排除

### 端口被占用

脚本会自动询问是否 kill。或手动处理：

```bash
# 查看占用进程
lsof -i :3000

# Kill 指定端口的进程
lsof -ti :3000 | xargs kill -9
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 运行状态
docker-compose ps

# 重启 PostgreSQL
docker-compose restart postgres

# 查看日志
docker-compose logs postgres
```

### 依赖安装问题

```bash
# 清理并重新安装
rm -rf node_modules
pnpm install
```

### 数据库迁移失败

```bash
# 手动执行迁移
cd apps/api
pnpm prisma:migrate

# 重置数据库（谨慎使用）
pnpm prisma migrate reset
```

---

## 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| API 文档 | http://localhost:3000/api | Swagger/OpenAPI |
| Admin 后台 | http://localhost:5173 | 登录: admin / admin123 |
| MiniApp | http://localhost:5174+ | 小程序开发版本 |
| Prisma Studio | 运行 `cd apps/api && pnpm prisma:studio` | 数据库可视化管理 |

---

## 开发工作流

### 修改代码后

- API: 自动 hot reload（需要 watch 模式）
- Admin: Vite 自动热更新
- MiniApp: 开发服务器自动重新编译

### 修改数据库 Schema

```bash
cd apps/api

# 创建新迁移
pnpm prisma migrate dev --name feature_name

# 更新 Prisma 客户端
pnpm prisma generate
```

### 重置测试数据

```bash
cd apps/api

# 完整重置（删除所有数据，重新创建 schema 和 seed）
pnpm prisma migrate reset

# 仅重新 seed（保持 schema，重新执行 seed.ts）
pnpm prisma db seed
```

---

## 常用命令速查

```bash
# 项目根目录
cd /Users/peakom/workbd/blisstribe

# 初始化开发环境
bash scripts/dev-startup.sh

# 启动所有服务
bash scripts/dev-all.sh

# 启动 API
cd apps/api && npm run start:dev

# 启动 Admin
cd apps/admin && npm run dev

# 启动小程序
cd apps/miniapp && npm run dev

# 运行测试
cd apps/api && npm test -- --testPathPattern="e2e-|integration-"

# 数据库管理
cd apps/api && pnpm prisma studio

# 类型检查
pnpm type-check
```

---

**准备好了吗？运行 `bash scripts/dev-startup.sh` 开始！** 🚀
