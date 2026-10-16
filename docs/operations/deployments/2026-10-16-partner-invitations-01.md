# 生产部署记录：服务伙伴邀请管理

- 日期：2026-10-16（北京时间）
- 代码提交：`c2a13a8`（`feat(invitation): align partner invitation workflow`）
- 部署方式：后台静态资源与 API 增量部署；未执行数据库迁移或版本切换。
- 当前发布目录：`/opt/blisstribe/releases/20261015-product-workspace-02`
- 部署前备份：`/opt/blisstribe/backups/20261016-invitation-01`

## 发布内容

- 后台“邀请管理”切换为服务伙伴邀请码统计与邀请记录，支持状态筛选和关键词搜索。
- API 增加伙伴邀请统计和全局分页记录接口，并记录伙伴邀请码的失效原因。
- 小程序隐藏普通用户邀请入口；伙伴邀请页增加微信好友原生分享。
- 小程序生产构建产物位于仓库忽略目录 `apps/miniapp/dist/build/mp-weixin`，待开发者工具导入预览并提交微信审核。

## 发布核验

- API、后台和小程序类型检查通过；后台、API、小程序生产构建通过。
- `https://admin.ytxybl.com/` 返回 HTTP 200。
- 新 API 路由已出现在 Nest 启动映射日志中；未登录请求返回 HTTP 401，符合后台鉴权预期。
- `blisstribe-api` 为 active，本机 API 健康检查通过。

## 回滚

此为原目录内增量部署，不涉及版本链接切换。备份包分别为 `admin-dist.tar.gz` 和 `api-code.tar.gz`。按当前部署指南第 4、5 节中的回滚方式恢复静态资源和 API 的 `src`、`dist` 后重启 `blisstribe-api`。
