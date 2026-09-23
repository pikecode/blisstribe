import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { ShopProduct } from '@prisma/client'

@Injectable()
export class ProductRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(categoryId?: bigint, status?: number): Promise<ShopProduct[]> {
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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async findWithPagination(params: {
    page?: number
    pageSize?: number
    categoryId?: bigint
    keyword?: string
  }): Promise<{ list: ShopProduct[]; total: number }> {
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
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
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.shopProduct.count({ where }),
    ])

    return { list, total }
  }

  async findById(id: bigint): Promise<ShopProduct | null> {
    return this.prisma.shopProduct.findUnique({
      where: { id },
    })
  }

  async create(data: {
    categoryId: bigint
    name: string
    description?: string
    images: string[]
    priceFen: number
    totalStock: number
    sortOrder?: number
  }): Promise<ShopProduct> {
    return this.prisma.shopProduct.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        images: data.images,
        priceFen: data.priceFen,
        totalStock: data.totalStock,
        sortOrder: data.sortOrder || 0,
      },
    })
  }

  async update(
    id: bigint,
    data: {
      name?: string
      description?: string
      images?: string[]
      priceFen?: number
      totalStock?: number
      status?: number
      sortOrder?: number
    }
  ): Promise<ShopProduct> {
    return this.prisma.shopProduct.update({
      where: { id },
      data,
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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }
}
