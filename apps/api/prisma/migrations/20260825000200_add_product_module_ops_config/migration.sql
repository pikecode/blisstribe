ALTER TABLE "ProductModule" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductModule" ADD COLUMN "coverUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductModule" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductModule" ADD COLUMN "assessmentEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductModule" ADD COLUMN "assessmentType" TEXT NOT NULL DEFAULT '';

CREATE INDEX "ProductModule_status_showOnHome_sortOrder_idx" ON "ProductModule"("status", "showOnHome", "sortOrder");

UPDATE "ProductModule"
SET
  "icon" = '健康',
  "showOnHome" = true,
  "assessmentEnabled" = true,
  "assessmentType" = 'health'
WHERE "code" = 'health';
