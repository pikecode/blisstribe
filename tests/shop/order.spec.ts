import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { OrderService } from '../../apps/api/src/shop/order/order.service'
import { OrderRepository } from '../../apps/api/src/shop/order/order.repository'
import { OrderNoGenerator } from '../../apps/api/src/shop/order/order-no.generator'
import { CartService } from '../../apps/api/src/shop/cart/cart.service'
import { CartRepository } from '../../apps/api/src/shop/cart/cart.repository'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { ProductRepository } from '../../apps/api/src/shop/product/product.repository'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { CategoryRepository } from '../../apps/api/src/shop/category/category.repository'
import { PrismaService } from '../../apps/api/src/common/prisma.service'

describe('OrderService', () => {
  let orderService: OrderService
  let orderRepository: OrderRepository
  let cartService: CartService
  let cartRepository: CartRepository
  let productService: ProductService
  let categoryService: CategoryService
  let prisma: any

  let testUserId: bigint
  let testCategoryId: bigint
  let testProductId: bigint

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        OrderRepository,
        CartService,
        CartRepository,
        ProductService,
        ProductRepository,
        CategoryService,
        CategoryRepository,
        PrismaService,
      ],
    }).compile()

    orderService = module.get<OrderService>(OrderService)
    orderRepository = module.get<OrderRepository>(OrderRepository)
    cartService = module.get<CartService>(CartService)
    cartRepository = module.get<CartRepository>(CartRepository)
    productService = module.get<ProductService>(ProductService)
    categoryService = module.get<CategoryService>(CategoryService)
    prisma = module.get<PrismaService>(PrismaService)

    // Create test user
    const user = await prisma.user.create({
      data: {
        phoneHash: `test_order_user_${Date.now()}`,
        phoneMasked: '****',
        phoneCiphertext: Buffer.from('test'),
        nickname: 'Test Order User',
      },
    })
    testUserId = user.id

    // Create test category via service
    const category = await categoryService.createCategory({
      code: `test_order_category_${Date.now()}`,
      name: 'Test Order Category',
    })
    testCategoryId = BigInt(category.id)

    // Create test product with stock via service
    const product = await productService.createProduct({
      categoryId: Number(testCategoryId),
      name: `test_order_product_${Date.now()}`,
      images: ['https://example.com/image.jpg'],
      priceFen: 10000,
      totalStock: 100,
    })
    testProductId = BigInt(product.id)

    // Publish the product
    await productService.publishProduct(testProductId)
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.shopOrder.deleteMany()
    await prisma.shopOrderItem.deleteMany()
    await prisma.shopCart.deleteMany()
    await prisma.shopCartItem.deleteMany()
  })

  afterAll(async () => {
    // Clean up all test data
    await prisma.shopOrder.deleteMany()
    await prisma.shopOrderItem.deleteMany()
    await prisma.shopCart.deleteMany()
    await prisma.shopCartItem.deleteMany()
    await prisma.shopProduct.deleteMany()
    await prisma.shopCategory.deleteMany()
    await prisma.user.delete({ where: { id: testUserId } })
  })

  describe('createOrder', () => {
    it('should create order successfully with valid items', async () => {
      // Arrange
      const dto = {
        items: [
          {
            productId: Number(testProductId),
            quantity: 5,
            priceInFen: 10000,
          },
        ],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
        remark: 'Please deliver ASAP',
      }

      // Act
      const order = await orderService.createOrder(testUserId, dto)

      // Assert
      expect(order).toBeDefined()
      expect(order.orderNo).toMatch(/^SHOP-\d{14}-[A-Z0-9]{6}$/)
      expect(order.status).toBe('pending_payment')
      expect(order.paymentStatus).toBe('unpaid')
      expect(order.fulfillmentStatus).toBe('pending')
      expect(order.items).toHaveLength(1)
      expect(order.items[0].quantity).toBe(5)
      expect(order.totalAmountFen).toBe(50000n)
      expect(order.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should throw BadRequestException for incomplete receiver info', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: '',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act & Assert
      await expect(orderService.createOrder(testUserId, dto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException for empty items array', async () => {
      // Arrange
      const dto = {
        items: [],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act & Assert
      await expect(orderService.createOrder(testUserId, dto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw NotFoundException for non-existent product', async () => {
      // Arrange
      const dto = {
        items: [{ productId: 99999, quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act & Assert
      await expect(orderService.createOrder(testUserId, dto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException for unpublished product', async () => {
      // Arrange
      const unpublishedProduct = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: `unpublished_product_${Date.now()}`,
        images: ['https://example.com/image.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })

      const dto = {
        items: [{ productId: unpublishedProduct.id, quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act & Assert
      await expect(orderService.createOrder(testUserId, dto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException for deleted product', async () => {
      // Arrange
      const deletedProduct = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: `deleted_product_${Date.now()}`,
        images: ['https://example.com/image.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(deletedProduct.id))

      // Delete the product
      await prisma.shopProduct.update({
        where: { id: BigInt(deletedProduct.id) },
        data: { deletedAt: new Date() },
      })

      const dto = {
        items: [{ productId: deletedProduct.id, quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act & Assert
      await expect(orderService.createOrder(testUserId, dto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException for insufficient stock', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 200, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act & Assert
      await expect(orderService.createOrder(testUserId, dto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should reserve stock correctly in transaction', async () => {
      // Arrange
      const quantityToOrder = 10
      const dto = {
        items: [{ productId: Number(testProductId), quantity: quantityToOrder, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Get initial stock
      const initialProduct = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })

      // Act
      await orderService.createOrder(testUserId, dto)

      // Assert
      const updatedProduct = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(updatedProduct.reservedStock).toBe(
        initialProduct.reservedStock + quantityToOrder
      )
    })

    it('should clear shopping cart after successful order creation', async () => {
      // Arrange
      await prisma.shopCart.create({
        data: {
          userId: testUserId,
          items: {
            create: [
              {
                productId: testProductId,
                quantity: 5,
              },
            ],
          },
        },
      })

      const dto = {
        items: [{ productId: Number(testProductId), quantity: 5, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act
      const order = await orderService.createOrder(testUserId, dto)

      // Assert
      const remainingCart = await prisma.shopCart.findMany({
        where: { userId: testUserId },
      })
      expect(remainingCart).toHaveLength(0)
    })

    it('should generate unique orderNo with correct format', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act
      const order1 = await orderService.createOrder(testUserId, dto)

      // Create new product for second order
      const product2 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: `test_order_product_2_${Date.now()}`,
        images: ['https://example.com/image.jpg'],
        priceFen: 5000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product2.id))

      const dto2 = {
        items: [{ productId: product2.id, quantity: 1, priceInFen: 5000 }],
        recipientName: 'Jane Doe',
        recipientPhone: '13800138001',
        shippingAddress: '456 Oak St',
      }

      const order2 = await orderService.createOrder(testUserId, dto2)

      // Assert
      expect(order1.orderNo).toMatch(/^SHOP-\d{14}-[A-Z0-9]{6}$/)
      expect(order2.orderNo).toMatch(/^SHOP-\d{14}-[A-Z0-9]{6}$/)
      expect(order1.orderNo).not.toBe(order2.orderNo)
    })

    it('should set expiresAt to 15 minutes in future', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }

      // Act
      const beforeTime = Date.now()
      const order = await orderService.createOrder(testUserId, dto)
      const afterTime = Date.now()

      // Assert
      const expectedMin = beforeTime + 15 * 60 * 1000
      const expectedMax = afterTime + 15 * 60 * 1000
      expect(order.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000)
      expect(order.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax + 1000)
    })
  })

  describe('getOrderDetail', () => {
    it('should get order detail for owner', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }
      const order = await orderService.createOrder(testUserId, dto)

      // Act
      const retrieved = await orderService.getOrderDetail(order.id, testUserId)

      // Assert
      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe(order.id)
      expect(retrieved.userId).toBe(testUserId)
    })

    it('should throw NotFoundException for non-existent order', async () => {
      // Act & Assert
      await expect(
        orderService.getOrderDetail(BigInt(99999), testUserId)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException when accessing other user orders', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }
      const order = await orderService.createOrder(testUserId, dto)

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
        orderService.getOrderDetail(order.id, otherUser.id)
      ).rejects.toThrow(BadRequestException)

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('cancelOrder', () => {
    it('should cancel pending order and release reserved stock', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 10, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }
      const order = await orderService.createOrder(testUserId, dto)

      const productBefore = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })

      // Act
      const cancelled = await orderService.cancelOrder(order.id, testUserId)

      // Assert
      expect(cancelled).toBeDefined()
      expect(cancelled?.status).toBe('cancelled')
      expect(cancelled?.cancelReason).toBe('User cancelled')

      const productAfter = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(productAfter.reservedStock).toBe(
        productBefore.reservedStock - 10
      )
    })

    it('should throw BadRequestException for non-pending order', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }
      const order = await orderService.createOrder(testUserId, dto)

      // Change order status to completed
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: 'completed' },
      })

      // Act & Assert
      await expect(
        orderService.cancelOrder(order.id, testUserId)
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when cancelling other user orders', async () => {
      // Arrange
      const dto = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }
      const order = await orderService.createOrder(testUserId, dto)

      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          phoneHash: `other_user_cancel_${Date.now()}`,
          phoneMasked: '****',
          phoneCiphertext: Buffer.from('test'),
          nickname: 'Other User',
        },
      })

      // Act & Assert
      await expect(
        orderService.cancelOrder(order.id, otherUser.id)
      ).rejects.toThrow(BadRequestException)

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('getUserOrders', () => {
    it('should get user orders with pagination', async () => {
      // Arrange
      const product2 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: `test_product_2_${Date.now()}`,
        images: ['https://example.com/image.jpg'],
        priceFen: 5000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product2.id))

      const dto1 = {
        items: [{ productId: Number(testProductId), quantity: 1, priceInFen: 10000 }],
        recipientName: 'John Doe',
        recipientPhone: '13800138000',
        shippingAddress: '123 Main St',
      }
      const dto2 = {
        items: [{ productId: product2.id, quantity: 1, priceInFen: 5000 }],
        recipientName: 'Jane Doe',
        recipientPhone: '13800138001',
        shippingAddress: '456 Oak St',
      }

      await orderService.createOrder(testUserId, dto1)
      await orderService.createOrder(testUserId, dto2)

      // Act
      const result = await orderService.getUserOrders(testUserId, {
        limit: 20,
        page: 1,
      })

      // Assert
      expect(result.orders).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('OrderNoGenerator', () => {
    it('should generate valid order number format', () => {
      // Act
      const orderNo = OrderNoGenerator.generate()

      // Assert
      expect(orderNo).toMatch(/^SHOP-\d{14}-[A-Z0-9]{6}$/)
    })

    it('should generate unique order numbers', () => {
      // Act
      const orderNo1 = OrderNoGenerator.generate()
      const orderNo2 = OrderNoGenerator.generate()

      // Assert
      expect(orderNo1).not.toBe(orderNo2)
    })
  })
})
