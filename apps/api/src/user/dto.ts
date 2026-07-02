import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator'

export class UpdateUserDto {
  @IsOptional() @IsString() nickname?: string
  @IsOptional() @IsString() avatar?: string
  @IsOptional() @IsNumber() gender?: number
  @IsOptional() @IsString() birthday?: string
}

export class SetPasswordDto {
  @IsString() @IsNotEmpty() password!: string // RSA 加密后
  @IsString() @IsNotEmpty() confirmPassword!: string
}
