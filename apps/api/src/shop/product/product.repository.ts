import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { randomUUID } from 'crypto'
import { ShopProduct } from '@prisma/client'

@Injectable()
export class ProductRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(categoryId?: bigint, status?: number): Promise<any[]> {
    const where: any = {
      deletedAt: null,
    }

    if (categoryId !== undefined) {
      where.categoryId = categoryId
    }

    if (status !== undefined) {
      where.status = status
    }

    return this.prisma.shopProduct.findMany({
      where,
      include: { skus: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async findWithPagination(params: {
    page?: number
    pageSize?: number
    categoryId?: bigint
    keyword?: string
    status?: number
  }): Promise<{ list: any[]; total: number }> {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (params.status !== undefined) {
      where.status = params.status
    }

    if (params.categoryId !== undefined) {
      where.categoryId = params.categoryId
    }

    if (params.keyword) {
      where.name = {
        contains: params.keyword,
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.shopProduct.findMany({
        where,
        include: { skus: true },
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.shopProduct.count({ where }),
    ])

    return { list, total }
  }

  async findById(id: bigint): Promise<any | null> {
    return this.prisma.shopProduct.findUnique({
      where: { id },
      include: { skus: true },
    })
  }

  async findPublishedById(id: bigint): Promise<any | null> {
    return this.prisma.shopProduct.findFirst({
      where: { id, status: 1, deletedAt: null },
      include: { skus: { where: { enabled: true }, orderBy: { id: 'asc' } } },
    })
  }

  async findSkuById(id: bigint): Promise<any | null> {
    return this.prisma.shopProductSku.findUnique({
      where: { id },
      include: { product: true },
    })
  }

  async create(data: {
    categoryId: bigint
    name: string
    description?: string
    images: string[]
    skus: Array<{
      skuCode?: string
      specifications: Record<string, string>
      specificationKey: string
      priceFen: number
      totalStock: number
      enabled: boolean
    }>
    sortOrder?: number
  }): Promise<any> {
    return this.prisma.shopProduct.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        images: data.images,
        sortOrder: data.sortOrder || 0,
        skus: {
          create: data.skus.map((sku) => ({
            skuCode: sku.skuCode || `SKU-${randomUUID()}`,
            specifications: sku.specifications,
            specificationKey: sku.specificationKey,
            priceFen: sku.priceFen,
            totalStock: sku.totalStock,
            enabled: sku.enabled,
          })),
        },
      },
      include: { skus: true },
    })
  }

  async update(
    id: bigint,
    data: {
      categoryId?: bigint
      name?: string
      description?: string
      images?: string[]
      status?: number
      sortOrder?: number
      skus?: Array<{
        id?: bigint
        skuCode?: string
        specifications: Record<string, string>
        specificationKey: string
        priceFen: number
        totalStock: number
        enabled: boolean
      }>
    }
  ): Promise<any> {
    return this.prisma.$transaction(async (tx: any) => {
      const { skus, ...productData } = data
      await tx.shopProduct.update({ where: { id }, data: productData })

      if (skus) {
        const current = await tx.shopProductSku.findMany({
          where: { productId: id },
          include: {
            _count: { select: { cartItems: true, orderItems: true } },
          },
        })
        const submittedIds = new Set(skus.flatMap((sku) => sku.id ? [sku.id] : []))

        for (const existing of current) {
          if (submittedIds.has(existing.id)) continue
          if (existing._count.cartItems || existing._count.orderItems) {
            await tx.shopProductSku.update({
              where: { id: existing.id },
              data: { enabled: false },
            })
          } else {
            await tx.shopProductSku.delete({ where: { id: existing.id } })
          }
        }

        for (const sku of skus) {
          if (sku.id) {
            const existing = current.find((item: any) => item.id === sku.id)
            if (!existing) throw new BadRequestException('SKU 不属于当前商品')
            if (sku.totalStock < existing.reservedStock + existing.soldStock) {
              throw new BadRequestException('SKU 库存不能低于预留库存与已售库存')
            }
            await tx.shopProductSku.update({
              where: { id: sku.id },
              data: {
                skuCode: sku.skuCode,
                specifications: sku.specifications,
                specificationKey: sku.specificationKey,
                priceFen: sku.priceFen,
                totalStock: sku.totalStock,
                enabled: sku.enabled,
              },
            })
          } else {
            await tx.shopProductSku.create({
              data: {
                productId: id,
                skuCode: sku.skuCode || `SKU-${randomUUID()}`,
                specifications: sku.specifications,
                specificationKey: sku.specificationKey,
                priceFen: sku.priceFen,
                totalStock: sku.totalStock,
                enabled: sku.enabled,
              },
            })
          }
        }
      }

      return tx.shopProduct.findUnique({
        where: { id },
        include: { skus: true },
      })
    })
  }

  async delete(id: bigint): Promise<ShopProduct> {
    return this.prisma.shopProduct.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async getAllActive(): Promise<ShopProduct[]> {
    return this.prisma.shopProduct.findMany({
      where: {
        status: 1,
        deletedAt: null,
      },
      include: { skus: { where: { enabled: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }
}
