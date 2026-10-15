CREATE TABLE "ServiceNotice" (
  "id" BIGSERIAL PRIMARY KEY,
  "eventKey" TEXT NOT NULL UNIQUE,
  "userId" BIGINT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ServiceNotice_userId_createdAt_idx" ON "ServiceNotice"("userId", "createdAt");
