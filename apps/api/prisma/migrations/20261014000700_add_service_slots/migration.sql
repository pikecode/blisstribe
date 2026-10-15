CREATE TABLE "ServiceAppointmentSlot" (
  "id" BIGSERIAL PRIMARY KEY,
  "institutionId" BIGINT NOT NULL REFERENCES "ServiceInstitution"("id") ON DELETE RESTRICT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("endAt" > "startAt")
);
CREATE INDEX "ServiceAppointmentSlot_institutionId_enabled_startAt_idx" ON "ServiceAppointmentSlot"("institutionId", "enabled", "startAt");
ALTER TABLE "ServiceAppointment" ADD COLUMN "slotId" BIGINT REFERENCES "ServiceAppointmentSlot"("id") ON DELETE RESTRICT;
CREATE INDEX "ServiceAppointment_slotId_status_idx" ON "ServiceAppointment"("slotId", "status");
