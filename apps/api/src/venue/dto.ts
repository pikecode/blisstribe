import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export const VENUE_STATUS = {
  DISABLED: 0,
  ENABLED: 1,
} as const

export class VenueImageInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  imageUrl!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class VenueAvailabilityInputDto {
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number

  @IsString()
  @MaxLength(5)
  startTime!: string

  @IsString()
  @MaxLength(5)
  endTime!: string

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number
}

export class VenueBlockedSlotInputDto {
  @IsDateString()
  startAt!: string

  @IsDateString()
  endAt!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string
}

export class CreateVenueFacilityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
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

export class UpdateVenueFacilityDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
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

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string

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
  @MaxLength(200)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  district?: string

  @IsOptional()
  @IsNumber()
  latitude?: number

  @IsOptional()
  @IsNumber()
  longitude?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[]

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  facilityIds?: number[]

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactName?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhoneMasked?: string

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
  @Type(() => VenueImageInputDto)
  images?: VenueImageInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueAvailabilityInputDto)
  availability?: VenueAvailabilityInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenueBlockedSlotInputDto)
  blockedSlots?: VenueBlockedSlotInputDto[]
}

export class UpdateVenueDto extends CreateVenueDto {}
