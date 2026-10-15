CREATE TABLE "ServiceAppointment" (
    "id" BIGSERIAL NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "planId" BIGINT NOT NULL,
    "entitlementId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "institutionId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedStartAt" TIMESTAMP(3) NOT NULL,
    "confirmedStartAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "assignedStaffName" TEXT NOT NULL DEFAULT '',
    "patientNote" TEXT NOT NULL DEFAULT '',
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "confirmedByAdminId" BIGINT,
    "confirmedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceAppointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceAppointment_userId_clientRequestId_key" ON "ServiceAppointment"("userId", "clientRequestId");
CREATE INDEX "ServiceAppointment_planId_status_requestedStartAt_idx" ON "ServiceAppointment"("planId", "status", "requestedStartAt");
CREATE INDEX "ServiceAppointment_institutionId_status_requestedStartAt_idx" ON "ServiceAppointment"("institutionId", "status", "requestedStartAt");
CREATE INDEX "ServiceAppointment_userId_status_requestedStartAt_idx" ON "ServiceAppointment"("userId", "status", "requestedStartAt");

ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "ServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "ServiceInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
