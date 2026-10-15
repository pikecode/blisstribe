import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateServiceAppointmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  entitlementId!: number

  @IsDateString()
  requestedStartAt!: string

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  durationMinutes?: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  clientRequestId!: string

  @IsString()
  @MaxLength(300)
  @IsOptional()
  patientNote?: string
}

export class CreateServiceSlotDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  institutionId!: number

  @IsDateString()
  startAt!: string

  @IsDateString()
  endAt!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity!: number
}

export class CancelServiceAppointmentDto {
  @IsString()
  @MaxLength(300)
  @IsOptional()
  reason?: string
}

export class ProposeRescheduleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId!: number

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string
}

export class ConfirmServiceAppointmentDto {
  @IsDateString()
  @IsOptional()
  confirmedStartAt?: string

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  durationMinutes?: number

  @IsString()
  @MaxLength(60)
  @IsOptional()
  assignedStaffName?: string
}

export class CompleteServiceAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  performedByName!: string
}
