import { CartService } from '../../apps/api/src/shop/cart/cart.service'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { CartRepository } from '../../apps/api/src/shop/cart/cart.repository'
import { ProductRepository } from '../../apps/api/src/shop/product/product.repository'
import { CategoryRepository } from '../../apps/api/src/shop/category/category.repository'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'

describe('CartService Integration Tests', () => {
  let cartService: CartService
  let productService: ProductService
  let prisma: PrismaService
  let testUserId: bigint
  let testCategoryId: bigint
  let testProductId: bigint

  beforeAll(async () => {
    prisma = new PrismaService()
    const productRepository = new ProductRepository(prisma)
    const categoryRepository = new CategoryRepository(prisma)
    const cartRepository = new CartRepository(prisma)
    productService = new ProductService(productRepository, categoryRepository)
    cartService = new CartService(cartRepository, productRepository)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.shopCartItem.deleteMany({})
    await prisma.shopCart.deleteMany({})
    await prisma.shopProduct.deleteMany({})
    await prisma.shopCategory.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test user
    const user = await prisma.user.create({
      data: {
        phoneHash: `test_cart_user_${Date.now()}`,
        phoneMasked: '****',
        phoneCiphertext: Buffer.from('test'),
        nickname: 'Test Cart User',
      },
    })
    testUserId = user.id

    // Create test category
    const category = await prisma.shopCategory.create({
      data: {
        name: 'Test Category',
        code: `test-cat-${Date.now()}`,
        status: 1,
      },
    })
    testCategoryId = category.id

    // Create test product with good stock
    const product = await prisma.shopProduct.create({
      data: {
        name: 'Test Product',
        categoryId: testCategoryId,
        priceFen: 1000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
        description: 'Test product for cart',
        status: 1,
        images: ['image1.jpg'],
      },
    })
    testProductId = product.id
  })

  afterEach(async () => {
    // Clean up after each test
    await prisma.shopCartItem.deleteMany({})
    await prisma.shopCart.deleteMany({})
    await prisma.shopProduct.deleteMany({})
    await prisma.shopCategory.deleteMany({})
    await prisma.user.deleteMany({})
  })

  // Test 1: Get empty cart (auto-creates if not exists)
  it('should get empty cart and auto-create if not exists', async () => {
    // Arrange
    const userId = testUserId

    // Act
    const cart = await cartService.getCart(userId)

    // Assert
    expect(cart).toBeDefined()
    expect(cart.items).toEqual([])
    expect(cart.totalAmount).toBe(0)
    expect(cart.totalQuantity).toBe(0)
  })

  // Test 2: Add item to cart successfully
  it('should add item to cart successfully', async () => {
    // Arrange
    const userId = testUserId
    const dto = {
      productId: testProductId,
      quantity: 5,
    }

    // Act
    const cart = await cartService.addItem(userId, dto)

    // Assert
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].productId).toBe(testProductId)
    expect(cart.items[0].quantity).toBe(5)
    expect(cart.totalQuantity).toBe(5)
    expect(cart.totalAmount).toBe(5000) // 5 * 1000
  })

  // Test 3: Add item with insufficient stock
  it('should throw BadRequestException when adding item with insufficient stock', async () => {
    // Arrange
    const userId = testUserId
    const dto = {
      productId: testProductId,
      quantity: 150, // More than available (100)
    }

    // Act & Assert
    await expect(cartService.addItem(userId, dto)).rejects.toThrow(
      BadRequestException,
    )
  })

  // Test 4: Add same item twice (should increment quantity)
  it('should increment quantity when adding same item twice', async () => {
    // Arrange
    const userId = testUserId
    const dto1 = { productId: testProductId, quantity: 3 }
    const dto2 = { productId: testProductId, quantity: 2 }

    // Act
    await cartService.addItem(userId, dto1)
    const cart = await cartService.addItem(userId, dto2)

    // Assert
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].quantity).toBe(5)
    expect(cart.totalQuantity).toBe(5)
    expect(cart.totalAmount).toBe(5000)
  })

  // Test 5: Add item to non-existent product
  it('should throw NotFoundException when adding non-existent product', async () => {
    // Arrange
    const userId = testUserId
    const dto = {
      productId: 99999n,
      quantity: 1,
    }

    // Act & Assert
    await expect(cartService.addItem(userId, dto)).rejects.toThrow(
      NotFoundException,
    )
  })

  // Test 6: Update cart item quantity
  it('should update cart item quantity', async () => {
    // Arrange
    const userId = testUserId
    await cartService.addItem(userId, {
      productId: testProductId,
      quantity: 5,
    })

    const cart1 = await cartService.getCart(userId)
    const itemId = cart1.items[0].id

    // Act
    const updatedCart = await cartService.updateItem(userId, itemId, {
      quantity: 10,
    })

    // Assert
    expect(updatedCart.items[0].quantity).toBe(10)
    expect(updatedCart.totalQuantity).toBe(10)
    expect(updatedCart.totalAmount).toBe(10000)
  })

  // Test 7: Update item quantity exceeding stock
  it('should throw BadRequestException when updating quantity exceeds stock', async () => {
    // Arrange
    const userId = testUserId
    await cartService.addItem(userId, {
      productId: testProductId,
      quantity: 5,
    })

    const cart = await cartService.getCart(userId)
    const itemId = cart.items[0].id

    // Act & Assert
    await expect(
      cartService.updateItem(userId, itemId, { quantity: 150 }),
    ).rejects.toThrow(BadRequestException)
  })

  // Test 8: Remove cart item
  it('should remove cart item', async () => {
    // Arrange
    const userId = testUserId
    await cartService.addItem(userId, {
      productId: testProductId,
      quantity: 5,
    })

    const cart1 = await cartService.getCart(userId)
    const itemId = cart1.items[0].id

    // Act
    const updatedCart = await cartService.removeItem(userId, itemId)

    // Assert
    expect(updatedCart.items).toHaveLength(0)
    expect(updatedCart.totalQuantity).toBe(0)
    expect(updatedCart.totalAmount).toBe(0)
  })

  // Test 9: Clear all cart items
  it('should clear all cart items', async () => {
    // Arrange
    const userId = testUserId
    await cartService.addItem(userId, {
      productId: testProductId,
      quantity: 5,
    })

    // Act
    const clearedCart = await cartService.clearCart(userId)

    // Assert
    expect(clearedCart.items).toHaveLength(0)
    expect(clearedCart.totalQuantity).toBe(0)
    expect(clearedCart.totalAmount).toBe(0)
  })

  // Test 10: Get cart returns correct totalAmount and totalQuantity
  it('should return correct totalAmount and totalQuantity', async () => {
    // Arrange
    const userId = testUserId

    // Create another product for multiple items
    const product2 = await prisma.shopProduct.create({
      data: {
        name: 'Product 2',
        categoryId: testCategoryId,
        priceFen: 2000,
        totalStock: 50,
        reservedStock: 0,
        soldStock: 0,
        status: 1,
        images: [],
      },
    })

    // Act
    await cartService.addItem(userId, {
      productId: testProductId,
      quantity: 3,
    })
    await cartService.addItem(userId, {
      productId: product2.id,
      quantity: 2,
    })

    const cart = await cartService.getCart(userId)

    // Assert
    expect(cart.items).toHaveLength(2)
    expect(cart.totalQuantity).toBe(5) // 3 + 2
    expect(cart.totalAmount).toBe(7000) // (3 * 1000) + (2 * 2000)
  })

  // Test 11: Remove item for wrong user should fail
  it('should throw error when removing item for wrong user', async () => {
    // Arrange
    const userId = testUserId
    await cartService.addItem(userId, {
      productId: testProductId,
      quantity: 5,
    })

    const cart = await cartService.getCart(userId)
    const itemId = cart.items[0].id

    // Create another user
    const otherUser = await prisma.user.create({
      data: {
        phoneHash: `other_user_${Date.now()}`,
        phoneMasked: '****',
        phoneCiphertext: Buffer.from('test'),
        nickname: 'Other User',
      },
    })

    // Act & Assert
    await expect(
      cartService.removeItem(otherUser.id, itemId),
    ).rejects.toThrow(NotFoundException)

    // Cleanup
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})
