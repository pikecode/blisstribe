import { Type } from 'class-transformer'
import { ArrayUnique, IsArray, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class SyncServiceQualificationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  professionalName?: string

  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  offeringIds!: number[]

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
