ALTER TABLE "User" ADD COLUMN "tagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];

UPDATE "User" u
SET "tagIds" = COALESCE((
  SELECT ARRAY_AGG(DISTINCT t.id)
  FROM "TagDictionary" t
  WHERE t."deletedAt" IS NULL
    AND t.status = 1
    AND t.name = ANY(u.tags)
), ARRAY[]::BIGINT[])
WHERE cardinality(u.tags) > 0;
