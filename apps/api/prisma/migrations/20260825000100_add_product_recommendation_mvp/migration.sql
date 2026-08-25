-- 产品精准推荐 MVP：产品模块、产品、产品线索

CREATE TABLE "ProductModule" (
  "id" BIGSERIAL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX "ProductModule_code_key" ON "ProductModule"("code");
CREATE INDEX "ProductModule_status_sortOrder_idx" ON "ProductModule"("status", "sortOrder");

CREATE TABLE "Product" (
  "id" BIGSERIAL PRIMARY KEY,
  "moduleId" BIGINT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL DEFAULT '',
  "coverUrl" TEXT NOT NULL DEFAULT '',
  "priceText" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "detail" TEXT NOT NULL DEFAULT '',
  "targetUserText" TEXT NOT NULL DEFAULT '',
  "painPointText" TEXT NOT NULL DEFAULT '',
  "serviceProcess" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "priority" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Product_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Product_moduleId_status_idx" ON "Product"("moduleId", "status");
CREATE INDEX "Product_status_priority_sortOrder_idx" ON "Product"("status", "priority", "sortOrder");
CREATE INDEX "Product_publishedAt_idx" ON "Product"("publishedAt");
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

CREATE TABLE "ProductLead" (
  "id" BIGSERIAL PRIMARY KEY,
  "productId" BIGINT NOT NULL,
  "userId" BIGINT NOT NULL,
  "partnerId" BIGINT,
  "sourceInviteCode" TEXT,
  "sourceScene" TEXT NOT NULL DEFAULT 'miniapp',
  "needTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "message" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'new',
  "followUpNote" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductLead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductLead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ProductLead_productId_createdAt_idx" ON "ProductLead"("productId", "createdAt");
CREATE INDEX "ProductLead_userId_createdAt_idx" ON "ProductLead"("userId", "createdAt");
CREATE INDEX "ProductLead_partnerId_createdAt_idx" ON "ProductLead"("partnerId", "createdAt");
CREATE INDEX "ProductLead_status_createdAt_idx" ON "ProductLead"("status", "createdAt");

INSERT INTO "ProductModule" ("code", "name", "description", "sortOrder", "status", "updatedAt")
VALUES ('health', '健康', '健康类产品和服务', 0, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
