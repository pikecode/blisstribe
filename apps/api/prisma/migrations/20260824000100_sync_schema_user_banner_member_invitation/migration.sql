-- Align committed migrations with the current Prisma schema.
-- 补齐用户扩展字段、会员邀请和 Banner，避免新环境按迁移初始化后运行时缺列。

ALTER TABLE "User" ADD COLUMN "age" INTEGER,
ADD COLUMN "douyinPayCode" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "favoriteColor" TEXT,
ADD COLUMN "identity" TEXT,
ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "invitedBy" BIGINT,
ADD COLUMN "level" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN "occupation" TEXT,
ADD COLUMN "realName" TEXT,
ADD COLUMN "tags" TEXT[],
ADD COLUMN "wechatId" TEXT;

CREATE TABLE "MemberInvitation" (
    "id" BIGSERIAL NOT NULL,
    "inviterId" BIGINT NOT NULL,
    "inviteeId" BIGINT,
    "inviteCode" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Banner" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "gradient" TEXT NOT NULL DEFAULT '',
    "linkUrl" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemberInvitation_inviterId_idx" ON "MemberInvitation"("inviterId");
CREATE INDEX "MemberInvitation_inviteeId_idx" ON "MemberInvitation"("inviteeId");
CREATE INDEX "MemberInvitation_inviteCode_idx" ON "MemberInvitation"("inviteCode");
CREATE INDEX "MemberInvitation_status_idx" ON "MemberInvitation"("status");
CREATE INDEX "Banner_status_sort_idx" ON "Banner"("status", "sort");
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");
CREATE INDEX "User_inviteCode_idx" ON "User"("inviteCode");
CREATE INDEX "User_invitedBy_idx" ON "User"("invitedBy");

ALTER TABLE "User" ADD CONSTRAINT "User_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberInvitation" ADD CONSTRAINT "MemberInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInvitation" ADD CONSTRAINT "MemberInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
