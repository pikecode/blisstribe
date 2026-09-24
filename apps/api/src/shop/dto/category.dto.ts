import { IsString, IsInt, IsOptional, IsNotEmpty, Min, IsBoolean } from 'class-validator'

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  imageUrl?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsInt()
  @IsOptional()
  status?: number
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  code?: string

  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  imageUrl?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsInt()
  @IsOptional()
  status?: number
}

export class CategoryResponseDto {
  id!: number
  code!: string
  name!: string
  description?: string
  imageUrl?: string
  sortOrder!: number
  status!: number
  createdAt!: Date
  updatedAt!: Date
}
