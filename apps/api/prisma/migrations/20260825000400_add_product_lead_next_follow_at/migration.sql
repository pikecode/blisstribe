ALTER TABLE "ProductLead" ADD COLUMN "nextFollowAt" TIMESTAMP(3);

UPDATE "ProductLead" lead
SET "nextFollowAt" = latest."nextFollowAt"
FROM (
  SELECT DISTINCT ON ("leadId") "leadId", "nextFollowAt"
  FROM "ProductLeadFollowUp"
  WHERE "nextFollowAt" IS NOT NULL
  ORDER BY "leadId", "createdAt" DESC
) latest
WHERE lead."id" = latest."leadId";

CREATE INDEX "ProductLead_status_nextFollowAt_idx" ON "ProductLead"("status", "nextFollowAt");
