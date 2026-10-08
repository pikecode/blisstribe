import { IsInt, IsString, IsOptional, IsNotEmpty, Min, IsBoolean, MaxLength } from 'class-validator'

export class CreateRefundDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  amountInFen!: number

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string
}

export class RefundResponseDto {
  id!: bigint
  orderId!: bigint
  userId!: bigint
  amountInFen!: number
  reason?: string
  status!: string
  wechatRefundNo?: string
  refundedAt?: Date
  approvedAt?: Date
  adminNotes?: string
  createdAt!: Date
  updatedAt!: Date
}

export class ApproveRefundDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean

  @IsString()
  @IsOptional()
  @MaxLength(500)
  adminNote?: string
}
