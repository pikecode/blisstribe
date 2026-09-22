import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { ShopCart, ShopCartItem } from '@prisma/client'

@Injectable()
export class CartRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: bigint): Promise<
    (ShopCart & {
      items: (ShopCartItem & {
        product: any
      })[]
    }) | null
  > {
    return this.prisma.shopCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    })
  }

  async findOrCreateByUserId(userId: bigint): Promise<
    ShopCart & {
      items: (ShopCartItem & {
        product: any
      })[]
    }
  > {
    let cart = await this.findByUserId(userId)

    if (!cart) {
      cart = await this.prisma.shopCart.create({
        data: {
          userId,
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      })
    }

    return cart
  }

  async findItemByCartIdAndProductId(
    cartId: bigint,
    productId: bigint
  ): Promise<(ShopCartItem & { product: any }) | null> {
    return this.prisma.shopCartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
      include: { product: true },
    })
  }

  async createItem(
    cartId: bigint,
    productId: bigint,
    quantity: number
  ): Promise<ShopCartItem & { product: any }> {
    return this.prisma.shopCartItem.create({
      data: {
        cartId,
        productId,
        quantity,
      },
      include: { product: true },
    })
  }

  async updateItem(
    cartId: bigint,
    productId: bigint,
    quantity: number
  ): Promise<ShopCartItem & { product: any }> {
    return this.prisma.shopCartItem.update({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
      data: { quantity },
      include: { product: true },
    })
  }

  async deleteItem(cartId: bigint, productId: bigint): Promise<ShopCartItem> {
    return this.prisma.shopCartItem.delete({
      where: {
        cartId_productId: {
          cartId,
          productId,
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
