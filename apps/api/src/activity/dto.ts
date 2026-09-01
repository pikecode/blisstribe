import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

export const ACTIVITY_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  UNPUBLISHED: 2,
} as const

export const ACTIVITY_TYPES = ['online', 'offline', 'mixed'] as const
export const ACTIVITY_STATUS_SCOPES = ['registering', 'upcoming', 'ended'] as const
export const ACTIVITY_REGISTRATION_STATUS = ['registered', 'confirmed', 'attended', 'cancelled', 'invalid'] as const
export const ACTIVE_ACTIVITY_REGISTRATION_STATUS = ['registered', 'confirmed', 'attended'] as const

export class CreateActivityDto {
  @IsInt()
  @Min(1)
  moduleId!: number

  @IsOptional()
  @IsInt()
  @Min(1)
  venueId?: number

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
  @MaxLength(300)
  coverUrl?: string

  @IsOptional()
  @IsString()
  @IsIn(ACTIVITY_TYPES)
  activityType?: string

  @IsDateString()
  startAt!: string

  @IsDateString()
  endAt!: string

  @IsOptional()
  @IsDateString()
  registrationStartAt?: string

  @IsDateString()
  registrationEndAt!: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationText?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetUserText?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[]

  @IsOptional()
  @IsString()
  detail?: string

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
  relatedProductIds?: number[]

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
  @IsIn([0, 1, 2])
  status?: number
}

export class UpdateActivityDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  moduleId?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  venueId?: number

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
  @MaxLength(300)
  coverUrl?: string

  @IsOptional()
  @IsString()
  @IsIn(ACTIVITY_TYPES)
  activityType?: string

  @IsOptional()
  @IsDateString()
  startAt?: string

  @IsOptional()
  @IsDateString()
  endAt?: string

  @IsOptional()
  @IsDateString()
  registrationStartAt?: string

  @IsOptional()
  @IsDateString()
  registrationEndAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationText?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetUserText?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[]

  @IsOptional()
  @IsString()
  detail?: string

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
  relatedProductIds?: number[]

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
  @IsIn([0, 1, 2])
  status?: number
}

export class CreateActivityRegistrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  inviteCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceScene?: string
}

export class CancelActivityRegistrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  cancelReason?: string
}

export class UpdateActivityRegistrationStatusDto {
  @IsString()
  @IsIn(ACTIVITY_REGISTRATION_STATUS)
  status!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  followUpNote?: string
}
