ALTER TABLE "UserAssessment" ADD COLUMN "tagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];
ALTER TABLE "AssessmentOption" ADD COLUMN "tagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];
ALTER TABLE "AssessmentRecommendationRule" ADD COLUMN "conditionTagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];
ALTER TABLE "Product" ADD COLUMN "tagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];
ALTER TABLE "ProductLead" ADD COLUMN "needTagIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];

UPDATE "Product" p
SET "tagIds" = COALESCE((
  SELECT array_agg(DISTINCT t.id ORDER BY t.id)
  FROM "TagDictionary" t
  WHERE t."deletedAt" IS NULL
    AND t.name = ANY(p.tags)
    AND (t."moduleId" IS NULL OR t."moduleId" = p."moduleId")
), ARRAY[]::BIGINT[]);

UPDATE "AssessmentOption" o
SET "tagIds" = COALESCE((
  SELECT array_agg(DISTINCT t.id ORDER BY t.id)
  FROM "TagDictionary" t
  JOIN "AssessmentQuestion" q ON q.id = o."questionId"
  JOIN "AssessmentTemplate" tpl ON tpl.id = q."templateId"
  WHERE t."deletedAt" IS NULL
    AND t.name = ANY(o.tags)
    AND (t."moduleId" IS NULL OR t."moduleId" = tpl."moduleId")
), ARRAY[]::BIGINT[]);

UPDATE "AssessmentRecommendationRule" r
SET "conditionTagIds" = COALESCE((
  SELECT array_agg(DISTINCT t.id ORDER BY t.id)
  FROM "TagDictionary" t
  WHERE t."deletedAt" IS NULL
    AND t.name = ANY(r."conditionTags")
    AND (t."moduleId" IS NULL OR t."moduleId" = r."moduleId")
), ARRAY[]::BIGINT[]);

UPDATE "UserAssessment" ua
SET "tagIds" = COALESCE((
  SELECT array_agg(DISTINCT t.id ORDER BY t.id)
  FROM "TagDictionary" t
  LEFT JOIN "ProductModule" m ON m.code = ua."moduleCode"
  WHERE t."deletedAt" IS NULL
    AND t.name = ANY(ua.tags)
    AND (t."moduleId" IS NULL OR t."moduleId" = m.id)
), ARRAY[]::BIGINT[]);

UPDATE "ProductLead" l
SET "needTagIds" = COALESCE((
  SELECT array_agg(DISTINCT t.id ORDER BY t.id)
  FROM "TagDictionary" t
  JOIN "Product" p ON p.id = l."productId"
  WHERE t."deletedAt" IS NULL
    AND t.name = ANY(l."needTags")
    AND (t."moduleId" IS NULL OR t."moduleId" = p."moduleId")
), ARRAY[]::BIGINT[]);
