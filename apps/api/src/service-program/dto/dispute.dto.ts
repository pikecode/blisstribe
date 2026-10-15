import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
export class CreateServiceDisputeDto {
  @IsIn(['not_received', 'wrong_item', 'wrong_quantity', 'other']) reasonType!: string
  @IsString() @IsNotEmpty() @MaxLength(1000) description!: string
  @IsString() @IsNotEmpty() @MaxLength(100) clientRequestId!: string
}
export class DisputeUserActionDto {
  @IsIn(['accept', 'review', 'disagree']) action!: 'accept' | 'review' | 'disagree'
  @IsDateString() expectedUpdatedAt!: string
  @IsOptional() @IsString() @MaxLength(1000) note?: string
}
export class DisputeAdminActionDto {
  @IsIn(['contact', 'evidence', 'propose', 'review', 'extend', 'retry_refund', 'finish_rearrange']) action!: 'contact' | 'evidence' | 'propose' | 'review' | 'extend' | 'retry_refund' | 'finish_rearrange'
  @IsDateString() expectedUpdatedAt!: string
  @IsString() @IsNotEmpty() @MaxLength(2000) note!: string
  @IsOptional() @IsString() @MaxLength(60) ownerName?: string
  @IsOptional() @IsIn(['maintain', 'restore', 'rearrange', 'refund', 'correct_item']) outcome?: 'maintain' | 'restore' | 'rearrange' | 'refund' | 'correct_item'
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) refundAmountFen?: number
  @IsOptional() @IsIn(['platform', 'institution', 'shared']) costBearer?: string
  @IsOptional() @IsString() @MaxLength(1000) clawbackNote?: string
  @IsOptional() @IsDateString() restoredExpiresAt?: string
  @IsOptional() @IsDateString() deadline?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) replacementAppointmentId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) correctedEntitlementId?: number
}
