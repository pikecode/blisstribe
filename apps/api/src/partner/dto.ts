import {
  IsIn,
  IsNotEmpty,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export const PARTNER_TYPES = [
  'individual',
  'group_leader',
  'creator',
  'store',
  'service_provider',
  'agency',
] as const

export class ApplyPartnerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(40)
  displayName!: string

  @IsString()
  @IsIn(PARTNER_TYPES)
  type!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  contactName!: string

  @IsString()
  @IsNotEmpty()
  contactPhone!: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  regionCode?: string

  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  displayName?: string

  @IsOptional()
  @IsString()
  @IsIn(PARTNER_TYPES)
  type?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactName?: string

  @IsOptional()
  @IsString()
  contactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  regionCode?: string

  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>
}

export class RejectPartnerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string
}

export class TransferCustomerDto {
  @IsInt()
  @Min(1)
  customerUserId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string
}
