import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'

@Injectable()
export class CartRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: bigint): Promise<any | null> {
    return this.prisma.shopCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { sku: { include: { product: true } } },
        },
      },
    })
  }

  async findOrCreateByUserId(userId: bigint): Promise<any> {
    let cart = await this.findByUserId(userId)

    if (!cart) {
      cart = await this.prisma.shopCart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: { sku: { include: { product: true } } },
          },
        },
      })
    }

    return cart
  }

  async findItemByCartIdAndSkuId(
    cartId: bigint,
    skuId: bigint
  ): Promise<any | null> {
    return this.prisma.shopCartItem.findUnique({
      where: {
        cartId_skuId: {
          cartId,
          skuId,
        },
      },
      include: { sku: { include: { product: true } } },
    })
  }

  async createItem(
    cartId: bigint,
    skuId: bigint,
    quantity: number
  ): Promise<any> {
    return this.prisma.shopCartItem.create({
      data: {
        cartId,
        skuId,
        quantity,
      },
      include: { sku: { include: { product: true } } },
    })
  }

  async updateItem(
    cartId: bigint,
    skuId: bigint,
    quantity: number
  ): Promise<any> {
    return this.prisma.shopCartItem.update({
      where: {
        cartId_skuId: {
          cartId,
          skuId,
        },
      },
      data: { quantity },
      include: { sku: { include: { product: true } } },
    })
  }

  async deleteItem(cartId: bigint, skuId: bigint): Promise<any> {
    return this.prisma.shopCartItem.delete({
      where: {
        cartId_skuId: {
          cartId,
          skuId,
        },
      },
    })
  }

  async clearItems(cartId: bigint): Promise<{ count: number }> {
    return this.prisma.shopCartItem.deleteMany({
      where: { cartId },
    })
  }
}
