# 生产部署记录：商品编辑 Tab 间距

- 版本标识：`20261016-product-tabs-01`
- 日期：2026-10-16（北京时间）
- 部署方式：后台静态资源增量发布；未重启 API。
- 发布前版本：`/opt/blisstribe/releases/20261015-product-workspace-02`
- 备份：`/opt/blisstribe/backups/20261016-product-tabs-01/admin-dist.tar.gz`
- 变更文件：`apps/admin/src/views/shop/product.vue`

将“商品信息／规格与库存”Tab 移入弹窗固定标题区，避免滚动时 SKU 内容从 Tab 上方露出；商品数据和 API 未修改。

Admin 构建通过；线上首页引用新构建资源，商品页 CSS 包含新布局样式；API 探活 HTTP 200，服务保持 `active`。未使用已登录会话做弹窗交互验收。

回滚后台静态资源：

```bash
ssh blisstribe-prod 'tar -xzf /opt/blisstribe/backups/20261016-product-tabs-01/admin-dist.tar.gz -C /opt/blisstribe/current/apps/admin'
```
