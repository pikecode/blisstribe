CREATE TABLE "ServiceFollowUp" (
  "id" BIGSERIAL PRIMARY KEY,
  "planId" BIGINT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "contactName" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "outcome" TEXT NOT NULL DEFAULT '',
  "patientFeedback" TEXT NOT NULL DEFAULT '',
  "feedbackAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdByAdminId" BIGINT NOT NULL,
  "completedByAdminId" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceFollowUp_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceFollowUp_status_check" CHECK ("status" IN ('scheduled', 'completed', 'cancelled'))
);
CREATE UNIQUE INDEX "ServiceFollowUp_planId_clientRequestId_key" ON "ServiceFollowUp"("planId", "clientRequestId");
CREATE INDEX "ServiceFollowUp_status_scheduledAt_idx" ON "ServiceFollowUp"("status", "scheduledAt");
