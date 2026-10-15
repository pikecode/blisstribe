-- 保留历史成交项目关联，方案修改后仅当前项目参与新购买。
ALTER TABLE "ServiceOfferingItem" ADD COLUMN "retiredAt" TIMESTAMP(3);
