-- Phase 1: 数据模型优化 - 标签统一和推荐事件增强
-- 1. 删除冗余的 tags 字段（产品、用户评估、推荐事件）
-- 2. 增强 RecommendationEvent 表：添加评分明细和交互数据
-- 3. 创建新表：推荐配置、指标、清理记录
-- 4. 更新 ProductLead：添加存档字段

-- ========== 删除冗余字段 ==========
ALTER TABLE "UserAssessment" DROP COLUMN "tags";
ALTER TABLE "Product" DROP COLUMN "tags";
ALTER TABLE "RecommendationEvent" DROP COLUMN "tags";
ALTER TABLE "RecommendationEvent" RENAME COLUMN "reason" TO "matchReason";

-- ========== 增强 RecommendationEvent ==========
ALTER TABLE "RecommendationEvent"
ADD COLUMN "baseScore" INTEGER DEFAULT 0,
ADD COLUMN "primaryScore" INTEGER DEFAULT 0,
ADD COLUMN "secondaryScore" INTEGER DEFAULT 0,
ADD COLUMN "fallbackScore" INTEGER DEFAULT 0,
ADD COLUMN "ruleBonus" INTEGER DEFAULT 0,
ADD COLUMN "clicked" BOOLEAN DEFAULT false,
ADD COLUMN "viewDuration" INTEGER,
ADD COLUMN "converted" BOOLEAN DEFAULT false;

-- 添加新索引用于分析
CREATE INDEX "RecommendationEvent_clicked_createdAt_idx" ON "RecommendationEvent"("clicked", "createdAt");
CREATE INDEX "RecommendationEvent_converted_createdAt_idx" ON "RecommendationEvent"("converted", "createdAt");

-- ========== 更新 ProductLead ==========
ALTER TABLE "ProductLead"
ADD COLUMN "archived" BOOLEAN DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "ProductLead_archived_updatedAt_idx" ON "ProductLead"("archived", "updatedAt");

-- ========== 创建新表：推荐配置 ==========
CREATE TABLE "RecommendationConfig" (
    "id" BIGSERIAL NOT NULL PRIMARY KEY,
    "moduleCode" TEXT NOT NULL UNIQUE,
    "primaryTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "secondaryTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "fallbackTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxUserTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "maxAssessmentWeight" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "assessmentVsUserRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "enableRuleBoost" BOOLEAN NOT NULL DEFAULT true,
    "ruleBoostMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "duplicationWindow" INTEGER NOT NULL DEFAULT 7,
    "limitPerRequest" INTEGER NOT NULL DEFAULT 100,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "RecommendationConfig_status_idx" ON "RecommendationConfig"("status");

-- ========== 创建新表：推荐指标 ==========
CREATE TABLE "RecommendationMetrics" (
    "id" BIGSERIAL NOT NULL PRIMARY KEY,
    "moduleCode" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgViewDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "byMatchReason" JSONB NOT NULL DEFAULT '{}',
    "bySourceType" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("moduleCode", "date")
);

CREATE INDEX "RecommendationMetrics_moduleCode_date_idx" ON "RecommendationMetrics"("moduleCode", "date");

-- ========== 创建新表：Lead 清理记录 ==========
CREATE TABLE "ProductLeadCleanup" (
    "id" BIGSERIAL NOT NULL PRIMARY KEY,
    "cleanupType" TEXT NOT NULL,
    "leadCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ProductLeadCleanup_cleanupType_executedAt_idx" ON "ProductLeadCleanup"("cleanupType", "executedAt");
