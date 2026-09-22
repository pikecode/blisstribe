import { IsInt, IsString, IsOptional, IsNotEmpty, Min, IsArray } from 'class-validator'

export class CartItemForCheckout {
  @IsInt()
  @IsNotEmpty()
  productId!: number

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity!: number

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  priceInFen!: number
}

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty()
  items!: CartItemForCheckout[]

  @IsInt()
  @IsOptional()
  @Min(0)
  totalInFen?: number

  @IsString()
  @IsOptional()
  remark?: string

  @IsString()
  @IsOptional()
  shippingAddress?: string

  @IsString()
  @IsOptional()
  recipientPhone?: string

  @IsString()
  @IsOptional()
  recipientName?: string
}

export class OrderItemResponseDto {
  id!: number
  orderId!: number
  productId!: number
  quantity!: number
  priceInFen!: number
  totalInFen!: number
  createdAt!: Date
}

export class OrderResponseDto {
  id!: number
  userId!: string
  orderNo!: string
  totalInFen!: number
  status!: string
  items!: OrderItemResponseDto[]
  remark?: string
  shippingAddress?: string
  recipientPhone?: string
  recipientName?: string
  createdAt!: Date
  updatedAt!: Date
  paidAt?: Date
}
