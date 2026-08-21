# S2B2C Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建方案二的第一阶段最小闭环：B 可申请入驻，S 可审核 B，B 可查看自己的经营主体状态。

**Architecture:** 继续采用当前 NestJS + Prisma 模块化单体。第一阶段新增 `Partner`、`PartnerMember`、`AuditLog` 三个核心模型和 `partner` 后端模块，不接产品、订单、佣金和结算。

**Tech Stack:** NestJS 10、Prisma 5、PostgreSQL、class-validator、pnpm workspace、Vue/UniApp 后续接入。

---

## Scope

### MVP Included

- Prisma schema 新增 `Partner`、`PartnerMember`、`AuditLog`。
- 新增 API 模块 `apps/api/src/partner`。
- 小程序端接口：
  - `POST /api/v1/partner/apply`
  - `GET /api/v1/partner/me`
  - `PUT /api/v1/partner/me`
- 后台端接口：
  - `GET /api/v1/admin/partners`
  - `GET /api/v1/admin/partners/:id`
  - `POST /api/v1/admin/partners/:id/approve`
  - `POST /api/v1/admin/partners/:id/reject`
  - `POST /api/v1/admin/partners/:id/freeze`
  - `POST /api/v1/admin/partners/:id/unfreeze`

### Deferred

- Partner 多成员管理。
- Partner 邀请 C 注册绑定。
- Product、Campaign、Order、Commission、Settlement。
- Admin 前端页面和 Miniapp B 工作台页面。
- 自动打款、复杂风控、规则引擎。

## Engineering Principles

- KISS：第一阶段只跑通 B 入驻与审核，不接交易。
- YAGNI：只开放 owner，`PartnerMember` 先作为后续扩展基础。
- SOLID：`User` 仍只负责登录账号，`Partner` 承载经营主体，`PartnerMember` 承载成员身份。
- DRY：状态常量和类型后续沉淀到 `packages/shared`，第一阶段先避免重复魔法数字。

## Task 1: Prisma Models

**Files:**

- Modify: `apps/api/prisma/schema.prisma`

**Steps:**

1. Add `partners` model as `Partner` with status and audit status fields.
2. Add `partner_members` model as `PartnerMember`.
3. Add `audit_logs` model as `AuditLog`.
4. Add relations from `User` to `PartnerMember`.
5. Run `pnpm --filter @blisstribe/api prisma:generate`.
6. Run `pnpm --filter @blisstribe/api type-check`.

**Expected:** Prisma Client 生成成功，TypeScript 暂不引用新模型也不报错。

## Task 2: Partner Backend Module

**Files:**

- Create: `apps/api/src/partner/partner.module.ts`
- Create: `apps/api/src/partner/partner.controller.ts`
- Create: `apps/api/src/partner/partner.service.ts`
- Create: `apps/api/src/partner/dto.ts`
- Modify: `apps/api/src/app.module.ts`

**Steps:**

1. Create DTOs: `ApplyPartnerDto`、`UpdatePartnerDto`、`RejectPartnerDto`。
2. Implement `apply`: create `Partner` + owner `PartnerMember` + `AuditLog` in a transaction.
3. Implement `getMine`: return current user's first active/pending/rejected/frozen Partner.
4. Implement `updateMine`: only allow update when status is `pending` or `rejected`.
5. Implement admin list/detail/review actions.
6. Register `PartnerModule` in `AppModule`.
7. Run `pnpm --filter @blisstribe/api type-check`.

**Expected:** 后端类型检查通过。

## Task 3: Shared Types

**Files:**

- Create: `packages/shared/src/types/partner.ts`
- Modify: `packages/shared/src/index.ts`

**Steps:**

1. Add partner status constants.
2. Add partner type constants.
3. Add DTO-facing TypeScript interfaces for Partner VO.
4. Export from shared index.
5. Run `pnpm --filter @blisstribe/shared type-check`.

**Expected:** shared 包类型检查通过。

## Task 4: Admin Frontend API Layer

**Files:**

- Create: `apps/admin/src/api/partner.ts`

**Steps:**

1. Add admin partner API methods.
2. Keep API methods thin and aligned with existing `apps/admin/src/api/user.ts` style.
3. Run `pnpm --filter @blisstribe/admin type-check`.

**Expected:** Admin 前端类型检查通过。

## Task 5: Miniapp API Layer

**Files:**

- Create: `apps/miniapp/src/api/modules/partner.ts`
- Modify: `apps/miniapp/src/api/index.ts`

**Steps:**

1. Add miniapp partner API methods.
2. Export from API index.
3. Run `pnpm --filter @blisstribe/miniapp type-check`.

**Expected:** Miniapp 类型检查通过。

## Task 6: Verification

**Commands:**

```bash
pnpm --filter @blisstribe/shared type-check
pnpm --filter @blisstribe/api prisma:generate
pnpm --filter @blisstribe/api type-check
pnpm --filter @blisstribe/admin type-check
pnpm --filter @blisstribe/miniapp type-check
```

**Expected:** 全部通过。若缺少测试脚本，先以 type-check 作为第一阶段验证。

## Suggested Next Phase

第二阶段接 `InvitationCode + CustomerRelation + RelationEvent`，实现 B 邀请 C 并绑定客户归属。
