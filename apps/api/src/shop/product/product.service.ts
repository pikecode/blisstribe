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

  async getAllProducts(params?: {
    page?: number
    pageSize?: number
    categoryId?: string | bigint
    keyword?: string
  }): Promise<any> {
    if (!params) {
      return this.productRepository.findAll()
    }

    const categoryIdBig = params.categoryId
      ? typeof params.categoryId === 'bigint'
        ? params.categoryId
        : BigInt(params.categoryId)
      : undefined

    const result = await this.productRepository.findWithPagination({
      page: params.page,
      pageSize: params.pageSize,
      categoryId: categoryIdBig,
      keyword: params.keyword,
    })

    return {
      list: result.list,
      total: result.total,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    }
  }

  async getPublishedProducts(categoryId?: bigint): Promise<any> {
    let categoryIdBig: bigint | undefined
    if (categoryId !== undefined) {
      categoryIdBig = typeof categoryId === 'bigint' ? categoryId : BigInt(categoryId)
    }
    return this.getPublishedProductsPage({ categoryId: categoryIdBig })
  }

  async getProductById(id: bigint): Promise<any> {
    const product = await this.productRepository.findPublishedById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }
    return this.toPublicProduct(product)
  }

  async getPublishedProductsPage(params: {
    page?: number
    pageSize?: number
    categoryId?: bigint
    keyword?: string
  }) {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
    const result = await this.productRepository.findWithPagination({
      page,
      pageSize,
      categoryId: params.categoryId,
      keyword: params.keyword?.trim() || undefined,
      status: 1,
    })
    return {
      list: result.list.map((product) => this.toPublicProduct(product)),
      total: result.total,
      page,
      pageSize,
      hasMore: page * pageSize < result.total,
    }
  }

  private toPublicProduct(product: {
    id: bigint
    totalStock: number
    reservedStock: number
    soldStock: number
    [key: string]: any
  }) {
    const available = Math.max(
      0,
      product.totalStock - product.reservedStock - product.soldStock
    )
    return {
      ...product,
      available,
      stockStatus: available === 0 ? 'sold_out' : available <= 5 ? 'limited' : 'available',
    }
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
