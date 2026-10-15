ALTER TABLE "ServiceAppointment" ADD COLUMN "performedByName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceAppointment" ADD COLUMN "completedByAdminId" BIGINT;
