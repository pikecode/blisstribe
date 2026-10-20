import { IsString, IsInt, IsOptional, IsNotEmpty, Min, IsBoolean } from 'class-validator'

export class CreateCategoryDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  parentId?: number | null

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
  @IsInt()
  @Min(1)
  @IsOptional()
  parentId?: number | null

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
  parentId!: number | null
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
