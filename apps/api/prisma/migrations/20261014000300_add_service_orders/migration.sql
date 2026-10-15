-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "offeringId" BIGINT NOT NULL,
    "institutionId" BIGINT NOT NULL,
    "leadId" BIGINT,
    "qualificationId" BIGINT,
    "sourcePartnerId" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "totalAmountFen" INTEGER NOT NULL,
    "paymentAmountFen" INTEGER NOT NULL,
    "refundedAmountFen" INTEGER NOT NULL DEFAULT 0,
    "offeringSnapshot" JSONB NOT NULL,
    "institutionSnapshot" JSONB NOT NULL,
    "pricingSnapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderItem" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "offeringItemId" BIGINT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "allocatedAmountFen" INTEGER NOT NULL,
    "institutionSettlementFen" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "institutionId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEntitlement" (
    "id" BIGSERIAL NOT NULL,
    "planId" BIGINT NOT NULL,
    "orderItemId" BIGINT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "usedQuantity" INTEGER NOT NULL DEFAULT 0,
    "refundFrozen" INTEGER NOT NULL DEFAULT 0,
    "refundedQuantity" INTEGER NOT NULL DEFAULT 0,
    "expiredQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceOrder_orderNo_key" ON "ServiceOrder"("orderNo");
CREATE UNIQUE INDEX "ServiceOrder_userId_clientRequestId_key" ON "ServiceOrder"("userId", "clientRequestId");
CREATE INDEX "ServiceOrder_userId_createdAt_idx" ON "ServiceOrder"("userId", "createdAt");
CREATE INDEX "ServiceOrder_institutionId_status_createdAt_idx" ON "ServiceOrder"("institutionId", "status", "createdAt");
CREATE INDEX "ServiceOrder_status_expiresAt_idx" ON "ServiceOrder"("status", "expiresAt");
CREATE INDEX "ServiceOrder_paymentStatus_createdAt_idx" ON "ServiceOrder"("paymentStatus", "createdAt");
CREATE INDEX "ServiceOrderItem_orderId_idx" ON "ServiceOrderItem"("orderId");
CREATE INDEX "ServiceOrderItem_offeringItemId_idx" ON "ServiceOrderItem"("offeringItemId");
CREATE UNIQUE INDEX "ServicePlan_orderId_key" ON "ServicePlan"("orderId");
CREATE INDEX "ServicePlan_userId_status_updatedAt_idx" ON "ServicePlan"("userId", "status", "updatedAt");
CREATE INDEX "ServicePlan_institutionId_status_idx" ON "ServicePlan"("institutionId", "status");
CREATE INDEX "ServicePlan_expiresAt_status_idx" ON "ServicePlan"("expiresAt", "status");
CREATE UNIQUE INDEX "ServiceEntitlement_orderItemId_key" ON "ServiceEntitlement"("orderItemId");
CREATE INDEX "ServiceEntitlement_planId_idx" ON "ServiceEntitlement"("planId");

ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ServiceOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "ServiceInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProductLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "ServiceQualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_sourcePartnerId_fkey" FOREIGN KEY ("sourcePartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_offeringItemId_fkey" FOREIGN KEY ("offeringItemId") REFERENCES "ServiceOfferingItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "ServiceInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceEntitlement" ADD CONSTRAINT "ServiceEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceEntitlement" ADD CONSTRAINT "ServiceEntitlement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "ServiceOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
