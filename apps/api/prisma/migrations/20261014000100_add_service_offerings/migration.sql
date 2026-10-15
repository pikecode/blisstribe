-- CreateTable
CREATE TABLE "ServiceInstitution" (
    "id" BIGSERIAL NOT NULL,
    "partnerId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" BIGSERIAL NOT NULL,
    "productId" BIGINT NOT NULL,
    "institutionId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "priceFen" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "requiresQualification" BOOLEAN NOT NULL DEFAULT false,
    "appointmentNotice" TEXT NOT NULL DEFAULT '',
    "refundNotice" TEXT NOT NULL DEFAULT '',
    "defaultPromoterRateBps" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOfferingItem" (
    "id" BIGSERIAL NOT NULL,
    "offeringId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "allocatedAmountFen" INTEGER NOT NULL,
    "institutionSettlementFen" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOfferingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceInstitution_partnerId_key" ON "ServiceInstitution"("partnerId");

-- CreateIndex
CREATE INDEX "ServiceInstitution_status_createdAt_idx" ON "ServiceInstitution"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceInstitution_deletedAt_idx" ON "ServiceInstitution"("deletedAt");

-- CreateIndex
CREATE INDEX "ServiceOffering_productId_status_sortOrder_idx" ON "ServiceOffering"("productId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceOffering_institutionId_status_idx" ON "ServiceOffering"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ServiceOffering_status_publishedAt_idx" ON "ServiceOffering"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ServiceOffering_deletedAt_idx" ON "ServiceOffering"("deletedAt");

-- CreateIndex
CREATE INDEX "ServiceOfferingItem_offeringId_sortOrder_idx" ON "ServiceOfferingItem"("offeringId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ServiceInstitution" ADD CONSTRAINT "ServiceInstitution_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "ServiceInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOfferingItem" ADD CONSTRAINT "ServiceOfferingItem_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
