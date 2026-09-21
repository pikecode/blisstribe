import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { CategoryRepository } from './category.repository'
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto'

@Injectable()
export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async getAllCategories() {
    return this.categoryRepository.findAll()
  }

  async createCategory(dto: CreateCategoryDto) {
    // 检查 code 是否已存在
    const existing = await this.categoryRepository.findByCode(dto.code)
    if (existing) {
      throw new ConflictException('分类编码已存在')
    }

    return this.categoryRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder || 0,
    })
  }

  async updateCategory(id: bigint, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findById(id)
    if (!category) {
      throw new NotFoundException('分类不存在')
    }

    return this.categoryRepository.update(id, {
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder,
      status: dto.status,
    })
  }

  async deleteCategory(id: bigint) {
    const category = await this.categoryRepository.findById(id)
    if (!category) {
      throw new NotFoundException('分类不存在')
    }

    return this.categoryRepository.delete(id)
  }
}
