import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { CartRepository } from './cart.repository'
import { ProductRepository } from '../product/product.repository'
import { AddCartItemDto, UpdateCartItemDto } from '../dto/cart.dto'

@Injectable()
export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository
  ) {}

  async getCart(userId: bigint): Promise<any> {
    const cart = await this.cartRepository.findOrCreateByUserId(userId)
    const items = cart.items.map((item: any) => {
      const sku = item.sku
      return {
        id: item.id,
        cartId: item.cartId,
        skuId: sku.id,
        quantity: item.quantity,
        sku: {
          id: sku.id,
          skuCode: sku.skuCode,
          specifications: sku.specifications,
          priceFen: sku.priceFen,
          totalStock: sku.totalStock,
          reservedStock: sku.reservedStock,
          soldStock: sku.soldStock,
          available: Math.max(0, sku.totalStock - sku.reservedStock - sku.soldStock),
          enabled: sku.enabled,
          product: {
            id: sku.product.id,
            name: sku.product.name,
            images: sku.product.images,
            status: sku.product.status,
          },
        },
      }
    })

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalQuantity: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      totalAmount: items.reduce(
        (sum: number, item: any) => sum + item.sku.priceFen * item.quantity,
        0
      ),
    }
  }

  async addItem(userId: bigint, dto: AddCartItemDto): Promise<any> {
    if (!Number.isSafeInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('商品数量必须大于0')
    }

    let skuId: bigint
    if (dto.skuId !== undefined) {
      try {
        skuId = BigInt(dto.skuId)
      } catch {
        throw new BadRequestException('SKU ID 无效')
      }
    } else if (dto.productId !== undefined) {
      let productId: bigint
      try {
        productId = BigInt(dto.productId)
      } catch {
        throw new BadRequestException('商品 ID 无效')
      }
      const product = await this.productRepository.findById(productId)
      if (!product) throw new NotFoundException('商品不存在')
      const enabledSkus = product.skus.filter((sku: any) => sku.enabled)
      if (enabledSkus.length !== 1) {
        throw new BadRequestException('该商品有多个规格，请先选择规格')
      }
      skuId = enabledSkus[0].id
    } else {
      throw new BadRequestException('必须提供 SKU ID')
    }

    const sku = await this.productRepository.findSkuById(skuId)
    if (!sku || !sku.product || sku.product.deletedAt) {
      throw new NotFoundException(`SKU 不存在：${skuId.toString()}`)
    }
    if (!sku.enabled || sku.product.status !== 1) {
      throw new NotFoundException('商品规格已下架')
    }

    const available = sku.totalStock - sku.reservedStock - sku.soldStock
    const cart = await this.cartRepository.findOrCreateByUserId(userId)
    const existingItem = await this.cartRepository.findItemByCartIdAndSkuId(cart.id, skuId)
    const nextQuantity = (existingItem?.quantity || 0) + dto.quantity
    if (nextQuantity > available) throw new BadRequestException('库存不足')

    if (existingItem) {
      await this.cartRepository.updateItem(cart.id, skuId, nextQuantity)
    } else {
      await this.cartRepository.createItem(cart.id, skuId, dto.quantity)
    }
    return this.getCart(userId)
  }

  async updateItem(userId: bigint, itemId: bigint, dto: UpdateCartItemDto): Promise<any> {
    if (dto.quantity !== undefined && (!Number.isSafeInteger(dto.quantity) || dto.quantity <= 0)) {
      throw new BadRequestException('商品数量必须大于0')
    }
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) throw new NotFoundException('购物车不存在')
    const item = cart.items.find((candidate: any) => candidate.id === itemId)
    if (!item) throw new BadRequestException('该商品不在购物车中')

    if (dto.quantity !== undefined) {
      const sku = item.sku
      const available = sku.totalStock - sku.reservedStock - sku.soldStock
      if (!sku.enabled || dto.quantity > available) throw new BadRequestException('库存不足或规格已下架')
      await this.cartRepository.updateItem(cart.id, item.skuId, dto.quantity)
    }
    return this.getCart(userId)
  }

  async removeItem(userId: bigint, itemId: bigint): Promise<any> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) throw new NotFoundException('购物车不存在')
    const item = cart.items.find((candidate: any) => candidate.id === itemId)
    if (!item) throw new BadRequestException('该商品不在购物车中')
    await this.cartRepository.deleteItem(cart.id, item.skuId)
    return this.getCart(userId)
  }

  async clearCart(userId: bigint): Promise<any> {
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) throw new NotFoundException('购物车不存在')
    await this.cartRepository.clearItems(cart.id)
    return this.getCart(userId)
  }

  async getOrCreateCart(userId: bigint): Promise<any> {
    return this.getCart(userId)
  }

  async addToCart(userId: bigint, dto: AddCartItemDto): Promise<any> {
    return this.addItem(userId, dto)
  }

  async updateCartItemQuantity(userId: bigint, skuId: bigint, quantity: number): Promise<any> {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('商品数量必须大于0')
    }
    const cart = await this.cartRepository.findByUserId(userId)
    if (!cart) throw new NotFoundException('购物车不存在')
    const item = cart.items.find((candidate: any) => candidate.skuId === skuId)
    if (!item) throw new BadRequestException('该 SKU 不在购物车中')
    const available =
      item.sku.totalStock - item.sku.reservedStock - item.sku.soldStock
    if (!item.sku.enabled || quantity > available) throw new BadRequestException('库存不足')
    await this.cartRepository.updateItem(cart.id, skuId, quantity)
    return this.getCart(userId)
  }
}
