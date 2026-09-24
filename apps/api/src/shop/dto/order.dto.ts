import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'

export class CartItemForCheckout {
  @IsNotEmpty()
  productId!: number | bigint | string

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity!: number
}

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty()
  items!: CartItemForCheckout[]

  @IsString()
  @IsOptional()
  remark?: string

  @IsString()
  @IsNotEmpty()
  shippingAddress?: string

  @IsString()
  @IsNotEmpty()
  receiverPhone?: string

  @IsString()
  @IsNotEmpty()
  receiverName?: string
}

export class OrderItemResponseDto {
  id!: bigint
  orderId!: bigint
  productId!: bigint
  productName!: string
  quantity!: number
  unitPriceFen!: number
  subtotalFen!: number
  createdAt!: Date
}

export class OrderResponseDto {
  id!: bigint
  userId!: bigint
  orderNo!: string
  totalAmountFen!: number
  discountAmountFen!: number
  paymentAmountFen!: number
  refundedAmountFen!: number
  status!: string
  paymentStatus!: string
  fulfillmentStatus!: string
  items!: OrderItemResponseDto[]
  remark?: string
  shippingAddress?: string
  receiverPhone?: string
  receiverName?: string
  createdAt!: Date
  updatedAt!: Date
  paidAt?: Date
}
