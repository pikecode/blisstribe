import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class CreateShopAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  receiverName!: string

  @IsString()
  @Matches(/^[0-9+\-\s]{5,30}$/)
  receiverPhone!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullAddress!: string

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean
}

export class UpdateShopAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @IsOptional()
  receiverName?: string

  @IsString()
  @Matches(/^[0-9+\-\s]{5,30}$/)
  @IsOptional()
  receiverPhone?: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  fullAddress?: string

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean
}
