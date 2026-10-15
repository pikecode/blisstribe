ALTER TABLE "ServiceAppointment" ADD COLUMN "proposedSlotId" BIGINT REFERENCES "ServiceAppointmentSlot"("id") ON DELETE RESTRICT;
ALTER TABLE "ServiceAppointment" ADD COLUMN "proposalReason" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceAppointment" ADD COLUMN "proposalExpiresAt" TIMESTAMP(3);
