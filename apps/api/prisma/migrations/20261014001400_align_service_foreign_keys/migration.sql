-- 对齐 Prisma 关系的更新策略，仅调整本次新增服务表的外键。
ALTER TABLE "ServiceAppointment" DROP CONSTRAINT "ServiceAppointment_proposedSlotId_fkey";
ALTER TABLE "ServiceAppointment" DROP CONSTRAINT "ServiceAppointment_slotId_fkey";
ALTER TABLE "ServiceAppointmentSlot" DROP CONSTRAINT "ServiceAppointmentSlot_institutionId_fkey";
ALTER TABLE "ServiceNotice" DROP CONSTRAINT "ServiceNotice_userId_fkey";
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ServiceAppointmentSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAppointment" ADD CONSTRAINT "ServiceAppointment_proposedSlotId_fkey" FOREIGN KEY ("proposedSlotId") REFERENCES "ServiceAppointmentSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceAppointmentSlot" ADD CONSTRAINT "ServiceAppointmentSlot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "ServiceInstitution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceNotice" ADD CONSTRAINT "ServiceNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
