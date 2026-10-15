-- CreateTable
CREATE TABLE "ServiceQualification" (
    "id" BIGSERIAL NOT NULL,
    "leadId" BIGINT NOT NULL,
    "offeringId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT NOT NULL DEFAULT '',
    "confirmedByAdminId" BIGINT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceQualification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceQualification_leadId_offeringId_key" ON "ServiceQualification"("leadId", "offeringId");

-- CreateIndex
CREATE INDEX "ServiceQualification_leadId_status_expiresAt_idx" ON "ServiceQualification"("leadId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "ServiceQualification_offeringId_status_idx" ON "ServiceQualification"("offeringId", "status");

-- AddForeignKey
ALTER TABLE "ServiceQualification" ADD CONSTRAINT "ServiceQualification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProductLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQualification" ADD CONSTRAINT "ServiceQualification_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
