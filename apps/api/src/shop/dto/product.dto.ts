import {
  IsString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  Min,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ProductSkuDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  @IsOptional()
  skuCode?: string

  @IsObject()
  specifications!: Record<string, string>

  @IsInt()
  @Min(1)
  priceFen!: number

  @IsInt()
  @Min(0)
  totalStock!: number

  @IsBoolean()
  @IsOptional()
  enabled?: boolean
}

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSkuDto)
  skus!: ProductSkuDto[]

  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number
}

export class UpdateProductDto {
  @IsInt()
  @IsOptional()
  categoryId?: number

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSkuDto)
  @IsOptional()
  skus?: ProductSkuDto[]

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
  priceMaxFen!: number
  totalStock!: number
  reservedStock!: number
  soldStock!: number
  skus!: Array<{
    id: bigint
    skuCode: string
    specifications: Record<string, string>
    priceFen: number
    totalStock: number
    reservedStock: number
    soldStock: number
    available: number
    enabled: boolean
  }>
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
  priceMaxFen!: number
  images!: string[]
  totalStock!: number
  reservedStock!: number
  soldStock!: number
}
