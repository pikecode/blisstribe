import { IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator'

export class AddCartItemDto {
  @IsInt()
  @IsNotEmpty()
  productId!: number

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
  id!: number
  cartId!: number
  productId!: number
  quantity!: number
  priceInFen!: number
  totalInFen!: number
  createdAt!: Date
  updatedAt!: Date
}

export class CartResponseDto {
  id!: number
  userId!: string
  items!: CartItemResponseDto[]
  totalItemsCount!: number
  totalPriceInFen!: number
  createdAt!: Date
  updatedAt!: Date
}
