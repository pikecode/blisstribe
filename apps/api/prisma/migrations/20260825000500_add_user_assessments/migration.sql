CREATE TABLE "UserAssessment" (
  "id" BIGSERIAL NOT NULL,
  "userId" BIGINT NOT NULL,
  "moduleCode" TEXT NOT NULL,
  "assessmentType" TEXT NOT NULL,
  "tags" TEXT[],
  "summary" TEXT NOT NULL DEFAULT '',
  "answers" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserAssessment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserAssessment"
ADD CONSTRAINT "UserAssessment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "UserAssessment_userId_moduleCode_key" ON "UserAssessment"("userId", "moduleCode");
CREATE INDEX "UserAssessment_userId_updatedAt_idx" ON "UserAssessment"("userId", "updatedAt");
CREATE INDEX "UserAssessment_moduleCode_assessmentType_idx" ON "UserAssessment"("moduleCode", "assessmentType");
