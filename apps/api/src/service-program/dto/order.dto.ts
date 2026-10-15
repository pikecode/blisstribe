import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateServiceOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offeringId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  clientRequestId!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  leadId?: number
}
