import { IsString, IsOptional, IsNumber, IsNotEmpty, IsArray, MinLength } from 'class-validator'

export class AdminLoginDto {
  @IsString() @IsNotEmpty() username!: string
  @IsString() @IsNotEmpty() password!: string
}

export class AdminCreateUserDto {
  @IsString() @IsNotEmpty() nickname!: string
  @IsString() @IsNotEmpty() phone!: string
  @IsOptional() @IsNumber() gender?: number
  @IsOptional() @IsString() avatar?: string
}

export class AdminUpdateUserDto {
  @IsOptional() @IsString() nickname?: string
  @IsOptional() @IsString() avatar?: string
  @IsOptional() @IsNumber() gender?: number
}

// ===== 管理员管理 =====

export class CreateAdminDto {
  @IsString() @IsNotEmpty() username!: string
  @IsString() @MinLength(8) password!: string
  @IsString() @IsNotEmpty() nickname!: string
  @IsOptional() @IsString() avatar?: string
  @IsOptional() @IsArray() roleIds?: string[]
}

export class UpdateAdminDto {
  @IsOptional() @IsString() nickname?: string
  @IsOptional() @IsString() avatar?: string
}

export class ResetPasswordDto {
  @IsString() @MinLength(8) password!: string
}

export class AssignRolesDto {
  @IsArray() @IsString({ each: true }) roleIds!: string[]
}
