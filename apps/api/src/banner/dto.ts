import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator'

export class CreateBannerDto {
  @IsString()
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsString()
  gradient?: string

  @IsOptional()
  @IsString()
  linkUrl?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  imageUrl?: string

  @IsOptional()
  @IsString()
  gradient?: string

  @IsOptional()
  @IsString()
  linkUrl?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number
}
