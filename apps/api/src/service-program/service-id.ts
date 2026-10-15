import { BadRequestException } from '@nestjs/common'

export function serviceId(value: string): bigint {
  if (!/^[1-9]\d{0,15}$/.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER)) throw new BadRequestException('编号必须为有效的正整数')
  return BigInt(value)
}
