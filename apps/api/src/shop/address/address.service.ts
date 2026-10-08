import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { CreateShopAddressDto, UpdateShopAddressDto } from '../dto/address.dto'

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: bigint) {
    return this.prisma.shopAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })
  }

  create(userId: bigint, dto: CreateShopAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const isFirst = await tx.shopAddress.count({ where: { userId } }) === 0
      const isDefault = isFirst || dto.isDefault === true
      if (isDefault) {
        await tx.shopAddress.updateMany({ where: { userId }, data: { isDefault: false } })
      }
      return tx.shopAddress.create({
        data: {
          userId,
          receiverName: dto.receiverName.trim(),
          receiverPhone: dto.receiverPhone.trim(),
          fullAddress: dto.fullAddress.trim(),
          isDefault,
        },
      })
    })
  }

  async update(userId: bigint, id: bigint, dto: UpdateShopAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.shopAddress.findFirst({ where: { id, userId } })
      if (!address) throw new NotFoundException('收货地址不存在')
      if (dto.isDefault === true) {
        await tx.shopAddress.updateMany({ where: { userId }, data: { isDefault: false } })
      }
      return tx.shopAddress.update({
        where: { id },
        data: {
          ...(dto.receiverName !== undefined && { receiverName: dto.receiverName.trim() }),
          ...(dto.receiverPhone !== undefined && { receiverPhone: dto.receiverPhone.trim() }),
          ...(dto.fullAddress !== undefined && { fullAddress: dto.fullAddress.trim() }),
          ...(dto.isDefault === true && { isDefault: true }),
        },
      })
    })
  }

  async remove(userId: bigint, id: bigint) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.shopAddress.findFirst({ where: { id, userId } })
      if (!address) throw new NotFoundException('收货地址不存在')
      await tx.shopAddress.delete({ where: { id } })
      if (address.isDefault) {
        const next = await tx.shopAddress.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        })
        if (next) await tx.shopAddress.update({ where: { id: next.id }, data: { isDefault: true } })
      }
      return { success: true }
    })
  }
}
