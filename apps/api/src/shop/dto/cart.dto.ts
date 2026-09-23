import { IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator'

export class AddCartItemDto {
  @IsInt()
  @IsNotEmpty()
  productId!: bigint

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
  productId!: bigint
  quantity!: number
  priceInFen!: number
  totalInFen!: number
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
