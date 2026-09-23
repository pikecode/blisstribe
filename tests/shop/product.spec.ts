import { Test, TestingModule } from '@nestjs/testing'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { ProductRepository } from '../../apps/api/src/shop/product/product.repository'
import { CategoryRepository } from '../../apps/api/src/shop/category/category.repository'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('ProductService', () => {
  let service: ProductService
  let repository: ProductRepository
  let categoryService: CategoryService
  let prisma: PrismaService

  let testCategoryId: bigint

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        ProductRepository,
        CategoryService,
        CategoryRepository,
        PrismaService,
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    repository = module.get<ProductRepository>(ProductRepository)
    categoryService = module.get<CategoryService>(CategoryService)
    prisma = module.get<PrismaService>(PrismaService)

    await prisma.$connect()

    // Create a test category
    const category = await categoryService.createCategory({
      code: 'test_product_category',
      name: 'Test Product Category',
    })
    testCategoryId = BigInt(category.id)
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.shopProduct.deleteMany({
      where: {
        name: { startsWith: 'test_' },
      },
    })
  })

  afterAll(async () => {
    // Clean up test category
    await prisma.shopCategory.deleteMany({
      where: {
        code: 'test_product_category',
      },
    })

    await prisma.$disconnect()
  })

  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      const dto = {
        categoryId: Number(testCategoryId),
        name: 'test_product_1',
        description: 'Test Product Description',
        images: ['https://example.com/image1.jpg'],
        priceFen: 1000,
        totalStock: 100,
        sortOrder: 1,
      }

      const result = await service.createProduct(dto)

      expect(result).toBeDefined()
      expect(result.name).toBe(dto.name)
      expect(result.description).toBe(dto.description)
      expect(result.priceFen).toBe(dto.priceFen)
      expect(result.totalStock).toBe(dto.totalStock)
      expect(result.status).toBe(0) // Draft by default
      expect(result.deletedAt).toBeNull()
    })

    it('should throw BadRequestException when priceFen is negative', async () => {
      const dto = {
        categoryId: Number(testCategoryId),
        name: 'test_bad_price',
        images: ['https://example.com/image.jpg'],
        priceFen: -100,
        totalStock: 50,
      }

      await expect(service.createProduct(dto)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when name is empty', async () => {
      const dto = {
        categoryId: Number(testCategoryId),
        name: '',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 50,
      }

      await expect(service.createProduct(dto)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when totalStock is negative', async () => {
      const dto = {
        categoryId: Number(testCategoryId),
        name: 'test_bad_stock',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: -10,
      }

      await expect(service.createProduct(dto)).rejects.toThrow(BadRequestException)
    })

    it('should throw NotFoundException when categoryId does not exist', async () => {
      const dto = {
        categoryId: 999999,
        name: 'test_bad_category',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 50,
      }

      await expect(service.createProduct(dto)).rejects.toThrow(NotFoundException)
    })
  })

  describe('getPublishedProducts', () => {
    it('should return only published products', async () => {
      // Create and publish a product
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_published_1',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      await service.publishProduct(BigInt(created.id))

      // Create draft product
      await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_draft_1',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      const published = await service.getPublishedProducts()

      const found = published.find((p: any) => p.name === 'test_published_1')
      expect(found).toBeDefined()
      expect(found?.status).toBe(1)

      const draft = published.find((p: any) => p.name === 'test_draft_1')
      expect(draft).toBeUndefined()
    })

    it('should filter published products by categoryId', async () => {
      // Create another category
      const category2 = await categoryService.createCategory({
        code: 'test_category_2',
        name: 'Test Category 2',
      })

      // Publish product in category 1
      const product1 = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_published_cat1',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })
      await service.publishProduct(BigInt(product1.id))

      // Publish product in category 2
      const product2 = await service.createProduct({
        categoryId: Number(category2.id),
        name: 'test_published_cat2',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })
      await service.publishProduct(BigInt(product2.id))

      const publishedInCat1 = await service.getPublishedProducts(testCategoryId)

      const found = publishedInCat1.find((p: any) => p.name === 'test_published_cat1')
      expect(found).toBeDefined()

      const notFound = publishedInCat1.find((p: any) => p.name === 'test_published_cat2')
      expect(notFound).toBeUndefined()

      // Clean up
      await categoryService.deleteCategory(BigInt(category2.id))
    })
  })

  describe('getAllProducts', () => {
    it('should return all products including drafts for admin', async () => {
      const product1 = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_admin_draft',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      const product2 = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_admin_published',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })
      await service.publishProduct(BigInt(product2.id))

      const allProducts = await service.getAllProducts()

      const draft = allProducts.find((p: any) => p.id === product1.id)
      const published = allProducts.find((p: any) => p.id === product2.id)

      expect(draft).toBeDefined()
      expect(published).toBeDefined()
    })
  })

  describe('getProductById', () => {
    it('should return product by ID', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_get_by_id',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      const found = await service.getProductById(BigInt(created.id))

      expect(found).toBeDefined()
      expect(found.name).toBe('test_get_by_id')
    })

    it('should throw NotFoundException when product does not exist', async () => {
      const fakeId = BigInt(999999)

      await expect(service.getProductById(fakeId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateProduct', () => {
    it('should update a product successfully', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_update_original',
        description: 'Original',
        images: ['https://example.com/image1.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      const updated = await service.updateProduct(BigInt(created.id), {
        name: 'test_update_modified',
        description: 'Modified',
        priceFen: 2000,
        totalStock: 50,
      })

      expect(updated.name).toBe('test_update_modified')
      expect(updated.description).toBe('Modified')
      expect(updated.priceFen).toBe(2000)
      expect(updated.totalStock).toBe(50)
    })

    it('should throw NotFoundException when updating non-existent product', async () => {
      const fakeId = BigInt(999999)

      await expect(
        service.updateProduct(fakeId, { name: 'New Name' })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when updating with invalid priceFen', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_update_bad_price',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      await expect(
        service.updateProduct(BigInt(created.id), { priceFen: 0 })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('publishProduct', () => {
    it('should publish a product (set status to 1)', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_publish',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      expect(created.status).toBe(0) // Initially draft

      const published = await service.publishProduct(BigInt(created.id))

      expect(published.status).toBe(1)
    })

    it('should throw NotFoundException when publishing non-existent product', async () => {
      const fakeId = BigInt(999999)

      await expect(service.publishProduct(fakeId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('unpublishProduct', () => {
    it('should unpublish a product (set status to 2)', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_unpublish',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      await service.publishProduct(BigInt(created.id))

      const unpublished = await service.unpublishProduct(BigInt(created.id))

      expect(unpublished.status).toBe(2)
    })

    it('should throw NotFoundException when unpublishing non-existent product', async () => {
      const fakeId = BigInt(999999)

      await expect(service.unpublishProduct(fakeId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('deleteProduct', () => {
    it('should soft delete a product', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_soft_delete',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      expect(created.deletedAt).toBeNull()

      const deleted = await service.deleteProduct(BigInt(created.id))

      expect(deleted.deletedAt).not.toBeNull()

      // Verify it's still in DB but with deletedAt
      const found = await repository.findById(BigInt(created.id))
      expect(found).toBeDefined()
      expect(found!.deletedAt).not.toBeNull()
    })

    it('should throw NotFoundException when deleting non-existent product', async () => {
      const fakeId = BigInt(999999)

      await expect(service.deleteProduct(fakeId)).rejects.toThrow(NotFoundException)
    })
  })

  describe('product not returned after deletion', () => {
    it('should not return deleted products in getPublishedProducts', async () => {
      const created = await service.createProduct({
        categoryId: Number(testCategoryId),
        name: 'test_deleted_product',
        images: ['https://example.com/image.jpg'],
        priceFen: 1000,
        totalStock: 100,
      })

      await service.publishProduct(BigInt(created.id))

      let published = await service.getPublishedProducts()
      let found = published.find((p: any) => p.id === created.id)
      expect(found).toBeDefined()

      await service.deleteProduct(BigInt(created.id))

      published = await service.getPublishedProducts()
      found = published.find((p: any) => p.id === created.id)
      expect(found).toBeUndefined()
    })
  })
})
