CREATE TABLE "ServiceRefund" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "outRefundNo" TEXT NOT NULL,
    "requestedAmountFen" INTEGER NOT NULL,
    "approvedAmountFen" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "wechatRefundId" TEXT,
    "approvedByAdminId" BIGINT,
    "approvedAt" TIMESTAMP(3),
    "adminNote" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "lastProviderStatus" TEXT,
    "lastErrorCode" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceRefund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRefundItem" (
    "id" BIGSERIAL NOT NULL,
    "refundId" BIGINT NOT NULL,
    "entitlementId" BIGINT NOT NULL,
    "orderItemId" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountFen" INTEGER NOT NULL,
    CONSTRAINT "ServiceRefundItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRefundEvent" (
    "id" BIGSERIAL NOT NULL,
    "refundId" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" BIGINT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "providerStatus" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceRefundEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceRefund_refundNo_key" ON "ServiceRefund"("refundNo");
CREATE UNIQUE INDEX "ServiceRefund_outRefundNo_key" ON "ServiceRefund"("outRefundNo");
CREATE UNIQUE INDEX "ServiceRefund_wechatRefundId_key" ON "ServiceRefund"("wechatRefundId");
CREATE INDEX "ServiceRefund_orderId_status_idx" ON "ServiceRefund"("orderId", "status");
CREATE INDEX "ServiceRefund_userId_createdAt_idx" ON "ServiceRefund"("userId", "createdAt");
CREATE INDEX "ServiceRefund_status_lastAttemptAt_idx" ON "ServiceRefund"("status", "lastAttemptAt");
CREATE UNIQUE INDEX "ServiceRefundItem_refundId_entitlementId_key" ON "ServiceRefundItem"("refundId", "entitlementId");
CREATE INDEX "ServiceRefundItem_entitlementId_idx" ON "ServiceRefundItem"("entitlementId");
CREATE INDEX "ServiceRefundItem_orderItemId_idx" ON "ServiceRefundItem"("orderItemId");
CREATE INDEX "ServiceRefundEvent_refundId_createdAt_idx" ON "ServiceRefundEvent"("refundId", "createdAt");

ALTER TABLE "ServiceAppointment" ADD COLUMN "refundId" BIGINT;
CREATE INDEX "ServiceAppointment_refundId_idx" ON "ServiceAppointment"("refundId");

ALTER TABLE "ServiceRefund" ADD CONSTRAINT "ServiceRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRefund" ADD CONSTRAINT "ServiceRefund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRefundItem" ADD CONSTRAINT "ServiceRefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "ServiceRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRefundItem" ADD CONSTRAINT "ServiceRefundItem_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "ServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRefundEvent" ADD CONSTRAINT "ServiceRefundEvent_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "ServiceRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "ServiceRefund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
