import { IsDateString, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateServiceFollowUpDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  clientRequestId!: string

  @IsDateString()
  scheduledAt!: string

  @IsString() @IsNotEmpty() @MaxLength(60)
  contactName!: string

  @IsString() @IsNotEmpty() @MaxLength(500)
  purpose!: string
}

export class ResolveServiceFollowUpDto {
  @IsIn(['completed', 'cancelled'])
  status!: 'completed' | 'cancelled'

  @IsString() @IsNotEmpty() @MaxLength(1000)
  outcome!: string
}

export class ServiceFollowUpFeedbackDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  feedback!: string
}
