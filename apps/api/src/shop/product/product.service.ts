import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { ProductRepository } from './product.repository'
import { CategoryRepository } from '../category/category.repository'
import { CreateProductDto, ProductSkuDto, UpdateProductDto } from '../dto/product.dto'

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
      list: result.list.map((product) => this.toProductSummary(product)),
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
    return this.toProductSummary(product, true)
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
      list: result.list.map((product) => this.toProductSummary(product, true)),
      total: result.total,
      page,
      pageSize,
      hasMore: page * pageSize < result.total,
    }
  }

  private toProductSummary(product: any, publicOnly = false) {
    const allSkus = product.skus || []
    const skus = publicOnly ? allSkus.filter((sku: any) => sku.enabled) : allSkus
    const enabledSkus = allSkus.filter((sku: any) => sku.enabled)
    const prices = enabledSkus.map((sku: any) => sku.priceFen)
    const totalStock = skus.reduce((sum: number, sku: any) => sum + sku.totalStock, 0)
    const reservedStock = skus.reduce((sum: number, sku: any) => sum + sku.reservedStock, 0)
    const soldStock = skus.reduce((sum: number, sku: any) => sum + sku.soldStock, 0)
    const available = enabledSkus.reduce(
      (sum: number, sku: any) =>
        sum + Math.max(0, sku.totalStock - sku.reservedStock - sku.soldStock),
      0
    )
    const normalizedSkus = skus.map((sku: any) => ({
      ...sku,
      available: sku.enabled
        ? Math.max(0, sku.totalStock - sku.reservedStock - sku.soldStock)
        : 0,
    }))
    return {
      ...product,
      skus: normalizedSkus,
      priceFen: prices.length ? Math.min(...prices) : 0,
      priceMaxFen: prices.length ? Math.max(...prices) : 0,
      totalStock,
      reservedStock,
      soldStock,
      available,
      stockStatus: available === 0 ? 'sold_out' : available <= 5 ? 'limited' : 'available',
    }
  }

  async createProduct(dto: CreateProductDto): Promise<any> {
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('商品名称不能为空')
    }
    const skus = this.normalizeSkus(dto.skus)

    // Validate categoryId exists
    const categoryId = typeof dto.categoryId === 'bigint' ? dto.categoryId : BigInt(dto.categoryId)
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) {
      throw new NotFoundException('分类不存在')
    }

    const product = await this.productRepository.create({
      categoryId,
      name: dto.name,
      description: dto.description,
      images: dto.images,
      skus,
      sortOrder: dto.sortOrder || 0,
    })
    return this.toProductSummary(product)
  }

  async updateProduct(id: bigint, dto: UpdateProductDto): Promise<any> {
    const product = await this.productRepository.findById(id)
    if (!product) {
      throw new NotFoundException('商品不存在')
    }

    if (dto.name !== undefined && dto.name.trim() === '') {
      throw new BadRequestException('商品名称不能为空')
    }
    const categoryId = dto.categoryId === undefined ? undefined : BigInt(dto.categoryId)
    if (categoryId !== undefined) {
      const category = await this.categoryRepository.findById(categoryId)
      if (!category) {
        throw new NotFoundException('分类不存在')
      }
    }
    const skus = dto.skus === undefined ? undefined : this.normalizeSkus(dto.skus)
    const updatedProduct = await this.productRepository.update(id, {
      ...dto,
      categoryId,
      skus,
    })
    return this.toProductSummary(updatedProduct)
  }

  private normalizeSkus(skus: ProductSkuDto[]) {
    if (!Array.isArray(skus) || skus.length === 0) {
      throw new BadRequestException('商品至少需要一个 SKU')
    }

    const seenKeys = new Set<string>()
    const seenCodes = new Set<string>()
    return skus.map((sku) => {
      if (!Number.isSafeInteger(sku.priceFen) || sku.priceFen <= 0) {
        throw new BadRequestException('SKU 价格必须为正整数分')
      }
      if (!Number.isSafeInteger(sku.totalStock) || sku.totalStock < 0) {
        throw new BadRequestException('SKU 库存必须为非负整数')
      }
      const specifications = Object.fromEntries(
        Object.entries(sku.specifications || {})
          .map(([key, value]) => [key.trim(), String(value).trim()])
          .filter(([key, value]) => key && value)
          .sort(([a], [b]) => a.localeCompare(b))
      )
      const specificationKey = JSON.stringify(specifications)
      if (seenKeys.has(specificationKey)) {
        throw new BadRequestException('SKU 规格组合不能重复')
      }
      seenKeys.add(specificationKey)

      const skuCode = sku.skuCode?.trim()
      if (skuCode && seenCodes.has(skuCode)) {
        throw new BadRequestException('SKU 编码不能重复')
      }
      if (skuCode) seenCodes.add(skuCode)

      let skuId: bigint | undefined
      if (sku.id) {
        try {
          skuId = BigInt(sku.id)
        } catch {
          throw new BadRequestException('SKU ID 无效')
        }
      }
      return {
        id: skuId,
        skuCode,
        specifications,
        specificationKey,
        priceFen: sku.priceFen,
        totalStock: sku.totalStock,
        enabled: sku.enabled !== false,
      }
    })
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
