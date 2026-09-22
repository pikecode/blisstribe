import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { CartRepository } from './cart.repository'
import { ProductRepository } from '../product/product.repository'
import { AddCartItemDto, UpdateCartItemDto } from '../dto/cart.dto'
import { AmountUtil } from '../common/utils/amount.util'

@Injectable()
export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository
  ) {}

  async getCart(userId: bigint): Promise<{
    id: bigint
    userId: bigint
    items: Array<{
      id: bigint
      productId: bigint
      quantity: number
      product: {
        id: bigint
        name: string
        images: string[]
        priceFen: number
        totalStock: number
        available: number
      }
    }>
    totalQuantity: number
    totalAmount: number
  }> {
    const cart = await this.cartRepository.findOrCreateByUserId(userId)

    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.priceFen * item.quantity,
      0
    )

    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          images: item.product.images,
          priceFen: item.product.priceFen,
          totalStock: item.product.totalStock,
          available:
            item.product.totalStock -
            item.product.reservedStock -
            item.product.soldStock,
        },
      })),
      totalQuantity,
      totalAmount,
    }
  }

  async addItem(userId: bigint, dto: AddCartItemDto): Promise<any> {
    // Validate product exists and is published
    const productId = typeof dto.productId === 'bigint' ? dto.productId : BigInt(dto.productId)
    const product = await this.productRepository.findById(productId)

    if (!product) {
      throw new NotFoundException('商品不存在')
    }

    if (product.status !== 1) {
      throw new NotFoundException('商品已下架')
    }

    // Validate quantity
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('商品数量必须大于0')
    }

    // Check available stock
    const available = product.totalStock - product.reservedStock - product.soldStock
    if (dto.quantity > available) {
      throw new BadRequestException('库存不足')
    }

    // Get or create cart
    const cart = await this.cartRepository.findOrCreateByUserId(userId)

    // Check if product already in cart
    const existingItem = await this.cartRepository.findItemByCartIdAndProductId(
      cart.id,
      productId
    )

    let cartItem
    if (existingItem) {
      // Increment quantity
      const newQuantity = existingItem.quantity + dto.quantity

      // Re-check available stock with new quantity
      if (newQuantity > available) {
        throw new BadRequestException('库存不足')
      }

      cartItem = await this.cartRepository.updateItem(cart.id, productId, newQuantity)
    } else {
      // Create new item
      cartItem = await this.cartRepository.createItem(cart.id, productId, dto.quantity)
    }

    return this.getCart(userId)
  }

  async updateItem(
    userId: bigint,
    itemId: bigint,
    dto: UpdateCartItemDto
  ): Promise<any> {
    if (dto.quantity !== undefined) {
      // Validate quantity
      if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
        throw new BadRequestException('商品数量必须大于0')
      }
    }

    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) {
      throw new NotFoundException('购物车不存在')
    }

    // Find the item in the cart
    const item = cart.items.find(i => i.id === itemId)
    if (!item) {
      throw new BadRequestException('该商品不在购物车中')
    }

    // Verify item belongs to user's cart
    if (item.cartId !== cart.id) {
      throw new BadRequestException('无权操作此商品')
    }

    // If updating quantity, validate stock
    if (dto.quantity !== undefined) {
      const product = item.product
      const available = product.totalStock - product.reservedStock - product.soldStock

      if (dto.quantity > available) {
        throw new BadRequestException('库存不足')
      }

      await this.cartRepository.updateItem(cart.id, item.productId, dto.quantity)
    }

    return this.getCart(userId)
  }

  async removeItem(userId: bigint, itemId: bigint): Promise<any> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) {
      throw new NotFoundException('购物车不存在')
    }

    // Find the item in the cart
    const item = cart.items.find(i => i.id === itemId)
    if (!item) {
      throw new BadRequestException('该商品不在购物车中')
    }

    // Verify item belongs to user's cart
    if (item.cartId !== cart.id) {
      throw new BadRequestException('无权操作此商品')
    }

    await this.cartRepository.deleteItem(cart.id, item.productId)

    return this.getCart(userId)
  }

  async clearCart(userId: bigint): Promise<any> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) {
      throw new NotFoundException('购物车不存在')
    }

    await this.cartRepository.clearItems(cart.id)

    return this.getCart(userId)
  }
}
