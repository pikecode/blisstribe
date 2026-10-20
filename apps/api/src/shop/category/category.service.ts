import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { ShopCategory } from '@prisma/client'
import { CategoryRepository } from './category.repository'
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto'

@Injectable()
export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async getAllCategories(includeDisabled = false) {
    const categories = await this.categoryRepository.findAllForAdmin()
    const enabledRoots = new Set(categories.filter((c) => c.status === 1 && c.parentId === null).map((c) => c.id))
    return categories.filter((c) => includeDisabled || (c.status === 1 && (c.parentId === null || enabledRoots.has(c.parentId)))).map((c) => this.toVO(c))
  }

  async createCategory(dto: CreateCategoryDto) {
    const parentId = dto.parentId == null ? null : BigInt(dto.parentId)
    await this.validateParent(parentId)
    // 检查 code 是否已存在
    const existing = await this.categoryRepository.findByCode(dto.code)
    if (existing) {
      throw new ConflictException('分类编码已存在')
    }

    const category = await this.categoryRepository.create({
      parentId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder || 0,
      status: dto.status ?? 1,
    })
    return this.toVO(category)
  }

  async updateCategory(id: bigint, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findById(id)
    if (!category) {
      throw new NotFoundException('分类不存在')
    }

    if (dto.code && dto.code !== category.code) {
      const existing = await this.categoryRepository.findByCode(dto.code)
      if (existing) {
        throw new ConflictException('分类编码已存在')
      }
    }

    const updated = await this.categoryRepository.update(id, {
      ...(dto.parentId !== undefined ? { parentId: await this.validateParent(dto.parentId === null ? null : BigInt(dto.parentId), id) } : {}),
      code: dto.code,
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder,
      status: dto.status,
    })
    return this.toVO(updated)
  }

  async deleteCategory(id: bigint) {
    const category = await this.categoryRepository.findById(id)
    if (!category) {
      throw new NotFoundException('分类不存在')
    }

    const deleted = await this.categoryRepository.delete(id)
    return this.toVO(deleted)
  }

  private toVO(category: ShopCategory) {
    return {
      parentId: category.parentId === null ? null : Number(category.parentId),
      id: Number(category.id),
      code: category.code,
      name: category.name,
      description: category.description ?? undefined,
      imageUrl: category.imageUrl ?? undefined,
      sortOrder: category.sortOrder,
      status: category.status,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    }
  }

  private async validateParent(parentId: bigint | null, id?: bigint) {
    if (parentId === null) return null
    if (parentId === id) throw new BadRequestException('分类不能选择自身作为父分类')
    const parent = await this.categoryRepository.findById(parentId)
    if (!parent) throw new BadRequestException('父分类不存在')
    if (parent.parentId !== null) throw new BadRequestException('商城仅支持两级分类，请选择一级分类')
    if (id !== undefined) {
      const categories = await this.categoryRepository.findAllForAdmin()
      if (categories.some((category) => category.parentId === id)) {
        throw new BadRequestException('该分类下已有二级分类，请先调整子分类归属')
      }
    }
    return parentId
  }
}
