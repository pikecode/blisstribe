CREATE TABLE "ShopPaymentExceptionReview" (
    "id" BIGSERIAL NOT NULL,
    "paymentExceptionId" BIGINT NOT NULL,
    "channelCheckResult" TEXT NOT NULL,
    "resolutionNote" TEXT NOT NULL,
    "reviewedByAdminId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPaymentExceptionReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopPaymentExceptionReview_paymentExceptionId_createdAt_idx"
ON "ShopPaymentExceptionReview"("paymentExceptionId", "createdAt");

CREATE INDEX "ShopPaymentExceptionReview_reviewedByAdminId_createdAt_idx"
ON "ShopPaymentExceptionReview"("reviewedByAdminId", "createdAt");

ALTER TABLE "ShopPaymentExceptionReview"
ADD CONSTRAINT "ShopPaymentExceptionReview_paymentExceptionId_fkey"
FOREIGN KEY ("paymentExceptionId") REFERENCES "ShopPaymentException"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
