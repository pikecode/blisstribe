-- 新增活动发布与报名模型

CREATE TABLE "Activity" (
    "id" BIGSERIAL NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "activityType" TEXT NOT NULL DEFAULT 'online',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "registrationStartAt" TIMESTAMP(3),
    "registrationEndAt" TIMESTAMP(3) NOT NULL,
    "locationText" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER,
    "targetUserText" TEXT NOT NULL DEFAULT '',
    "highlights" TEXT[],
    "detail" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "tagIds" BIGINT[],
    "relatedProductIds" BIGINT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityRegistration" (
    "id" BIGSERIAL NOT NULL,
    "activityId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "partnerId" BIGINT,
    "sourceInviteCode" TEXT,
    "sourceScene" TEXT NOT NULL DEFAULT 'miniapp',
    "name" TEXT NOT NULL DEFAULT '',
    "phoneMasked" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'registered',
    "followUpNote" TEXT NOT NULL DEFAULT '',
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRegistration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Activity_moduleId_status_idx" ON "Activity"("moduleId", "status");
CREATE INDEX "Activity_activityType_status_idx" ON "Activity"("activityType", "status");
CREATE INDEX "Activity_status_startAt_idx" ON "Activity"("status", "startAt");
CREATE INDEX "Activity_registrationEndAt_idx" ON "Activity"("registrationEndAt");
CREATE INDEX "Activity_deletedAt_idx" ON "Activity"("deletedAt");

CREATE INDEX "ActivityRegistration_activityId_status_idx" ON "ActivityRegistration"("activityId", "status");
CREATE INDEX "ActivityRegistration_userId_createdAt_idx" ON "ActivityRegistration"("userId", "createdAt");
CREATE INDEX "ActivityRegistration_partnerId_createdAt_idx" ON "ActivityRegistration"("partnerId", "createdAt");
CREATE INDEX "ActivityRegistration_status_createdAt_idx" ON "ActivityRegistration"("status", "createdAt");
CREATE UNIQUE INDEX "ActivityRegistration_activityId_userId_key" ON "ActivityRegistration"("activityId", "userId");

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
