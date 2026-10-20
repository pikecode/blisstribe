# 商城分类导航增量部署

- 日期：2026-10-20
- 功能提交：`54fdbbc`
- 后台：左侧分类树、窄屏分类下拉、新增默认分类、快速切换请求保护；包含商品弹窗页签间距调整。
- 小程序：搜索及分类吸顶、分类切换期间保留列表占位。
- 部署依据：`docs/operations/DEPLOYMENT_GUIDE.md` 第 4 节。

## 构建与发布

使用独立工作树 `/tmp/blisstribe-shop-navigation` 从上述提交构建，避免混入其他未提交源码。后台使用生产 API 地址，类型检查和生产构建成功。小程序生产构建成功，产物同步到本地 `apps/miniapp/dist/build/mp-weixin`，未上传微信平台。

服务器当前版本为 `/opt/blisstribe/releases/20261020-shop-categories-01`，仅增量更新后台静态资源；先资源后入口，保留旧资源。未修改 API、数据库或服务器源码，未重启服务。

## 备份与回滚

备份：`/opt/blisstribe/backups/20261020-shop-navigation-01/admin-dist.tar.gz`。

```bash
ssh blisstribe-prod 'tar -xzf /opt/blisstribe/backups/20261020-shop-navigation-01/admin-dist.tar.gz -C /opt/blisstribe/current/apps/admin'
```

## 发布检查

- 线上 `/shop/products` 返回的 HTML 与本次构建入口完全一致。
- API 服务 active，公开协议接口 HTTP 请求成功。
- 尚未完成登录后浏览器交互及小程序真机验收。
- 构建存在既有 Sass 弃用和大体积资源提示，不影响本次产物生成。
