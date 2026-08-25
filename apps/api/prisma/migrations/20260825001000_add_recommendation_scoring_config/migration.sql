ALTER TABLE "AssessmentOption" ADD COLUMN "tagWeights" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "UserAssessment" ADD COLUMN "tagWeights" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "primaryTagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];
ALTER TABLE "Product" ADD COLUMN "secondaryTagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];
ALTER TABLE "Product" ADD COLUMN "excludeTagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];

UPDATE "Product"
SET "primaryTagIds" = "tagIds"
WHERE cardinality("primaryTagIds") = 0
  AND cardinality("tagIds") > 0;

UPDATE "AssessmentOption"
SET "tagWeights" = (
  SELECT COALESCE(jsonb_object_agg(tag_id::text, 1), '{}')
  FROM unnest("tagIds") AS tag_id
)
WHERE "tagWeights" = '{}';

UPDATE "UserAssessment"
SET "tagWeights" = (
  SELECT COALESCE(jsonb_object_agg(tag_id::text, 1), '{}')
  FROM unnest("tagIds") AS tag_id
)
WHERE "tagWeights" = '{}';
