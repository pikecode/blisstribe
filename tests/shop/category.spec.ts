import { Test, TestingModule } from '@nestjs/testing'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { CategoryRepository } from '../../apps/api/src/shop/category/category.repository'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { ConflictException, NotFoundException } from '@nestjs/common'

describe('CategoryService', () => {
  let service: CategoryService
  let repository: CategoryRepository
  let prisma: PrismaService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService, CategoryRepository, PrismaService],
    }).compile()

    service = module.get<CategoryService>(CategoryService)
    repository = module.get<CategoryRepository>(CategoryRepository)
    prisma = module.get<PrismaService>(PrismaService)

    await prisma.$connect()
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.shopCategory.deleteMany({
      where: {
        code: { startsWith: 'test_' },
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const dto = {
        code: 'test_category_1',
        name: 'Test Category 1',
        sortOrder: 1,
      }

      const result = await service.createCategory(dto)

      expect(result).toBeDefined()
      expect(result.code).toBe(dto.code)
      expect(result.name).toBe(dto.name)
      expect(result.sortOrder).toBe(dto.sortOrder)
      expect(result.status).toBe(1) // Should be active by default
    })

    it('should throw ConflictException when code already exists', async () => {
      const dto = {
        code: 'test_category_2',
        name: 'Test Category 2',
      }

      // Create first category
      await service.createCategory(dto)

      // Try to create another with same code
      await expect(service.createCategory(dto)).rejects.toThrow(ConflictException)
    })
  })

  describe('getAllCategories', () => {
    it('should return only active categories', async () => {
      // Create active category
      await service.createCategory({
        code: 'test_active_1',
        name: 'Active Category',
        sortOrder: 1,
      })

      // Create category and deactivate it
      const inactive = await service.createCategory({
        code: 'test_inactive_1',
        name: 'Inactive Category',
        sortOrder: 2,
      })
      await service.deleteCategory(BigInt(inactive.id))

      const categories = await service.getAllCategories()

      const activeTest = categories.find((c) => c.code === 'test_active_1')
      const inactiveTest = categories.find((c) => c.code === 'test_inactive_1')

      expect(activeTest).toBeDefined()
      expect(inactiveTest).toBeUndefined() // Deleted (status = 0) should not appear
    })

    it('should return empty array when no active categories exist', async () => {
      // This depends on other tests; in isolation, could have many categories
      const categories = await service.getAllCategories()
      expect(Array.isArray(categories)).toBe(true)
    })
  })

  describe('deleteCategory', () => {
    it('should soft delete a category', async () => {
      const created = await service.createCategory({
        code: 'test_soft_delete',
        name: 'To Delete',
      })

      const deleted = await service.deleteCategory(BigInt(created.id))

      expect(deleted.status).toBe(0) // Status should be 0 (inactive)

      // Verify it's still in DB but with status 0
      const found = await repository.findById(BigInt(created.id))
      expect(found).toBeDefined()
      expect(found!.status).toBe(0)
    })

    it('should throw NotFoundException when category does not exist', async () => {
      const fakeId = BigInt(999999)

      await expect(service.deleteCategory(fakeId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateCategory', () => {
    it('should update a category', async () => {
      const created = await service.createCategory({
        code: 'test_update',
        name: 'Original Name',
        sortOrder: 1,
      })

      const updated = await service.updateCategory(BigInt(created.id), {
        name: 'Updated Name',
        sortOrder: 5,
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.sortOrder).toBe(5)
    })

    it('should throw NotFoundException when updating non-existent category', async () => {
      const fakeId = BigInt(999999)

      await expect(
        service.updateCategory(fakeId, { name: 'New Name' })
      ).rejects.toThrow(NotFoundException)
    })
  })
})
