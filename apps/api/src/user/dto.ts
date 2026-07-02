import { IsString, IsOptional, IsNumber, IsNotEmpty, IsArray } from 'class-validator'

export class UpdateUserDto {
  @IsOptional() @IsString() nickname?: string
  @IsOptional() @IsString() avatar?: string
  @IsOptional() @IsNumber() gender?: number
  @IsOptional() @IsString() birthday?: string
  @IsOptional() @IsString() realName?: string
  @IsOptional() @IsString() wechatId?: string
  @IsOptional() @IsString() email?: string
  @IsOptional() @IsNumber() age?: number
  @IsOptional() @IsString() favoriteColor?: string
  @IsOptional() @IsString() occupation?: string
  @IsOptional() @IsArray() tags?: string[]
  @IsOptional() @IsString() identity?: string
  @IsOptional() @IsString() douyinPayCode?: string
}

export class SetPasswordDto {
  @IsString() @IsNotEmpty() password!: string
  @IsString() @IsNotEmpty() confirmPassword!: string
}

