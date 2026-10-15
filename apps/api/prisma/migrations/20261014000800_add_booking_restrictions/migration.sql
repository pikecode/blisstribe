ALTER TABLE "ServiceEntitlement" ADD COLUMN "bookingBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ServiceEntitlement" ADD COLUMN "bookingBlockReason" TEXT NOT NULL DEFAULT '';
