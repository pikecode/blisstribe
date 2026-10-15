import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class ReceptionHoursDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays!: number[]
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number
}

export class CreateServiceInstitutionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceptionHoursDto)
  receptionHours?: ReceptionHoursDto

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partnerId!: number

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  contactName?: string

  @IsString()
  @IsOptional()
  contactPhone?: string
}

export class UpdateServiceInstitutionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceptionHoursDto)
  receptionHours?: ReceptionHoursDto

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  contactName?: string

  @IsString()
  @IsOptional()
  contactPhone?: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  status?: number
}

export class ServiceOfferingItemDto {
  @IsOptional() @IsIn(['service', 'goods'])
  kind?: 'service' | 'goods'

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  skuId?: number

  @IsOptional() @IsIn(['pickup', 'shipping'])
  deliveryMethod?: 'pickup' | 'shipping'

  @IsOptional() @IsString()
  returnNotice?: string
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  allocatedAmountFen!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  institutionSettlementFen!: number
}

export class CreateServiceOfferingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  institutionId!: number

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  subtitle?: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceFen!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays!: number

  @IsBoolean()
  @IsOptional()
  requiresQualification?: boolean

  @IsString()
  @IsOptional()
  appointmentNotice?: string

  @IsString()
  @IsOptional()
  refundNotice?: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  defaultPromoterRateBps?: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceOfferingItemDto)
  items!: ServiceOfferingItemDto[]
}

export class UpdateServiceOfferingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  productId?: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  institutionId?: number

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  subtitle?: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  priceFen?: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  validityDays?: number

  @IsBoolean()
  @IsOptional()
  requiresQualification?: boolean

  @IsString()
  @IsOptional()
  appointmentNotice?: string

  @IsString()
  @IsOptional()
  refundNotice?: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  defaultPromoterRateBps?: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceOfferingItemDto)
  @IsOptional()
  items?: ServiceOfferingItemDto[]
}
