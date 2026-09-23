import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { ShopCategory } from '@prisma/client'

@Injectable()
export class CategoryRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<ShopCategory[]> {
    return this.prisma.shopCategory.findMany({
      where: { status: 1 },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async findById(id: bigint): Promise<ShopCategory | null> {
    return this.prisma.shopCategory.findUnique({
      where: { id },
    })
  }

  async findByCode(code: string): Promise<ShopCategory | null> {
    return this.prisma.shopCategory.findUnique({
      where: { code },
    })
  }

  async create(data: {
    code: string
    name: string
    description?: string
    imageUrl?: string
    sortOrder?: number
  }): Promise<ShopCategory> {
    return this.prisma.shopCategory.create({
      data,
    })
  }

  async update(
    id: bigint,
    data: {
      name?: string
      description?: string
      imageUrl?: string
      sortOrder?: number
      status?: number
    }
  ): Promise<ShopCategory> {
    return this.prisma.shopCategory.update({
      where: { id },
      data,
    })
  }

  async delete(id: bigint): Promise<ShopCategory> {
    return this.prisma.shopCategory.update({
      where: { id },
      data: { status: 0 },
    })
  }
}
