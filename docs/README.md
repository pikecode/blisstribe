# 项目文档索引

整理日期：2026-10-12。先从本页查找文档；设计说明不等于功能已经完成，历史报告不等于上线验收。

## 常用入口

- [当前部署指南](operations/DEPLOYMENT_GUIDE.md)：后续发布、检查和回滚的首选依据。
- [微信支付部署与验收](operations/WECHAT_PAY_DEPLOYMENT.md)：支付开关、凭证位置和真实验收待办。
- [上线检查清单](operations/GO_LIVE_CHECKLIST.md)：结合当前部署指南逐项确认。
- 本地 API 与后台：仓库根目录执行 `./start.sh`；附带小程序热编译用 `./start.sh --miniapp`。
- 小程序仅热编译：`pnpm dev:miniapp`；开发和生产均连接线上 API，测试会写入生产数据。

## 分类

| 目录 | 内容 | 使用方式 |
| --- | --- | --- |
| `product/` | 注册需求、标签规范 | 理解业务要求 |
| `engineering/` | 架构、API、数据库、前端、安全 | 设计参考；字段、路由以现有源码为准 |
| `operations/` | 部署、支付、上线检查 | 当前运维入口 |
| `designs/` | 平台、推荐、活动、商城设计 | 查看模块边界和决策；带日期的计划需重新核对 |
| `archive/` | 历史部署、进度报告、旧方案、实施记录 | 仅供追溯，不照其中命令直接部署 |

## 产品与技术

- [注册功能 PRD](product/PRD.md)
- [标签规范](product/TAGS.md)
- [系统架构](engineering/ARCHITECTURE.md)
- [API 设计](engineering/API.md)
- [数据库设计](engineering/DATABASE.md)
- [商城数据库](engineering/DATABASE-SHOP.md)
- [支付与退款参考技术架构](engineering/PAYMENT_REFUND_REFERENCE_ARCHITECTURE.md)：用于其他应用设计与开发。
- [本项目付款与退款实现记录](engineering/PAYMENT_AND_REFUND.md)：当前源码及生产验收状态。
- [前端架构](engineering/FRONTEND.md)
- [安全设计](engineering/SECURITY.md)

## 业务设计

- [platform](designs/platform/)
- [recommendation](designs/recommendation/)
- [activity](designs/activity/)
- [shop](designs/shop/)

[商城架构基线](designs/shop/shop-module-design-optimized.md)保留需求与决策；其中阶段完成情况可能滞后，支付生产配置与验收以专项记录和实时状态为准。

## 整理规则

- 一个主题保留一个明确的现行入口；不再在仓库根目录堆放进度和交付报告。
- 过时但有追溯价值的文件归档并加历史提示，不将“已完成”直接作为验收依据。
- 新文档放入对应分类并更新索引；移动文档同时修复链接。
- 空白、完全重复或无独立价值的文档确认后删除，不删除唯一的决策依据。
- `.omc/` 属于工具执行记录，本轮不移动或清理，避免影响工具自身状态。
