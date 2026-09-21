import { IsString, IsInt, IsOptional, IsNotEmpty, Min, IsBoolean, IsArray } from 'class-validator'

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  priceInFen!: number

  @IsInt()
  @IsOptional()
  @Min(0)
  originalPriceInFen?: number

  @IsInt()
  @IsNotEmpty()
  categoryId!: number

  @IsString()
  @IsOptional()
  imageUrl?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[]

  @IsInt()
  @IsOptional()
  @Min(0)
  stock?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @IsOptional()
  @Min(0)
  priceInFen?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  originalPriceInFen?: number

  @IsInt()
  @IsOptional()
  categoryId?: number

  @IsString()
  @IsOptional()
  imageUrl?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[]

  @IsInt()
  @IsOptional()
  @Min(0)
  stock?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class ProductResponseDto {
  id!: number
  name!: string
  description?: string
  priceInFen!: number
  originalPriceInFen?: number
  categoryId!: number
  imageUrl?: string
  imageUrls?: string[]
  stock!: number
  soldCount!: number
  sortOrder!: number
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date
}

export class ProductListDto {
  id!: number
  name!: string
  priceInFen!: number
  originalPriceInFen?: number
  imageUrl?: string
  stock!: number
  soldCount!: number
  isActive!: boolean
}
