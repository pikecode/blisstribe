ALTER TABLE "ServiceInstitution" ADD COLUMN "receptionHours" JSONB NOT NULL DEFAULT '{"weekdays":[1,2,3,4,5],"startMinute":540,"endMinute":1020}';
ALTER TABLE "ServiceAppointment" ADD COLUMN "confirmationDeadline" TIMESTAMP(3);
CREATE INDEX "ServiceAppointment_status_confirmationDeadline_idx" ON "ServiceAppointment"("status", "confirmationDeadline");
