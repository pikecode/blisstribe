-- 让活动曝光、点击、报名复用统一推荐事件表

ALTER TABLE "RecommendationEvent"
  ADD COLUMN IF NOT EXISTS "activityId" BIGINT;

DO $$
BEGIN
  ALTER TABLE "RecommendationEvent"
    ADD CONSTRAINT "RecommendationEvent_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "RecommendationEvent_activityId_createdAt_idx"
  ON "RecommendationEvent"("activityId", "createdAt");
