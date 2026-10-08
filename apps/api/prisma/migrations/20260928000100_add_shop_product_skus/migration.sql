CREATE TABLE "ShopProductSku" (
    "id" BIGSERIAL NOT NULL,
    "productId" BIGINT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "specifications" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "specificationKey" TEXT NOT NULL,
    "priceFen" INTEGER NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "soldStock" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopProductSku_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopProductSku_skuCode_key" ON "ShopProductSku"("skuCode");
CREATE UNIQUE INDEX "ShopProductSku_productId_specificationKey_key"
    ON "ShopProductSku"("productId", "specificationKey");
CREATE INDEX "ShopProductSku_productId_enabled_idx"
    ON "ShopProductSku"("productId", "enabled");
ALTER TABLE "ShopProductSku" ADD CONSTRAINT "ShopProductSku_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ShopProductSku" (
    "productId",
    "skuCode",
    "specifications",
    "specificationKey",
    "priceFen",
    "totalStock",
    "reservedStock",
    "soldStock",
    "updatedAt"
)
SELECT
    p."id",
    'DEFAULT-' || p."id"::text,
    '{}'::jsonb,
    '',
    p."priceFen",
    p."totalStock",
    p."reservedStock",
    p."soldStock",
    CURRENT_TIMESTAMP
FROM "ShopProduct" p;

ALTER TABLE "ShopCartItem" ADD COLUMN "skuId" BIGINT;
UPDATE "ShopCartItem" c
SET "skuId" = s."id"
FROM "ShopProductSku" s
WHERE s."productId" = c."productId";
ALTER TABLE "ShopCartItem" ALTER COLUMN "skuId" SET NOT NULL;
ALTER TABLE "ShopCartItem" DROP CONSTRAINT "ShopCartItem_productId_fkey";
DROP INDEX "ShopCartItem_cartId_productId_key";
ALTER TABLE "ShopCartItem" DROP COLUMN "productId";
CREATE UNIQUE INDEX "ShopCartItem_cartId_skuId_key" ON "ShopCartItem"("cartId", "skuId");
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_skuId_fkey"
    FOREIGN KEY ("skuId") REFERENCES "ShopProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopOrderItem"
    ADD COLUMN "skuId" BIGINT,
    ADD COLUMN "skuCode" TEXT,
    ADD COLUMN "skuSpecifications" JSONB;
UPDATE "ShopOrderItem" oi
SET
    "skuId" = s."id",
    "skuCode" = s."skuCode",
    "skuSpecifications" = s."specifications"
FROM "ShopProductSku" s
WHERE s."productId" = oi."productId";
ALTER TABLE "ShopOrderItem"
    ALTER COLUMN "skuId" SET NOT NULL,
    ALTER COLUMN "skuCode" SET NOT NULL,
    ALTER COLUMN "skuSpecifications" SET NOT NULL;
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_skuId_fkey"
    FOREIGN KEY ("skuId") REFERENCES "ShopProductSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopProduct"
    DROP COLUMN "priceFen",
    DROP COLUMN "totalStock",
    DROP COLUMN "reservedStock",
    DROP COLUMN "soldStock";
