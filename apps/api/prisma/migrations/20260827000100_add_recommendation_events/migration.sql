CREATE TABLE IF NOT EXISTS "RecommendationEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT,
  "anonymousId" TEXT NOT NULL DEFAULT '',
  "moduleId" BIGINT,
  "moduleCode" TEXT NOT NULL DEFAULT '',
  "productId" BIGINT,
  "productType" TEXT NOT NULL DEFAULT '',
  "recommendationForm" TEXT NOT NULL DEFAULT '',
  "eventType" TEXT NOT NULL,
  "sourceScene" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL,
  "tagIds" BIGINT[] NOT NULL,
  "score" INTEGER,
  "reason" TEXT NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  ALTER TABLE "RecommendationEvent"
    ADD CONSTRAINT "RecommendationEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "RecommendationEvent"
    ADD CONSTRAINT "RecommendationEvent_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "RecommendationEvent"
    ADD CONSTRAINT "RecommendationEvent_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "RecommendationEvent_userId_createdAt_idx" ON "RecommendationEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_anonymousId_createdAt_idx" ON "RecommendationEvent"("anonymousId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_moduleCode_createdAt_idx" ON "RecommendationEvent"("moduleCode", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_moduleId_createdAt_idx" ON "RecommendationEvent"("moduleId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_productId_createdAt_idx" ON "RecommendationEvent"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_productType_createdAt_idx" ON "RecommendationEvent"("productType", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_recommendationForm_createdAt_idx" ON "RecommendationEvent"("recommendationForm", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_eventType_createdAt_idx" ON "RecommendationEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "RecommendationEvent_createdAt_idx" ON "RecommendationEvent"("createdAt");
