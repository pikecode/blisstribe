ALTER TABLE "ServiceAppointment" ADD COLUMN "correctionStatus" TEXT NOT NULL DEFAULT 'none', ADD COLUMN "correctionReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceRefundItem" ADD COLUMN "compensation" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE "ServiceDispute" (
 "id" BIGSERIAL PRIMARY KEY,
 "planId" BIGINT NOT NULL,
 "appointmentId" BIGINT NOT NULL,
 "replacementAppointmentId" BIGINT,
 "correctedEntitlementId" BIGINT,
 "clientRequestId" TEXT NOT NULL,
 "reasonType" TEXT NOT NULL,
 "description" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'submitted',
 "ownerAdminId" BIGINT,
 "ownerName" TEXT NOT NULL DEFAULT '',
 "proposedByAdminId" BIGINT,
 "reviewedByAdminId" BIGINT,
 "evidence" TEXT NOT NULL DEFAULT '',
 "outcome" TEXT NOT NULL DEFAULT '',
 "proposal" TEXT NOT NULL DEFAULT '',
 "refundAmountFen" INTEGER NOT NULL DEFAULT 0,
 "costBearer" TEXT NOT NULL DEFAULT '',
 "clawbackNote" TEXT NOT NULL DEFAULT '',
 "restoredExpiresAt" TIMESTAMP(3),
 "refundId" BIGINT,
 "deadline" TIMESTAMP(3),
 "acceptedAt" TIMESTAMP(3),
 "resolvedAt" TIMESTAMP(3),
 "overdueNotifiedAt" TIMESTAMP(3),
 "settlementHeld" BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ServiceDispute_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ServiceDispute_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ServiceAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ServiceDispute_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "ServiceRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ServiceDispute_replacementAppointmentId_fkey" FOREIGN KEY ("replacementAppointmentId") REFERENCES "ServiceAppointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ServiceDispute_correctedEntitlementId_fkey" FOREIGN KEY ("correctedEntitlementId") REFERENCES "ServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceDispute_appointmentId_key" ON "ServiceDispute"("appointmentId");
CREATE UNIQUE INDEX "ServiceDispute_replacementAppointmentId_key" ON "ServiceDispute"("replacementAppointmentId");
CREATE INDEX "ServiceDispute_planId_status_idx" ON "ServiceDispute"("planId", "status");
CREATE INDEX "ServiceDispute_status_deadline_idx" ON "ServiceDispute"("status", "deadline");
CREATE TABLE "ServiceDisputeEvent" (
 "id" BIGSERIAL PRIMARY KEY,
 "disputeId" BIGINT NOT NULL,
 "actorType" TEXT NOT NULL,
 "actorId" BIGINT NOT NULL,
 "eventType" TEXT NOT NULL,
 "detail" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ServiceDisputeEvent_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "ServiceDispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ServiceDisputeEvent_disputeId_createdAt_idx" ON "ServiceDisputeEvent"("disputeId", "createdAt");
