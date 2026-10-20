# 生产部署记录：产品工作区与套餐资金规则

- 部署版本：`20261015-product-workspace-02`
- 部署日期：2026-10-15（北京时间）
- Git 基准：`37918bb`；发布内容包含该提交之上的未提交工作区改动。
- 上一版本：`/opt/blisstribe/releases/20261015-product-workspace-01`
- 当前版本：`/opt/blisstribe/releases/20261015-product-workspace-02`
- 数据备份：`/opt/blisstribe/backups/20261015-product-workspace-02/`

## 发布范围

- 后台产品工作区、服务套餐配置及预约运营界面。
- 后台产品 API 与产品管理路由、侧边栏入口。
- 套餐资金区域改为项目单行维护退款分摊和机构结算，主理人推广预算按套餐售价单独计算。
- 更新相关 API 与产品体验文档。

本次发布同步了当时工作区中的未提交变更，涉及 `apps/admin`、`apps/api` 和 `docs`。未改动 Prisma schema 或迁移文件。

## 发布与检查

- Admin 生产构建通过；出现 Sass legacy API 和大体积 chunk 提示，不影响构建完成。
- API 生产构建通过。
- 数据库迁移检查：48 个迁移已存在，无待执行迁移。
- `blisstribe-api`：`active`。
- `https://api.ytxybl.com/api/v1/agreements/current/user`：HTTP 200。
- 后台首页正常返回，构建资源包含本次套餐资金界面文案。
- 未登录访问管理订单接口返回 HTTP 401 JSON，CORS 请求正常完成。
- 未使用已登录管理会话进行页面交互验收。

## 回滚

后台与 API 可切回上一版本：

```bash
ssh blisstribe-prod 'ln -sfn /opt/blisstribe/releases/20261015-product-workspace-01 /opt/blisstribe/current && systemctl restart blisstribe-api'
```

数据库未执行新迁移。如需恢复数据库备份，须先恢复到隔离库核验；不要直接覆盖生产数据。
