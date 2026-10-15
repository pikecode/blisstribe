ALTER TABLE "ServiceOfferingItem"
 ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'service',
 ADD COLUMN "skuId" BIGINT,
 ADD COLUMN "deliveryMethod" TEXT NOT NULL DEFAULT 'pickup',
 ADD COLUMN "returnNotice" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "goodsSnapshot" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ServiceOrderItem"
 ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'service',
 ADD COLUMN "skuId" BIGINT,
 ADD COLUMN "deliveryMethod" TEXT NOT NULL DEFAULT 'pickup',
 ADD COLUMN "returnNotice" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "goodsSnapshot" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ServiceOfferingItem" ADD CONSTRAINT "ServiceOfferingItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ShopProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ShopProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceEntitlement"
 ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
 ADD COLUMN "deliveryAddress" JSONB,
 ADD COLUMN "expressCompany" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "trackingNo" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "deliveredAt" TIMESTAMP(3),
 ADD COLUMN "deliveryEvidence" TEXT NOT NULL DEFAULT '';
