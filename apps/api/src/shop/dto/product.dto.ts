import { IsString, IsInt, IsOptional, IsNotEmpty, Min, IsArray } from 'class-validator'

export class CreateProductDto {
  @IsInt()
  @IsNotEmpty()
  categoryId!: number

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  images!: string[]

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  priceFen!: number

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  totalStock!: number

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[]

  @IsInt()
  @IsOptional()
  @Min(1)
  priceFen?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  totalStock?: number

  @IsInt()
  @IsOptional()
  status?: number

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number
}

export class ProductResponseDto {
  id!: number
  categoryId!: number
  name!: string
  description?: string
  images!: string[]
  priceFen!: number
  totalStock!: number
  reservedStock!: number
  soldStock!: number
  status!: number
  sortOrder!: number
  createdAt!: Date
  updatedAt!: Date
}

export class ProductListDto {
  id!: number
  categoryId!: number
  name!: string
  priceFen!: number
  images!: string[]
  totalStock!: number
  reservedStock!: number
  soldStock!: number
}
