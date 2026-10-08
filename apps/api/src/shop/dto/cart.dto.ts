import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator'

export class AddCartItemDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  skuId?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  productId?: string

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity!: number
}

export class UpdateCartItemDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  quantity?: number
}

export class CartItemResponseDto {
  id!: bigint
  cartId!: bigint
  skuId!: bigint
  quantity!: number
  sku!: {
    id: bigint
    skuCode: string
    specifications: Record<string, string>
    priceFen: number
    available: number
    enabled: boolean
    product: {
      id: bigint
      name: string
      images: string[]
    }
  }
  createdAt!: Date
  updatedAt!: Date
}

export class CartResponseDto {
  id!: bigint
  userId!: bigint
  items!: CartItemResponseDto[]
  totalItemsCount!: number
  totalPriceInFen!: number
  createdAt!: Date
  updatedAt!: Date
}
