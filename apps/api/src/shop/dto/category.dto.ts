import { IsString, IsInt, IsOptional, IsNotEmpty, Min, IsBoolean } from 'class-validator'

export class CreateCategoryDto {
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
}

export class UpdateCategoryDto {
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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class CategoryResponseDto {
  id!: number
  name!: string
  description?: string
  imageUrl?: string
  sortOrder!: number
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}

export class CategoryResponseDto {
  id!: number
  name!: string
  description?: string
  imageUrl?: string
  sortOrder!: number
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}
