import { IsInt, IsString, IsOptional, IsNotEmpty, Min, IsBoolean } from 'class-validator'

export class CreateRefundDto {
  @IsInt()
  @IsNotEmpty()
  orderId!: number

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  amountInFen!: number

  @IsString()
  @IsOptional()
  reason?: string
}

export class RefundResponseDto {
  id!: number
  orderId!: number
  userId!: string
  amountInFen!: number
  reason?: string
  status!: string
  refundTransactionId?: string
  refundedAt?: Date
  createdAt!: Date
  updatedAt!: Date
}

export class ApproveRefundDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean

  @IsString()
  @IsOptional()
  rejectReason?: string
}
