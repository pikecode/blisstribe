ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserAssessment" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "RecommendationEvent" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product" p
SET "tags" = COALESCE((
  SELECT ARRAY_AGG(t."name" ORDER BY t."sortOrder", t."id")
  FROM "TagDictionary" t
  WHERE t."id" = ANY(p."tagIds")
    AND t."deletedAt" IS NULL
), ARRAY[]::TEXT[])
WHERE cardinality(p."tags") = 0
  AND cardinality(p."tagIds") > 0;

UPDATE "UserAssessment" a
SET "tags" = COALESCE((
  SELECT ARRAY_AGG(t."name" ORDER BY t."sortOrder", t."id")
  FROM "TagDictionary" t
  WHERE t."id" = ANY(a."tagIds")
    AND t."deletedAt" IS NULL
), ARRAY[]::TEXT[])
WHERE cardinality(a."tags") = 0
  AND cardinality(a."tagIds") > 0;

UPDATE "RecommendationEvent" e
SET "tags" = COALESCE((
  SELECT ARRAY_AGG(t."name" ORDER BY t."sortOrder", t."id")
  FROM "TagDictionary" t
  WHERE t."id" = ANY(e."tagIds")
    AND t."deletedAt" IS NULL
), ARRAY[]::TEXT[])
WHERE cardinality(e."tags") = 0
  AND cardinality(e."tagIds") > 0;
