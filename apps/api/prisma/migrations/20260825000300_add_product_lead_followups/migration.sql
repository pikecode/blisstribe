CREATE TABLE "ProductLeadFollowUp" (
  "id" BIGSERIAL NOT NULL,
  "leadId" BIGINT NOT NULL,
  "operatorId" BIGINT,
  "operatorType" TEXT NOT NULL DEFAULT 'admin',
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "nextFollowAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductLeadFollowUp_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductLeadFollowUp"
ADD CONSTRAINT "ProductLeadFollowUp_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "ProductLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProductLeadFollowUp_leadId_createdAt_idx" ON "ProductLeadFollowUp"("leadId", "createdAt");
CREATE INDEX "ProductLeadFollowUp_operatorType_operatorId_idx" ON "ProductLeadFollowUp"("operatorType", "operatorId");
CREATE INDEX "ProductLeadFollowUp_nextFollowAt_idx" ON "ProductLeadFollowUp"("nextFollowAt");

INSERT INTO "ProductLeadFollowUp" ("leadId", "operatorType", "fromStatus", "toStatus", "note", "createdAt")
SELECT
  "id",
  'system',
  'created',
  "status",
  CASE WHEN "followUpNote" <> '' THEN "followUpNote" ELSE '线索创建' END,
  "createdAt"
FROM "ProductLead";
