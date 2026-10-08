ALTER TABLE "ShopRefund"
ADD COLUMN "lastProviderStatus" TEXT,
ADD COLUMN "lastErrorCode" TEXT,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX "ShopRefund_status_lastAttemptAt_idx"
ON "ShopRefund"("status", "lastAttemptAt");

CREATE TABLE "ShopRefundEvent" (
    "id" BIGSERIAL NOT NULL,
    "refundId" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" BIGINT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "providerStatus" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopRefundEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopRefundEvent_refundId_createdAt_idx"
ON "ShopRefundEvent"("refundId", "createdAt");

CREATE INDEX "ShopRefundEvent_eventType_createdAt_idx"
ON "ShopRefundEvent"("eventType", "createdAt");

ALTER TABLE "ShopRefundEvent"
ADD CONSTRAINT "ShopRefundEvent_refundId_fkey"
FOREIGN KEY ("refundId") REFERENCES "ShopRefund"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
