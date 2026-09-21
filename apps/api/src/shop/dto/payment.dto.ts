import { IsInt, IsString, IsOptional, IsNotEmpty, Min } from 'class-validator'

export class CreatePaymentDto {
  @IsInt()
  @IsNotEmpty()
  orderId!: number

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  amountInFen!: number

  @IsString()
  @IsOptional()
  paymentMethod?: string
}

export class PaymentResponseDto {
  id!: number
  orderId!: number
  userId!: string
  amountInFen!: number
  status!: string
  paymentMethod?: string
  prepayId?: string
  transactionId?: string
  paidAt?: Date
  createdAt!: Date
  updatedAt!: Date
}

export class WechatPayNotifyDto {
  @IsString()
  @IsNotEmpty()
  id!: string

  @IsString()
  @IsNotEmpty()
  create_time!: string

  @IsString()
  @IsNotEmpty()
  event_type!: string

  @IsString()
  @IsNotEmpty()
  resource_type!: string

  @IsString()
  @IsNotEmpty()
  summary!: string

  @IsOptional()
  resource?: Record<string, any>
}
