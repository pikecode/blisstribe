-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" BIGSERIAL NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationRecord" (
    "id" BIGSERIAL NOT NULL,
    "codeId" BIGINT,
    "code" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "partnerId" BIGINT,
    "userId" BIGINT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRelation" (
    "id" BIGSERIAL NOT NULL,
    "partnerId" BIGINT NOT NULL,
    "customerUserId" BIGINT NOT NULL,
    "sourceInvitationCode" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationEvent" (
    "id" BIGSERIAL NOT NULL,
    "relationId" BIGINT,
    "partnerId" BIGINT,
    "customerUserId" BIGINT,
    "eventType" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "operatorType" TEXT NOT NULL,
    "operatorId" BIGINT,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
CREATE INDEX "InvitationCode_ownerType_ownerId_idx" ON "InvitationCode"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "InvitationCode_scene_status_idx" ON "InvitationCode"("scene", "status");

-- CreateIndex
CREATE INDEX "InvitationCode_expiresAt_idx" ON "InvitationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "InvitationRecord_code_idx" ON "InvitationRecord"("code");

-- CreateIndex
CREATE INDEX "InvitationRecord_partnerId_status_idx" ON "InvitationRecord"("partnerId", "status");

-- CreateIndex
CREATE INDEX "InvitationRecord_userId_idx" ON "InvitationRecord"("userId");

-- CreateIndex
CREATE INDEX "InvitationRecord_createdAt_idx" ON "InvitationRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRelation_partnerId_customerUserId_key" ON "CustomerRelation"("partnerId", "customerUserId");

-- CreateIndex
CREATE INDEX "CustomerRelation_customerUserId_status_idx" ON "CustomerRelation"("customerUserId", "status");

-- CreateIndex
CREATE INDEX "CustomerRelation_partnerId_status_idx" ON "CustomerRelation"("partnerId", "status");

-- CreateIndex
CREATE INDEX "CustomerRelation_boundAt_idx" ON "CustomerRelation"("boundAt");

-- CreateIndex
CREATE INDEX "RelationEvent_relationId_idx" ON "RelationEvent"("relationId");

-- CreateIndex
CREATE INDEX "RelationEvent_partnerId_createdAt_idx" ON "RelationEvent"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "RelationEvent_customerUserId_createdAt_idx" ON "RelationEvent"("customerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RelationEvent_eventType_idx" ON "RelationEvent"("eventType");

-- AddForeignKey
ALTER TABLE "InvitationRecord" ADD CONSTRAINT "InvitationRecord_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "InvitationCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRecord" ADD CONSTRAINT "InvitationRecord_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRecord" ADD CONSTRAINT "InvitationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRelation" ADD CONSTRAINT "CustomerRelation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRelation" ADD CONSTRAINT "CustomerRelation_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationEvent" ADD CONSTRAINT "RelationEvent_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "CustomerRelation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationEvent" ADD CONSTRAINT "RelationEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationEvent" ADD CONSTRAINT "RelationEvent_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
