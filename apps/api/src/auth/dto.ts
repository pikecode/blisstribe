import { IsString, IsOptional, IsNumber, IsBoolean, IsNotEmpty } from 'class-validator'

export class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsOptional()
  userInfo?: {
    nickName: string
    avatarUrl: string
    gender: number
    country?: string
    province?: string
    city?: string
  }
}

export class WechatPhoneDto {
  @IsString()
  @IsNotEmpty()
  tempToken!: string

  @IsString()
  @IsNotEmpty()
  code!: string
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  tempToken!: string

  @IsString()
  @IsNotEmpty()
  nickname!: string

  @IsString()
  @IsNotEmpty()
  avatar!: string

  @IsNumber()
  gender!: number

  @IsOptional()
  @IsString()
  birthday?: string

  @IsBoolean()
  agreement!: boolean
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}
