import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { ShopCategory } from '@prisma/client'
import { CategoryRepository } from './category.repository'
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto'

@Injectable()
export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async getAllCategories(includeDisabled = false) {
    const categories = includeDisabled
      ? await this.categoryRepository.findAllForAdmin()
      : await this.categoryRepository.findAll()
    return categories.map((c) => this.toVO(c))
  }

  async createCategory(dto: CreateCategoryDto) {
    // 检查 code 是否已存在
    const existing = await this.categoryRepository.findByCode(dto.code)
    if (existing) {
      throw new ConflictException('分类编码已存在')
    }

    const category = await this.categoryRepository.create({
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
}
