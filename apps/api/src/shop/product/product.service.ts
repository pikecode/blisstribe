import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { ProductRepository } from './product.repository'
import { CategoryRepository } from '../category/category.repository'
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto'

@Injectable()
export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private categoryRepository: CategoryRepository
  ) {}

  async getAllProducts(categoryId?: bigint): Promise<any[]> {
    let categoryIdBig: bigint | undefined
    if (categoryId !== undefined) {
      categoryIdBig = typeof categoryId === 'bigint' ? categoryId : BigInt(categoryId)
    }
    return this.productRepository.findAll(categoryIdBig)
  }

  async getPublishedProducts(categoryId?: bigint): Promise<any[]> {
    let categoryIdBig: bigint | undefined
    if (categoryId !== undefined) {
      categoryIdBig = typeof categoryId === 'bigint' ? categoryId : BigInt(categoryId)
    }
    return this.productRepository.findAll(categoryIdBig, 1)
  }

  async getProductById(id: bigint): Promise<any> {
    const product = await this.productRepository.findById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }
    return product
  }

  async createProduct(dto: CreateProductDto): Promise<any> {
    // Validate name
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('商品名称不能为空')
    }

    // Validate priceFen
    if (dto.priceFen < 1) {
      throw new BadRequestException('商品价格必须大于0')
    }

    // Validate totalStock
    if (dto.totalStock < 0) {
      throw new BadRequestException('库存数量不能为负数')
    }

    // Validate categoryId exists
    const categoryId = typeof dto.categoryId === 'bigint' ? dto.categoryId : BigInt(dto.categoryId)
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) {
      throw new NotFoundException('分类不存在')
    }

    return this.productRepository.create({
      categoryId,
      name: dto.name,
      description: dto.description,
      images: dto.images,
      priceFen: dto.priceFen,
      totalStock: dto.totalStock,
      sortOrder: dto.sortOrder || 0,
    })
  }

  async updateProduct(id: bigint, dto: UpdateProductDto): Promise<any> {
    const product = await this.productRepository.findById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }

    // Validate name if provided
    if (dto.name !== undefined && dto.name.trim() === '') {
      throw new BadRequestException('商品名称不能为空')
    }

    // Validate priceFen if provided
    if (dto.priceFen !== undefined && dto.priceFen < 1) {
      throw new BadRequestException('商品价格必须大于0')
    }

    // Validate totalStock if provided
    if (dto.totalStock !== undefined && dto.totalStock < 0) {
      throw new BadRequestException('库存数量不能为负数')
    }

    return this.productRepository.update(id, dto)
  }

  async publishProduct(id: bigint): Promise<any> {
    const product = await this.productRepository.findById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }

    return this.productRepository.update(id, { status: 1 })
  }

  async unpublishProduct(id: bigint): Promise<any> {
    const product = await this.productRepository.findById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }

    return this.productRepository.update(id, { status: 2 })
  }

  async deleteProduct(id: bigint): Promise<any> {
    const product = await this.productRepository.findById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }

    return this.productRepository.delete(id)
  }
}
