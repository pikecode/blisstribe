-- CreateTable
CREATE TABLE "Partner" (
    "id" BIGSERIAL NOT NULL,
    "partnerNo" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'normal',
    "status" INTEGER NOT NULL DEFAULT 0,
    "auditStatus" INTEGER NOT NULL DEFAULT 0,
    "auditReason" TEXT,
    "contactName" TEXT,
    "contactPhoneCiphertext" BYTEA,
    "contactPhoneHash" TEXT,
    "contactPhoneMasked" TEXT,
    "regionCode" TEXT,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMember" (
    "id" BIGSERIAL NOT NULL,
    "partnerId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" INTEGER NOT NULL DEFAULT 1,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" BIGINT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" BIGINT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerNo_key" ON "Partner"("partnerNo");

-- CreateIndex
CREATE INDEX "Partner_status_auditStatus_idx" ON "Partner"("status", "auditStatus");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMember_partnerId_userId_role_key" ON "PartnerMember"("partnerId", "userId", "role");

-- CreateIndex
CREATE INDEX "PartnerMember_userId_status_idx" ON "PartnerMember"("userId", "status");

-- CreateIndex
CREATE INDEX "PartnerMember_partnerId_status_idx" ON "PartnerMember"("partnerId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
