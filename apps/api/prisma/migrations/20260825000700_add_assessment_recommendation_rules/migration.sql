-- CreateTable
CREATE TABLE "AssessmentRecommendationRule" (
    "id" BIGSERIAL NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "conditionTags" TEXT[],
    "scoreBoost" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentRecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentRecommendationRule_moduleId_status_sortOrder_idx" ON "AssessmentRecommendationRule"("moduleId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentRecommendationRule_productId_status_idx" ON "AssessmentRecommendationRule"("productId", "status");

-- AddForeignKey
ALTER TABLE "AssessmentRecommendationRule" ADD CONSTRAINT "AssessmentRecommendationRule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentRecommendationRule" ADD CONSTRAINT "AssessmentRecommendationRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
