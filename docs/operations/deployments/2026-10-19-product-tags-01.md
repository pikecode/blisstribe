# 生产部署记录：产品介绍列表标签查看

- 日期：2026-10-19（北京时间）
- 代码提交：`3bbb8da`（`feat(admin): reveal full product tags on click`）
- 部署方式：后台静态资源增量发布；API 未重启。
- 当前发布目录：`/opt/blisstribe/releases/20261015-product-workspace-02`
- 部署前备份：`/opt/blisstribe/backups/20261019-product-tags-01/admin-dist.tar.gz`

## 发布内容

- 产品介绍列表超过两个标签时显示“+N 查看全部”，点击后弹出该产品的完整标签。
- 无标签时显示“—”。
- 使用隔离工作树构建，只包含提交 `3bbb8da`，未带入工作区其他未提交改动。

## 发布核验

- 后台生产构建通过，API 地址注入为 `https://api.ytxybl.com/api/v1`。
- `https://admin.ytxybl.com/` 返回 HTTP 200。
- 产品页面对应静态资源已上传，返回 HTTP 200。

## 回滚

从上述备份恢复 `dist`：

```bash
ssh blisstribe-prod 'tar -xzf /opt/blisstribe/backups/20261019-product-tags-01/admin-dist.tar.gz -C /opt/blisstribe/current/apps/admin'
```
