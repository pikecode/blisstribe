-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "phoneCiphertext" BYTEA NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "phoneMasked" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "gender" INTEGER NOT NULL DEFAULT 0,
    "birthday" TIMESTAMP(3),
    "passwordHash" TEXT,
    "inviteCode" TEXT,
    "invitedBy" BIGINT,
    "realName" TEXT,
    "wechatId" TEXT,
    "email" TEXT,
    "age" INTEGER,
    "favoriteColor" TEXT,
    "occupation" TEXT,
    "tags" TEXT[],
    "tagIds" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    "identity" TEXT,
    "level" TEXT NOT NULL DEFAULT 'normal',
    "douyinPayCode" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAssessment" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "tags" TEXT[],
    "tagIds" BIGINT[],
    "tagWeights" JSONB NOT NULL DEFAULT '{}',
    "summary" TEXT NOT NULL DEFAULT '',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WechatAccount" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "wxOpenIdHash" TEXT NOT NULL,
    "wxUnionId" TEXT,
    "wxNickname" TEXT,
    "wxAvatar" TEXT,
    "wxGender" INTEGER NOT NULL DEFAULT 0,
    "wxCountry" TEXT,
    "wxProvince" TEXT,
    "wxCity" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WechatAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "jti" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "platform" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRegisterTemp" (
    "id" BIGSERIAL NOT NULL,
    "tempToken" TEXT NOT NULL,
    "wxOpenIdHash" TEXT,
    "wxUnionId" TEXT,
    "wxNickname" TEXT,
    "wxAvatar" TEXT,
    "wxGender" INTEGER NOT NULL DEFAULT 0,
    "phoneCiphertext" BYTEA,
    "phoneHash" TEXT,
    "phoneMasked" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRegisterTemp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAgreement" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "agreementType" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberInvitation" (
    "id" BIGSERIAL NOT NULL,
    "inviterId" BIGINT NOT NULL,
    "inviteeId" BIGINT,
    "inviteCode" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" BIGSERIAL NOT NULL,
    "partnerNo" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'normal',
    "status" INTEGER NOT NULL DEFAULT 0,
    "auditStatus" INTEGER NOT NULL DEFAULT 0,
    "auditReason" TEXT,
    "contactName" TEXT,
    "contactPhoneCiphertext" BYTEA,
    "contactPhoneHash" TEXT,
    "contactPhoneMasked" TEXT,
    "regionCode" TEXT,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMember" (
    "id" BIGSERIAL NOT NULL,
    "partnerId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "status" INTEGER NOT NULL DEFAULT 1,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" BIGINT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" BIGINT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" BIGSERIAL NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationRecord" (
    "id" BIGSERIAL NOT NULL,
    "codeId" BIGINT,
    "code" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "partnerId" BIGINT,
    "userId" BIGINT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRelation" (
    "id" BIGSERIAL NOT NULL,
    "partnerId" BIGINT NOT NULL,
    "customerUserId" BIGINT NOT NULL,
    "sourceInvitationCode" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationEvent" (
    "id" BIGSERIAL NOT NULL,
    "relationId" BIGINT,
    "partnerId" BIGINT,
    "customerUserId" BIGINT,
    "eventType" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "operatorType" TEXT NOT NULL,
    "operatorId" BIGINT,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "gradient" TEXT NOT NULL DEFAULT '',
    "linkUrl" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModule" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "assessmentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "assessmentType" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" BIGSERIAL NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "venueId" BIGINT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "activityType" TEXT NOT NULL DEFAULT 'online',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "registrationStartAt" TIMESTAMP(3),
    "registrationEndAt" TIMESTAMP(3) NOT NULL,
    "locationText" TEXT NOT NULL DEFAULT '',
    "venueSnapshot" JSONB NOT NULL DEFAULT '{}',
    "capacity" INTEGER,
    "targetUserText" TEXT NOT NULL DEFAULT '',
    "highlights" TEXT[],
    "detail" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "tagIds" BIGINT[],
    "relatedProductIds" BIGINT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "VenueFacility" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VenueFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueFacilityOnVenue" (
    "venueId" BIGINT NOT NULL,
    "facilityId" BIGINT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VenueFacilityOnVenue_pkey" PRIMARY KEY ("venueId","facilityId")
);

