-- CreateTable
CREATE TABLE "ServicePayment" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "outTradeNo" TEXT NOT NULL,
    "wechatTransactionId" TEXT,
    "prepayId" TEXT,
    "amountFen" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicePayment_outTradeNo_key" ON "ServicePayment"("outTradeNo");
CREATE UNIQUE INDEX "ServicePayment_wechatTransactionId_key" ON "ServicePayment"("wechatTransactionId");
CREATE INDEX "ServicePayment_orderId_status_idx" ON "ServicePayment"("orderId", "status");

ALTER TABLE "ServicePayment" ADD CONSTRAINT "ServicePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
