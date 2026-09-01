import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

export const PRODUCT_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  UNPUBLISHED: 2,
} as const

export const PRODUCT_TYPES = ['service', 'physical', 'package'] as const
export const PRODUCT_SERVICE_MODES = ['online', 'offline', 'mixed', ''] as const
export const PRODUCT_STOCK_STATUSES = ['available', 'limited', 'sold_out'] as const
export const PRODUCT_LEAD_STATUS = ['new', 'contacted', 'qualified', 'converted', 'invalid'] as const
export const ASSESSMENT_QUESTION_TYPES = ['single'] as const
export const RECOMMENDATION_EVENT_TYPES = [
  'impression',
  'click',
  'lead_submit',
  'assessment_submit',
  'filter_click',
  'activity_registration',
  'activity_cancel',
] as const
export const RECOMMENDATION_FORMS = [
  'module_featured',
  'assessment_result',
  'profile_suggestion',
  'consultant_recommendation',
  'campaign_recommendation',
  'bundle_solution',
  'activity_featured',
] as const

export class CreateProductModuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverUrl?: string

  @IsOptional()
  @IsBoolean()
  showOnHome?: boolean

  @IsOptional()
  @IsBoolean()
  assessmentEnabled?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(40)
  assessmentType?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateProductModuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  coverUrl?: string

  @IsOptional()
  @IsBoolean()
  showOnHome?: boolean

  @IsOptional()
  @IsBoolean()
  assessmentEnabled?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(40)
  assessmentType?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number
}

export class CreateProductDto {
  @IsInt()
  @Min(1)
  moduleId!: number

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_TYPES)
  productType?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subtitle?: string

  @IsOptional()
  @IsString()
  coverUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  priceText?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string

  @IsOptional()
  @IsString()
  detail?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetUserText?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  painPointText?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  serviceProcess?: string

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_SERVICE_MODES)
  serviceMode?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceDuration?: string

  @IsOptional()
  @IsBoolean()
  appointmentRequired?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(300)
  specText?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryText?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  afterSaleText?: string

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_STOCK_STATUSES)
  stockStatus?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  primaryTagIds?: number[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  secondaryTagIds?: number[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  excludeTagIds?: number[]

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateProductDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_TYPES)
  productType?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subtitle?: string

  @IsOptional()
  @IsString()
  coverUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  priceText?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string

  @IsOptional()
  @IsString()
  detail?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetUserText?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  painPointText?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  serviceProcess?: string

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_SERVICE_MODES)
  serviceMode?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceDuration?: string

  @IsOptional()
  @IsBoolean()
  appointmentRequired?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(300)
  specText?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryText?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  afterSaleText?: string

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_STOCK_STATUSES)
  stockStatus?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  primaryTagIds?: number[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  secondaryTagIds?: number[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  excludeTagIds?: number[]

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsInt()
  @IsIn([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.UNPUBLISHED])
  status?: number
}

export class AssessmentOptionInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  value!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[]

  @IsOptional()
  @IsObject()
  tagWeights?: Record<string, number>

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class AssessmentQuestionInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  key!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string

  @IsOptional()
  @IsString()
  @IsIn(ASSESSMENT_QUESTION_TYPES)
  type?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentOptionInputDto)
  options!: AssessmentOptionInputDto[]
}

export class CreateAssessmentTemplateDto {
  @IsInt()
  @Min(1)
  moduleId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionInputDto)
  questions!: AssessmentQuestionInputDto[]
}

export class UpdateAssessmentTemplateDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionInputDto)
  questions?: AssessmentQuestionInputDto[]
}

export class CreateRecommendationRuleDto {
  @IsInt()
  @Min(1)
  moduleId!: number

  @IsInt()
  @Min(1)
  productId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionTags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  conditionTagIds?: number[]

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreBoost?: number

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateRecommendationRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionTags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  conditionTagIds?: number[]

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreBoost?: number

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CreateTagDictionaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateTagDictionaryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CreateProductLeadDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inviteCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sourceScene?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  needTags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  needTagIds?: number[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string
}

export class CreateRecommendationEventDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(RECOMMENDATION_EVENT_TYPES)
  eventType!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  anonymousId?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsString()
  @MaxLength(40)
  moduleCode?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  activityId?: number

  @IsOptional()
  @IsString()
  @IsIn(PRODUCT_TYPES)
  productType?: string

  @IsOptional()
  @IsString()
  @IsIn(RECOMMENDATION_FORMS)
  recommendationForm?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceScene?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[]

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

export class FollowProductLeadDto {
  @IsString()
  @IsIn(PRODUCT_LEAD_STATUS)
  status!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  followUpNote?: string

  @IsOptional()
  @IsDateString()
  nextFollowAt?: string
}

export class ConfirmProductLeadContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string
}

export class SyncAssessmentItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  moduleCode!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  assessmentType!: string

  @IsArray()
  @IsString({ each: true })
  tags!: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[]

  @IsOptional()
  @IsObject()
  tagWeights?: Record<string, number>

  @IsString()
  @MaxLength(1000)
  summary!: string

  @IsObject()
  answers!: Record<string, unknown>
}

export class SyncAssessmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncAssessmentItemDto)
  items!: SyncAssessmentItemDto[]
}