-- CreateTable
CREATE TABLE "VenueImage" (
    "id" BIGSERIAL NOT NULL,
    "venueId" BIGINT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueAvailability" (
    "id" BIGSERIAL NOT NULL,
    "venueId" BIGINT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VenueAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueBlockedSlot" (
    "id" BIGSERIAL NOT NULL,
    "venueId" BIGINT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueBlockedSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRegistration" (
    "id" BIGSERIAL NOT NULL,
    "activityId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "partnerId" BIGINT,
    "sourceInviteCode" TEXT,
    "sourceScene" TEXT NOT NULL DEFAULT 'miniapp',
    "name" TEXT NOT NULL DEFAULT '',
    "phoneMasked" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'registered',
    "followUpNote" TEXT NOT NULL DEFAULT '',
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagDictionary" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT '',
    "moduleId" BIGINT,
    "description" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TagDictionary_pkey" PRIMARY KEY ("id")
);

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
    "tagIds" BIGINT[],
    "tagWeights" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentRecommendationRule" (
    "id" BIGSERIAL NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "conditionTags" TEXT[],
    "conditionTagIds" BIGINT[],
    "scoreBoost" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentRecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" BIGSERIAL NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'service',
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "priceText" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "targetUserText" TEXT NOT NULL DEFAULT '',
    "painPointText" TEXT NOT NULL DEFAULT '',
    "serviceProcess" TEXT NOT NULL DEFAULT '',
    "serviceMode" TEXT NOT NULL DEFAULT '',
    "serviceDuration" TEXT NOT NULL DEFAULT '',
    "appointmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "specText" TEXT NOT NULL DEFAULT '',
    "deliveryText" TEXT NOT NULL DEFAULT '',
    "afterSaleText" TEXT NOT NULL DEFAULT '',
    "stockStatus" TEXT NOT NULL DEFAULT 'available',
    "tags" TEXT[],
    "tagIds" BIGINT[],
    "primaryTagIds" BIGINT[],
    "secondaryTagIds" BIGINT[],
    "excludeTagIds" BIGINT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT,
    "anonymousId" TEXT NOT NULL DEFAULT '',
    "moduleId" BIGINT,
    "moduleCode" TEXT NOT NULL DEFAULT '',
    "productId" BIGINT,
    "activityId" BIGINT,
    "productType" TEXT NOT NULL DEFAULT '',
    "recommendationForm" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL,
    "sourceScene" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "tagIds" BIGINT[],
    "score" INTEGER,
    "matchReason" TEXT NOT NULL DEFAULT '',
    "baseScore" INTEGER DEFAULT 0,
    "primaryScore" INTEGER DEFAULT 0,
    "secondaryScore" INTEGER DEFAULT 0,
    "fallbackScore" INTEGER DEFAULT 0,
    "ruleBonus" INTEGER DEFAULT 0,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "viewDuration" INTEGER,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLead" (
    "id" BIGSERIAL NOT NULL,
    "productId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "partnerId" BIGINT,
    "sourceInviteCode" TEXT,
    "sourceScene" TEXT NOT NULL DEFAULT 'miniapp',
    "needTags" TEXT[],
    "needTagIds" BIGINT[],
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'new',
    "followUpNote" TEXT NOT NULL DEFAULT '',
    "nextFollowAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLeadFollowUp" (
    "id" BIGSERIAL NOT NULL,
    "leadId" BIGINT NOT NULL,
    "operatorId" BIGINT,
    "operatorType" TEXT NOT NULL DEFAULT 'admin',
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "nextFollowAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLeadFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminRole" (
    "adminId" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("adminId","roleId")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" BIGINT NOT NULL,
    "permissionId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "RecommendationConfig" (
    "id" BIGSERIAL NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "primaryTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "secondaryTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "fallbackTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxUserTagWeight" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "maxAssessmentWeight" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "assessmentVsUserRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "enableRuleBoost" BOOLEAN NOT NULL DEFAULT true,
    "ruleBoostMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "duplicationWindow" INTEGER NOT NULL DEFAULT 7,
    "limitPerRequest" INTEGER NOT NULL DEFAULT 100,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationMetrics" (
    "id" BIGSERIAL NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgViewDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "byMatchReason" JSONB NOT NULL DEFAULT '{}',
    "bySourceType" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLeadCleanup" (
    "id" BIGSERIAL NOT NULL,
    "cleanupType" TEXT NOT NULL,
    "leadCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLeadCleanup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCategory" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" BIGSERIAL NOT NULL,
    "categoryId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "priceFen" INTEGER NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "soldStock" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCart" (
    "id" BIGSERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCartItem" (
    "id" BIGSERIAL NOT NULL,
    "cartId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" BIGSERIAL NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "totalAmountFen" INTEGER NOT NULL,
    "discountAmountFen" INTEGER NOT NULL DEFAULT 0,
    "paymentAmountFen" INTEGER NOT NULL,
    "refundedAmountFen" INTEGER NOT NULL DEFAULT 0,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "shippingAddress" TEXT,
    "trackingNo" TEXT,
    "remark" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "productId" BIGINT NOT NULL,
    "productName" TEXT NOT NULL,
    "productImage" TEXT,
    "unitPriceFen" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotalFen" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPayment" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "outTradeNo" TEXT NOT NULL,
    "wechatTransactionId" TEXT,
    "prepayId" TEXT,
    "amountFen" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRefund" (
    "id" BIGSERIAL NOT NULL,
    "orderId" BIGINT NOT NULL,
    "refundNo" TEXT NOT NULL,
    "outRefundNo" TEXT NOT NULL,
    "requestedAmountFen" INTEGER NOT NULL,
    "approvedAmountFen" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "wechatRefundId" TEXT,
    "approvedByAdminId" BIGINT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_inviteCode_idx" ON "User"("inviteCode");

-- CreateIndex
CREATE INDEX "User_invitedBy_idx" ON "User"("invitedBy");

-- CreateIndex
CREATE INDEX "UserAssessment_userId_updatedAt_idx" ON "UserAssessment"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserAssessment_moduleCode_assessmentType_idx" ON "UserAssessment"("moduleCode", "assessmentType");

-- CreateIndex
CREATE UNIQUE INDEX "UserAssessment_userId_moduleCode_key" ON "UserAssessment"("userId", "moduleCode");

-- CreateIndex
CREATE UNIQUE INDEX "WechatAccount_userId_key" ON "WechatAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WechatAccount_wxOpenIdHash_key" ON "WechatAccount"("wxOpenIdHash");

-- CreateIndex
CREATE INDEX "WechatAccount_wxUnionId_idx" ON "WechatAccount"("wxUnionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_jti_key" ON "UserSession"("jti");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserRegisterTemp_tempToken_key" ON "UserRegisterTemp"("tempToken");

-- CreateIndex
CREATE INDEX "UserRegisterTemp_expiresAt_idx" ON "UserRegisterTemp"("expiresAt");

-- CreateIndex
CREATE INDEX "UserAgreement_userId_idx" ON "UserAgreement"("userId");

-- CreateIndex
CREATE INDEX "UserAgreement_agreedAt_idx" ON "UserAgreement"("agreedAt");

-- CreateIndex
CREATE INDEX "Agreement_type_isCurrent_idx" ON "Agreement"("type", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_type_version_key" ON "Agreement"("type", "version");

-- CreateIndex
CREATE INDEX "MemberInvitation_inviterId_idx" ON "MemberInvitation"("inviterId");

-- CreateIndex
CREATE INDEX "MemberInvitation_inviteeId_idx" ON "MemberInvitation"("inviteeId");

-- CreateIndex
CREATE INDEX "MemberInvitation_inviteCode_idx" ON "MemberInvitation"("inviteCode");

-- CreateIndex
CREATE INDEX "MemberInvitation_status_idx" ON "MemberInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerNo_key" ON "Partner"("partnerNo");

-- CreateIndex
CREATE INDEX "Partner_status_auditStatus_idx" ON "Partner"("status", "auditStatus");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");

-- CreateIndex
CREATE INDEX "PartnerMember_userId_status_idx" ON "PartnerMember"("userId", "status");

-- CreateIndex
CREATE INDEX "PartnerMember_partnerId_status_idx" ON "PartnerMember"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMember_partnerId_userId_role_key" ON "PartnerMember"("partnerId", "userId", "role");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
CREATE INDEX "InvitationCode_ownerType_ownerId_idx" ON "InvitationCode"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "InvitationCode_scene_status_idx" ON "InvitationCode"("scene", "status");

-- CreateIndex
CREATE INDEX "InvitationCode_expiresAt_idx" ON "InvitationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "InvitationRecord_code_idx" ON "InvitationRecord"("code");

-- CreateIndex
CREATE INDEX "InvitationRecord_partnerId_status_idx" ON "InvitationRecord"("partnerId", "status");

-- CreateIndex
CREATE INDEX "InvitationRecord_userId_idx" ON "InvitationRecord"("userId");

-- CreateIndex
CREATE INDEX "InvitationRecord_createdAt_idx" ON "InvitationRecord"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerRelation_customerUserId_status_idx" ON "CustomerRelation"("customerUserId", "status");

-- CreateIndex
CREATE INDEX "CustomerRelation_partnerId_status_idx" ON "CustomerRelation"("partnerId", "status");

-- CreateIndex
CREATE INDEX "CustomerRelation_boundAt_idx" ON "CustomerRelation"("boundAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRelation_partnerId_customerUserId_key" ON "CustomerRelation"("partnerId", "customerUserId");

-- CreateIndex
CREATE INDEX "RelationEvent_relationId_idx" ON "RelationEvent"("relationId");

-- CreateIndex
CREATE INDEX "RelationEvent_partnerId_createdAt_idx" ON "RelationEvent"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "RelationEvent_customerUserId_createdAt_idx" ON "RelationEvent"("customerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RelationEvent_eventType_idx" ON "RelationEvent"("eventType");

-- CreateIndex
CREATE INDEX "Banner_status_sort_idx" ON "Banner"("status", "sort");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModule_code_key" ON "ProductModule"("code");

-- CreateIndex
CREATE INDEX "ProductModule_status_sortOrder_idx" ON "ProductModule"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductModule_status_showOnHome_sortOrder_idx" ON "ProductModule"("status", "showOnHome", "sortOrder");

-- CreateIndex
CREATE INDEX "Activity_moduleId_status_idx" ON "Activity"("moduleId", "status");

-- CreateIndex
CREATE INDEX "Activity_venueId_startAt_endAt_idx" ON "Activity"("venueId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Activity_activityType_status_idx" ON "Activity"("activityType", "status");

-- CreateIndex
CREATE INDEX "Activity_status_startAt_idx" ON "Activity"("status", "startAt");

-- CreateIndex
CREATE INDEX "Activity_registrationEndAt_idx" ON "Activity"("registrationEndAt");

-- CreateIndex
CREATE INDEX "Activity_deletedAt_idx" ON "Activity"("deletedAt");

-- CreateIndex
CREATE INDEX "Venue_status_sortOrder_idx" ON "Venue"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "Venue_city_district_idx" ON "Venue"("city", "district");

-- CreateIndex
CREATE INDEX "Venue_deletedAt_idx" ON "Venue"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VenueFacility_name_key" ON "VenueFacility"("name");

-- CreateIndex
CREATE INDEX "VenueFacility_status_sortOrder_idx" ON "VenueFacility"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "VenueFacility_deletedAt_idx" ON "VenueFacility"("deletedAt");

-- CreateIndex
CREATE INDEX "VenueFacilityOnVenue_facilityId_idx" ON "VenueFacilityOnVenue"("facilityId");

-- CreateIndex
CREATE INDEX "VenueFacilityOnVenue_venueId_sortOrder_idx" ON "VenueFacilityOnVenue"("venueId", "sortOrder");

-- CreateIndex
CREATE INDEX "VenueImage_venueId_sortOrder_idx" ON "VenueImage"("venueId", "sortOrder");

-- CreateIndex
CREATE INDEX "VenueAvailability_venueId_weekday_idx" ON "VenueAvailability"("venueId", "weekday");

-- CreateIndex
CREATE INDEX "VenueBlockedSlot_venueId_startAt_endAt_idx" ON "VenueBlockedSlot"("venueId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ActivityRegistration_activityId_status_idx" ON "ActivityRegistration"("activityId", "status");

-- CreateIndex
CREATE INDEX "ActivityRegistration_userId_createdAt_idx" ON "ActivityRegistration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityRegistration_partnerId_createdAt_idx" ON "ActivityRegistration"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityRegistration_status_createdAt_idx" ON "ActivityRegistration"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRegistration_activityId_userId_key" ON "ActivityRegistration"("activityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TagDictionary_code_key" ON "TagDictionary"("code");

-- CreateIndex
CREATE INDEX "TagDictionary_moduleId_status_sortOrder_idx" ON "TagDictionary"("moduleId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "TagDictionary_group_status_sortOrder_idx" ON "TagDictionary"("group", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "TagDictionary_status_sortOrder_idx" ON "TagDictionary"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_moduleId_status_sortOrder_idx" ON "AssessmentTemplate"("moduleId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentTemplate_status_sortOrder_idx" ON "AssessmentTemplate"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_templateId_sortOrder_idx" ON "AssessmentQuestion"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_templateId_key_key" ON "AssessmentQuestion"("templateId", "key");

-- CreateIndex
CREATE INDEX "AssessmentOption_questionId_sortOrder_idx" ON "AssessmentOption"("questionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentOption_questionId_value_key" ON "AssessmentOption"("questionId", "value");

-- CreateIndex
CREATE INDEX "AssessmentRecommendationRule_moduleId_status_sortOrder_idx" ON "AssessmentRecommendationRule"("moduleId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssessmentRecommendationRule_productId_status_idx" ON "AssessmentRecommendationRule"("productId", "status");

-- CreateIndex
CREATE INDEX "Product_moduleId_status_idx" ON "Product"("moduleId", "status");

-- CreateIndex
CREATE INDEX "Product_productType_status_idx" ON "Product"("productType", "status");

-- CreateIndex
CREATE INDEX "Product_status_priority_sortOrder_idx" ON "Product"("status", "priority", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_publishedAt_idx" ON "Product"("publishedAt");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_userId_createdAt_idx" ON "RecommendationEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_anonymousId_createdAt_idx" ON "RecommendationEvent"("anonymousId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_moduleCode_createdAt_idx" ON "RecommendationEvent"("moduleCode", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_moduleId_createdAt_idx" ON "RecommendationEvent"("moduleId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_productId_createdAt_idx" ON "RecommendationEvent"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_activityId_createdAt_idx" ON "RecommendationEvent"("activityId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_clicked_createdAt_idx" ON "RecommendationEvent"("clicked", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_converted_createdAt_idx" ON "RecommendationEvent"("converted", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_createdAt_idx" ON "RecommendationEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ProductLead_productId_createdAt_idx" ON "ProductLead"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductLead_userId_createdAt_idx" ON "ProductLead"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductLead_partnerId_createdAt_idx" ON "ProductLead"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductLead_status_createdAt_idx" ON "ProductLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductLead_status_nextFollowAt_idx" ON "ProductLead"("status", "nextFollowAt");

-- CreateIndex
CREATE INDEX "ProductLead_archived_updatedAt_idx" ON "ProductLead"("archived", "updatedAt");

-- CreateIndex
CREATE INDEX "ProductLeadFollowUp_leadId_createdAt_idx" ON "ProductLeadFollowUp"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductLeadFollowUp_operatorType_operatorId_idx" ON "ProductLeadFollowUp"("operatorType", "operatorId");

-- CreateIndex
CREATE INDEX "ProductLeadFollowUp_nextFollowAt_idx" ON "ProductLeadFollowUp"("nextFollowAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationConfig_moduleCode_key" ON "RecommendationConfig"("moduleCode");

-- CreateIndex
CREATE INDEX "RecommendationConfig_status_idx" ON "RecommendationConfig"("status");

-- CreateIndex
CREATE INDEX "RecommendationMetrics_moduleCode_date_idx" ON "RecommendationMetrics"("moduleCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationMetrics_moduleCode_date_key" ON "RecommendationMetrics"("moduleCode", "date");

-- CreateIndex
CREATE INDEX "ProductLeadCleanup_cleanupType_executedAt_idx" ON "ProductLeadCleanup"("cleanupType", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCategory_code_key" ON "ShopCategory"("code");

-- CreateIndex
CREATE INDEX "ShopCategory_sortOrder_idx" ON "ShopCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "ShopProduct_categoryId_status_sortOrder_idx" ON "ShopProduct"("categoryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "ShopProduct_status_createdAt_idx" ON "ShopProduct"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCart_userId_key" ON "ShopCart"("userId");

-- CreateIndex
CREATE INDEX "ShopCartItem_cartId_idx" ON "ShopCartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCartItem_cartId_productId_key" ON "ShopCartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_orderNo_key" ON "ShopOrder"("orderNo");

-- CreateIndex
CREATE INDEX "ShopOrder_userId_createdAt_idx" ON "ShopOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopOrder_status_expiresAt_idx" ON "ShopOrder"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "ShopOrder_paymentStatus_idx" ON "ShopOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_outTradeNo_key" ON "ShopPayment"("outTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPayment_wechatTransactionId_key" ON "ShopPayment"("wechatTransactionId");

-- CreateIndex
CREATE INDEX "ShopPayment_orderId_status_idx" ON "ShopPayment"("orderId", "status");

-- CreateIndex
CREATE INDEX "ShopPayment_outTradeNo_idx" ON "ShopPayment"("outTradeNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_refundNo_key" ON "ShopRefund"("refundNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_outRefundNo_key" ON "ShopRefund"("outRefundNo");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_wechatRefundId_key" ON "ShopRefund"("wechatRefundId");

-- CreateIndex
CREATE INDEX "ShopRefund_orderId_status_idx" ON "ShopRefund"("orderId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssessment" ADD CONSTRAINT "UserAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WechatAccount" ADD CONSTRAINT "WechatAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAgreement" ADD CONSTRAINT "UserAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInvitation" ADD CONSTRAINT "MemberInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberInvitation" ADD CONSTRAINT "MemberInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRecord" ADD CONSTRAINT "InvitationRecord_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "InvitationCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRecord" ADD CONSTRAINT "InvitationRecord_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationRecord" ADD CONSTRAINT "InvitationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRelation" ADD CONSTRAINT "CustomerRelation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRelation" ADD CONSTRAINT "CustomerRelation_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationEvent" ADD CONSTRAINT "RelationEvent_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "CustomerRelation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationEvent" ADD CONSTRAINT "RelationEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationEvent" ADD CONSTRAINT "RelationEvent_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueFacilityOnVenue" ADD CONSTRAINT "VenueFacilityOnVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueFacilityOnVenue" ADD CONSTRAINT "VenueFacilityOnVenue_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "VenueFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueImage" ADD CONSTRAINT "VenueImage_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueAvailability" ADD CONSTRAINT "VenueAvailability_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueBlockedSlot" ADD CONSTRAINT "VenueBlockedSlot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRegistration" ADD CONSTRAINT "ActivityRegistration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagDictionary" ADD CONSTRAINT "TagDictionary_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplate" ADD CONSTRAINT "AssessmentTemplate_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentOption" ADD CONSTRAINT "AssessmentOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentRecommendationRule" ADD CONSTRAINT "AssessmentRecommendationRule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentRecommendationRule" ADD CONSTRAINT "AssessmentRecommendationRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ProductModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLead" ADD CONSTRAINT "ProductLead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLead" ADD CONSTRAINT "ProductLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLead" ADD CONSTRAINT "ProductLead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLeadFollowUp" ADD CONSTRAINT "ProductLeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ProductLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRole" ADD CONSTRAINT "AdminRole_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRole" ADD CONSTRAINT "AdminRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCart" ADD CONSTRAINT "ShopCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "ShopCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRefund" ADD CONSTRAINT "ShopRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

