# 当前部署指南（后续部署首选入口）

更新时间：2026-10-12。后续代码发布、回滚和发布检查，先阅读本文档。

本文对应当前宿主机部署；不要照旧 Docker 章节操作生产。历史初始化与运行记录见 [生产运行手册](../archive/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md)，微信支付配置和验收见 [支付部署记录](WECHAT_PAY_DEPLOYMENT.md)。执行前仍需核对服务器实际状态。

## 1. 当前运行方式

| 项目 | 地址或位置 |
| --- | --- |
| SSH | `blisstribe-prod` |
| 后台 | `https://admin.ytxybl.com` |
| API | `https://api.ytxybl.com/api/v1` |
| 发布目录 | `/opt/blisstribe/releases/<版本号>` |
| 当前版本链接 | `/opt/blisstribe/current` |
| 后台静态资源 | `current/apps/admin/dist`，由 Nginx 提供 |
| API | `blisstribe-api` systemd 服务，本机端口 14000 |
| 生产环境文件 | `/etc/blisstribe/api.env`，包含密钥，不上传或打印 |
| 上传文件 | `/var/lib/blisstribe/uploads`，不随代码发布覆盖 |
| 数据库、缓存 | 宿主机 PostgreSQL、Redis |

服务器使用 Node.js 22、pnpm 10.22.0。后台和小程序的 API 地址在构建时写入产物，修改环境文件后必须重新构建；开发监听进程也需要重启。

## 2. 按改动选择方式

| 改动 | 推荐方式 | 影响 |
| --- | --- | --- |
| 仅后台样式或页面 | 第 4 节增量部署 | 无需重启 API |
| API 小修复，无依赖、共享包、数据库变更 | 第 5 节增量部署 | API 重启可能短暂中断请求 |
| 依赖、锁文件、共享包、Prisma 或多个模块变化 | 第 6 节独立版本发布 | 可切换旧版本，数据库需另行处理 |
| 仅小程序 | 第 7 节构建与预览 | 不自动发布微信正式版本 |

增量部署会修改当前版本，必须先备份，不能认为切换到同一目录就能回滚。独立版本发布更便于追溯，但安装和构建耗时更长。

## 3. 发布前

所有本地命令从仓库根目录执行。

```bash
git status --short
git diff --stat
ssh blisstribe-prod 'readlink -f /opt/blisstribe/current; systemctl is-active blisstribe-api; df -h /opt/blisstribe'
```

明确本次改动范围及未提交文件；不要将无关工作一起发布，也不要重置现有修改。记录部署时间、Git 提交或未提交改动范围、上一版本路径、本次文件及验收结果。

设置本次备份标识（同一次操作一直使用同一个值）：

```bash
DEPLOY_TAG=$(date +%Y%m%d%H%M%S)
ssh blisstribe-prod "install -d -m 700 /opt/blisstribe/backups/$DEPLOY_TAG"
```

以下命令默认 SSH 账号具有现有部署权限。检查失败时停止发布，不跳过错误继续执行。

## 4. 仅后台：增量部署

生产地址必须显式注入；`apps/admin/.env.production` 也已配置同一地址。后台域名没有 `/api/v1` 代理，使用相对地址会返回 HTML，导致所有列表加载失败。

```bash
VITE_API_BASE_URL=https://api.ytxybl.com/api/v1 pnpm --filter @blisstribe/admin build
rg -l 'https://api.ytxybl.com/api/v1' apps/admin/dist/assets/request-*.js
ssh blisstribe-prod "tar -czf /opt/blisstribe/backups/$DEPLOY_TAG/admin-dist.tar.gz -C /opt/blisstribe/current/apps/admin dist"
rsync -az --exclude index.html apps/admin/dist/ blisstribe-prod:/opt/blisstribe/current/apps/admin/dist/
rsync -az apps/admin/dist/index.html blisstribe-prod:/opt/blisstribe/current/apps/admin/dist/index.html
```

先上传资源，再上传入口，保留旧资源供已打开的页面使用；不要立即使用 `--delete` 清理旧资源。无需重启 Nginx 或 API。

以上发布构建产物，不同步源码；后续独立版本发布以本地仓库为准，不能把服务器当前源码当作完整的新版本。

回滚后台产物：

```bash
ssh blisstribe-prod "tar -xzf /opt/blisstribe/backups/$DEPLOY_TAG/admin-dist.tar.gz -C /opt/blisstribe/current/apps/admin"
```

## 5. 仅 API：增量部署

仅适用于依赖、共享包和数据库结构均未变化的修复。先备份整个 API 源码和构建产物，再只上传本次文件，示例路径应替换为实际改动路径：

```bash
ssh blisstribe-prod "tar -czf /opt/blisstribe/backups/$DEPLOY_TAG/api-code.tar.gz -C /opt/blisstribe/current/apps/api src dist"
rsync -az apps/api/src/shop/order/order.service.ts blisstribe-prod:/opt/blisstribe/current/apps/api/src/shop/order/order.service.ts
ssh blisstribe-prod 'cd /opt/blisstribe/current && pnpm --filter @blisstribe/api build && systemctl restart blisstribe-api'
```

