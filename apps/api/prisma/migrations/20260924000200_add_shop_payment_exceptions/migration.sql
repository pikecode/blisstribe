CREATE TABLE "ShopPaymentException" (
    "id" BIGSERIAL NOT NULL,
    "eventKey" TEXT NOT NULL,
    "orderId" BIGINT NOT NULL,
    "outTradeNo" TEXT NOT NULL,
    "wechatTransactionId" TEXT NOT NULL,
    "amountFen" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPaymentException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopPaymentException_eventKey_key"
    ON "ShopPaymentException"("eventKey");
CREATE INDEX "ShopPaymentException_status_createdAt_idx"
    ON "ShopPaymentException"("status", "createdAt");
CREATE INDEX "ShopPaymentException_orderId_createdAt_idx"
    ON "ShopPaymentException"("orderId", "createdAt");

ALTER TABLE "ShopPaymentException"
    ADD CONSTRAINT "ShopPaymentException_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
