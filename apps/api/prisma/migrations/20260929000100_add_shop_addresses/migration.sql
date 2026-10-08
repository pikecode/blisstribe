CREATE TABLE "ShopAddress" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopAddress_userId_isDefault_idx" ON "ShopAddress"("userId", "isDefault");
CREATE INDEX "ShopAddress_userId_updatedAt_idx" ON "ShopAddress"("userId", "updatedAt");

ALTER TABLE "ShopAddress" ADD CONSTRAINT "ShopAddress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
