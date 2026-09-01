-- 场地设施从场地内字符串数组升级为可复用设施字典

CREATE TABLE "VenueFacility" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VenueFacility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueFacilityOnVenue" (
    "venueId" BIGINT NOT NULL,
    "facilityId" BIGINT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenueFacilityOnVenue_pkey" PRIMARY KEY ("venueId","facilityId")
);

CREATE UNIQUE INDEX "VenueFacility_name_key" ON "VenueFacility"("name");
CREATE INDEX "VenueFacility_status_sortOrder_idx" ON "VenueFacility"("status", "sortOrder");
CREATE INDEX "VenueFacility_deletedAt_idx" ON "VenueFacility"("deletedAt");
CREATE INDEX "VenueFacilityOnVenue_facilityId_idx" ON "VenueFacilityOnVenue"("facilityId");
CREATE INDEX "VenueFacilityOnVenue_venueId_sortOrder_idx" ON "VenueFacilityOnVenue"("venueId", "sortOrder");

INSERT INTO "VenueFacility" ("name", "sortOrder", "createdAt", "updatedAt")
SELECT name, ROW_NUMBER() OVER (ORDER BY name) - 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM(item) AS name
  FROM "Venue", UNNEST(COALESCE("Venue"."facilities", ARRAY[]::TEXT[])) AS item
  WHERE TRIM(item) <> ''
) AS facility_names
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "VenueFacilityOnVenue" ("venueId", "facilityId", "sortOrder")
SELECT venue_facilities."venueId", "VenueFacility"."id", venue_facilities."sortOrder"
FROM (
  SELECT "Venue"."id" AS "venueId", TRIM(item) AS name, ordinality - 1 AS "sortOrder"
  FROM "Venue", UNNEST(COALESCE("Venue"."facilities", ARRAY[]::TEXT[])) WITH ORDINALITY AS facility_items(item, ordinality)
  WHERE TRIM(item) <> ''
) AS venue_facilities
JOIN "VenueFacility" ON "VenueFacility"."name" = venue_facilities.name
ON CONFLICT ("venueId", "facilityId") DO NOTHING;

ALTER TABLE "VenueFacilityOnVenue" ADD CONSTRAINT "VenueFacilityOnVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueFacilityOnVenue" ADD CONSTRAINT "VenueFacilityOnVenue_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "VenueFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Venue" DROP COLUMN "facilities";