新增文件、调用方、导出等必须一起同步；有文件删除或复杂变更时优先使用独立版本。构建失败不重启 API，并恢复备份源码。

回滚 API 源码和产物：

```bash
ssh blisstribe-prod "tar -xzf /opt/blisstribe/backups/$DEPLOY_TAG/api-code.tar.gz -C /opt/blisstribe/current/apps/api && systemctl restart blisstribe-api"
```

## 6. 独立版本发布

现有脚本：`scripts/deploy-host.sh`。先预构建，不迁移、不切换：

```bash
TAG="$DEPLOY_TAG" CUTOVER=0 ./scripts/deploy-host.sh
```

脚本本地构建后台，同步仓库至独立目录，在服务器安装锁定依赖、生成 Prisma 客户端、构建共享包和 API。同步会排除环境文件；生产运行配置来自 `/etc/blisstribe/api.env`。不要复用已在运行的版本号：脚本同步使用 `--delete`。

需要迁移时，先审查迁移 SQL、确认与旧代码的兼容性，并备份生产数据库及环境：

```bash
ssh blisstribe-prod "sudo -u postgres pg_dump -Fc blisstribe > /opt/blisstribe/backups/$DEPLOY_TAG/database.dump"
ssh blisstribe-prod "cp /etc/blisstribe/api.env /opt/blisstribe/backups/$DEPLOY_TAG/api.env"
```

备份需确认可恢复到隔离库。数据库恢复会覆盖数据，不要直接对生产执行恢复命令。

准备完成后正式发布（会再次同步和构建）：

```bash
TAG="$DEPLOY_TAG" CUTOVER=1 ./scripts/deploy-host.sh
```

当前脚本迁移目标固定为本机 `blisstribe` 数据库，管理员身份执行迁移后授权应用账号；若修改数据库位置或名称，必须先修改脚本。不要套用旧文档中“自动读取运行环境数据库”的描述。

代码回滚：把下面的 `<上一版本号>` 替换为发布前记录的实际目录。

```bash
ssh blisstribe-prod 'ln -sfn /opt/blisstribe/releases/<上一版本号> /opt/blisstribe/current && systemctl restart blisstribe-api'
```

数据库迁移不会随链接切换回滚；不兼容的迁移需要修复方案或经确认的数据恢复。20261009-wechat-02 复用 20261009-wechat-01 的依赖，暂时不要删除这两个目录。新脚本发布会安装独立依赖。

## 7. 小程序开发与真机预览

开发、生产配置均指向线上 API；开发热更新不等于模拟支付。

```bash
pnpm --filter @blisstribe/miniapp dev:mp-weixin
```

开发者工具打开 `apps/miniapp/dist/dev/mp-weixin`。修改环境文件后停止并重新启动开发进程。

生产预览构建（包含仓库已有的 source map 清理步骤）：

```bash
pnpm build:miniapp
```

开发者工具打开 `apps/miniapp/dist/build/mp-weixin`，点击预览并用真机扫码。旧二维码不包含之后的修改。预览、上传体验版、提交审核、正式发布是不同动作，本文命令不自动上传或正式发布。

测试操作会写入生产数据，真实支付会扣款。当前支付权限以生产环境为准；用户 2 的小额验收、退款到账和平台发货管理需按支付专项文档确认，不因构建成功而视为已验收。

## 8. 每次发布后检查

```bash
ssh blisstribe-prod 'systemctl is-active blisstribe-api'
curl -fsS --retry 10 --retry-connrefused --retry-delay 1 https://api.ytxybl.com/api/v1/agreements/current/user
curl -fsS https://admin.ytxybl.com/
curl -i -H 'Origin: https://admin.ytxybl.com' https://api.ytxybl.com/api/v1/admin/shop/orders
```

无登录信息访问订单接口应返回 JSON 的 HTTP 401，并带正确 CORS 响应头；这只能证明接口和跨域可用，不能证明登录后的列表业务成功。

用实际后台登录会话检查修改页面、列表加载、筛选、详情和操作；小程序检查新增、编辑、返回刷新以及真机效果。不要为了验证而审批真实退款、发货或删业务数据。需要自动化测试时按任务授权执行并记录结果；构建通过不能替代业务验收。

查看错误日志（不复制令牌、密钥或用户隐私）：

```bash
ssh blisstribe-prod 'journalctl -u blisstribe-api --since "10 minutes ago" --no-pager -p warning'
```

后台页面未更新时先强制刷新；列表请求返回 HTML 时先检查产物中的 API 地址。新发布异常优先使用本次备份或旧版本回滚，随后排查。

## 9. 工程原则

- KISS：沿用 Nginx、systemd、SSH 和 rsync，保持发布链路清晰。
- YAGNI：当前不增加 CI/CD 平台或容器编排系统。
- SOLID：构建、静态资源上传、服务运行和数据库迁移分别处理。
- DRY：以本文为当前部署入口，现有脚本负责完整发布，专项文档负责支付配置；避免复制密钥和多套相互冲突的操作说明。
