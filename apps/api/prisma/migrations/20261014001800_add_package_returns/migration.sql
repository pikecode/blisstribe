ALTER TABLE "ServiceRefundItem" ADD COLUMN "fromGoodsReturn" BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN "goodsReusable" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE "ServiceGoodsReturn" (
 "id" BIGSERIAL PRIMARY KEY,
 "entitlementId" BIGINT NOT NULL,
 "clientRequestId" TEXT NOT NULL,
 "quantity" INTEGER NOT NULL,
 "reason" TEXT NOT NULL,
 "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "status" TEXT NOT NULL DEFAULT 'requested',
 "returnAddress" TEXT NOT NULL DEFAULT '',
 "deadline" TIMESTAMP(3),
 "expressCompany" TEXT NOT NULL DEFAULT '',
 "trackingNo" TEXT NOT NULL DEFAULT '',
 "note" TEXT NOT NULL DEFAULT '',
 "refundId" BIGINT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ServiceGoodsReturn_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "ServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ServiceGoodsReturn_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "ServiceRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ServiceGoodsReturn_quantity_check" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "ServiceGoodsReturn_entitlementId_clientRequestId_key" ON "ServiceGoodsReturn"("entitlementId", "clientRequestId");
