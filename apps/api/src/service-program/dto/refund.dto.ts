import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'

export class CreateServiceRefundItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entitlementId!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @IsOptional()
  appointmentIds?: number[]
}

export class CreateServiceRefundDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceRefundItemDto)
  items!: CreateServiceRefundItemDto[]

  @IsString()
  @MaxLength(500)
  reason!: string
}

export class ReviewServiceRefundDto {
  @IsBoolean()
  approved!: boolean

  @IsString()
  @MaxLength(500)
  @IsOptional()
  adminNote?: string
}
