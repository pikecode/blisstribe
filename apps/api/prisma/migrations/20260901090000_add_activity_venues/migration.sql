-- 新增活动场地与排期能力

CREATE TABLE "Venue" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "capacity" INTEGER,
    "facilities" TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactPhoneMasked" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueImage" (
    "id" BIGSERIAL NOT NULL,
    "venueId" BIGINT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueAvailability" (
    "id" BIGSERIAL NOT NULL,
    "venueId" BIGINT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VenueAvailability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueBlockedSlot" (
    "id" BIGSERIAL NOT NULL,
    "venueId" BIGINT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueBlockedSlot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Activity"
  ADD COLUMN IF NOT EXISTS "venueId" BIGINT,
  ADD COLUMN IF NOT EXISTS "venueSnapshot" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "Venue_status_sortOrder_idx" ON "Venue"("status", "sortOrder");
CREATE INDEX "Venue_city_district_idx" ON "Venue"("city", "district");
CREATE INDEX "Venue_deletedAt_idx" ON "Venue"("deletedAt");
CREATE INDEX "VenueImage_venueId_sortOrder_idx" ON "VenueImage"("venueId", "sortOrder");
CREATE INDEX "VenueAvailability_venueId_weekday_idx" ON "VenueAvailability"("venueId", "weekday");
CREATE INDEX "VenueBlockedSlot_venueId_startAt_endAt_idx" ON "VenueBlockedSlot"("venueId", "startAt", "endAt");
CREATE INDEX "Activity_venueId_startAt_endAt_idx" ON "Activity"("venueId", "startAt", "endAt");

ALTER TABLE "VenueImage" ADD CONSTRAINT "VenueImage_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueAvailability" ADD CONSTRAINT "VenueAvailability_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueBlockedSlot" ADD CONSTRAINT "VenueBlockedSlot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
