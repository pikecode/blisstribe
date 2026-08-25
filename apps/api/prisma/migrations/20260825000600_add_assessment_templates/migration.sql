-- CreateTable
CREATE TABLE "AssessmentTemplate" (
    "id" BIGSERIAL NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" BIGSERIAL NOT NULL,
    "templateId" BIGINT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentOption" (
    "id" BIGSERIAL NOT NULL,
    "questionId" BIGINT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "tags" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentTemplate_moduleId_status_sortOrder_idx" ON "AssessmentTemplate"("moduleId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_status_sortOrder_idx" ON "AssessmentTemplate"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_templateId_key_key" ON "AssessmentQuestion"("templateId", "key");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_templateId_sortOrder_idx" ON "AssessmentQuestion"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOption_questionId_value_key" ON "AssessmentOption"("questionId", "value");

-- CreateIndex
CREATE INDEX "AssessmentOption_questionId_sortOrder_idx" ON "AssessmentOption"("questionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
