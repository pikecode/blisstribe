-- AlterTable
ALTER TABLE "ProductLead" ALTER COLUMN "archived" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecommendationEvent" ALTER COLUMN "clicked" SET NOT NULL,
ALTER COLUMN "converted" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY['user']::TEXT[];

-- CreateTable
CREATE TABLE "ShopCategory" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" BIGSERIAL NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "priceFen" INTEGER NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "soldStock" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCart" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCartItem" (
    "id" BIGSERIAL NOT NULL,
    "cartId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "totalAmountFen" INTEGER NOT NULL,
    "discountAmountFen" INTEGER NOT NULL DEFAULT 0,
    "paymentAmountFen" INTEGER NOT NULL,
    "refundedAmountFen" INTEGER NOT NULL DEFAULT 0,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "shippingAddress" TEXT,
    "trackingNo" TEXT,
    "remark" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "unitPriceFen" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotalFen" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPayment" (
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

    CONSTRAINT "ShopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRefund" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "outRefundNo" TEXT NOT NULL,
    "requestedAmountFen" INTEGER NOT NULL,
    "approvedAmountFen" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "wechatRefundId" TEXT,
    "approvedByAdminId" BIGINT,
    "approvedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopCategory_code_key" ON "ShopCategory"("code");

-- CreateIndex
CREATE INDEX "ShopCategory_sortOrder_idx" ON "ShopCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "ShopProduct_categoryId_status_sortOrder_idx" ON "ShopProduct"("categoryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "ShopProduct_status_createdAt_idx" ON "ShopProduct"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCart_userId_key" ON "ShopCart"("userId");

-- CreateIndex
CREATE INDEX "ShopCartItem_cartId_idx" ON "ShopCartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCartItem_cartId_productId_key" ON "ShopCartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_orderNo_key" ON "ShopOrder"("orderNo");

-- CreateIndex
CREATE INDEX "ShopOrder_userId_createdAt_idx" ON "ShopOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopOrder_status_expiresAt_idx" ON "ShopOrder"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ShopOrder_paymentStatus_idx" ON "ShopOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_outTradeNo_key" ON "ShopPayment"("outTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_wechatTransactionId_key" ON "ShopPayment"("wechatTransactionId");

-- CreateIndex
CREATE INDEX "ShopPayment_orderId_status_idx" ON "ShopPayment"("orderId", "status");

-- CreateIndex
CREATE INDEX "ShopPayment_outTradeNo_idx" ON "ShopPayment"("outTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_refundNo_key" ON "ShopRefund"("refundNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_outRefundNo_key" ON "ShopRefund"("outRefundNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_wechatRefundId_key" ON "ShopRefund"("wechatRefundId");

-- CreateIndex
CREATE INDEX "ShopRefund_orderId_status_idx" ON "ShopRefund"("orderId", "status");

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCart" ADD CONSTRAINT "ShopCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "ShopCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRefund" ADD CONSTRAINT "ShopRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
