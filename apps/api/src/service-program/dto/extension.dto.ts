import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator'

export class ExtendServicePlanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entitlementId!: number

  @IsDateString()
  startAt!: string

  @IsDateString()
  endAt!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string
}
