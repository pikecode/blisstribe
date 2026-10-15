import { IsNotEmpty, IsString } from 'class-validator'

export class CreateServicePaymentDto {
  @IsString()
  @IsNotEmpty()
  code!: string
}
