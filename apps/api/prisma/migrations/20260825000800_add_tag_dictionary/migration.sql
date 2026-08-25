-- CreateTable
CREATE TABLE "TagDictionary" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT '',
    "moduleId" BIGINT,
    "description" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TagDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TagDictionary_code_key" ON "TagDictionary"("code");

-- CreateIndex
CREATE INDEX "TagDictionary_moduleId_status_sortOrder_idx" ON "TagDictionary"("moduleId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "TagDictionary_group_status_sortOrder_idx" ON "TagDictionary"("group", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "TagDictionary_status_sortOrder_idx" ON "TagDictionary"("status", "sortOrder");

-- AddForeignKey
ALTER TABLE "TagDictionary" ADD CONSTRAINT "TagDictionary_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
