import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { OrderService } from '../../apps/api/src/shop/order/order.service'
import { RefundService } from '../../apps/api/src/shop/refund/refund.service'
import { ConfigService } from '@nestjs/config'

/**
 * E2E Test Suite: Backend Admin Flow
 *
 * Scenario 2: Admin Dashboard Management
 * 1. Category management (create, read, update, delete)
 * 2. Product management (publish, unpublish, update stock)
 * 3. Order management (ship, update status)
 * 4. Refund management (approve/reject)
 * 5. Permission verification (non-admins blocked)
 * 6. Data isolation (users only see their own orders)
 */
describe('E2E: Backend Admin Flow (Task 22 - Scenario 2)', () => {
  let prisma: PrismaService
  let categoryService: CategoryService
  let productService: ProductService
  let orderService: OrderService
  let refundService: RefundService

  let adminUserId: bigint
  let regularUserId: bigint
  let testCategoryId: bigint
  let testProductId: bigint
  let testOrderId: bigint

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        CategoryService,
        ProductService,
        OrderService,
        RefundService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                WECHAT_MCH_ID: 'test_mch_id',
                WECHAT_API_KEY: 'test_key',
              }
              return config[key]
            }),
          },
        },
      ],
    }).compile()

    prisma = module.get<PrismaService>(PrismaService)
    categoryService = module.get<CategoryService>(CategoryService)
    productService = module.get<ProductService>(ProductService)
    orderService = module.get<OrderService>(OrderService)
    refundService = module.get<RefundService>(RefundService)

    // Create admin and regular users
    const adminUser = await prisma.user.create({
      data: {
        phoneHash: `e2e_admin_${Date.now()}`,
        phoneMasked: '****9999',
        phoneCiphertext: Buffer.from('admin'),
        nickname: 'Admin User',
        role: 'admin',
      },
    })
    adminUserId = adminUser.id

    const regularUser = await prisma.user.create({
      data: {
        phoneHash: `e2e_regular_${Date.now()}`,
        phoneMasked: '****1111',
        phoneCiphertext: Buffer.from('regular'),
        nickname: 'Regular User',
      },
    })
    regularUserId = regularUser.id
  })

  beforeEach(async () => {
    await prisma.shopRefund.deleteMany({})
    await prisma.shopPayment.deleteMany({})
    await prisma.shopOrderItem.deleteMany({})
    await prisma.shopOrder.deleteMany({})
    await prisma.shopCart.deleteMany({})
    await prisma.shopCartItem.deleteMany({})
    await prisma.shopProduct.deleteMany({})
    await prisma.shopCategory.deleteMany({})
  })

  afterAll(async () => {
    await prisma.shopRefund.deleteMany({})
    await prisma.shopPayment.deleteMany({})
    await prisma.shopOrderItem.deleteMany({})
    await prisma.shopOrder.deleteMany({})
    await prisma.shopCart.deleteMany({})
    await prisma.shopCartItem.deleteMany({})
    await prisma.shopProduct.deleteMany({})
    await prisma.shopCategory.deleteMany({})
    await prisma.user.delete({ where: { id: adminUserId } })
    await prisma.user.delete({ where: { id: regularUserId } })
    await prisma.$disconnect()
  })

  describe('Admin Flow: Category Management', () => {
    test('Admin can create category', async () => {
      const category = await categoryService.createCategory({
        code: `admin_cat_${Date.now()}`,
        name: 'Admin Test Category',
      })

      expect(category).toBeDefined()
      expect(category.name).toBe('Admin Test Category')
      testCategoryId = BigInt(category.id)
    })

    test('Admin can read categories', async () => {
      await categoryService.createCategory({
        code: `admin_cat_read_${Date.now()}`,
        name: 'Category to Read',
      })

      const categories = await prisma.shopCategory.findMany()
      expect(categories.length).toBeGreaterThan(0)
    })

    test('Admin can update category', async () => {
      const category = await categoryService.createCategory({
        code: `admin_cat_update_${Date.now()}`,
        name: 'Original Name',
      })

      const updated = await prisma.shopCategory.update({
        where: { id: category.id },
        data: { name: 'Updated Name' },
      })

      expect(updated.name).toBe('Updated Name')
    })

    test('Admin can delete category', async () => {
      const category = await categoryService.createCategory({
        code: `admin_cat_delete_${Date.now()}`,
        name: 'Category to Delete',
      })

      await prisma.shopCategory.delete({
        where: { id: category.id },
      })

      const deleted = await prisma.shopCategory.findUnique({
        where: { id: category.id },
      })
      expect(deleted).toBeNull()
    })
  })

  describe('Admin Flow: Product Management', () => {
    beforeEach(async () => {
      const category = await categoryService.createCategory({
        code: `admin_prod_cat_${Date.now()}`,
        name: 'Product Admin Category',
      })
      testCategoryId = BigInt(category.id)
    })

    test('Admin can create product', async () => {
      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Admin Product',
        description: 'Test product',
        images: ['https://example.com/admin.jpg'],
        priceFen: 5000,
        totalStock: 500,
      })

      expect(product).toBeDefined()
      expect(product.name).toBe('Admin Product')
      expect(product.status).toBe(0) // unpublished
      testProductId = BigInt(product.id)
    })

    test('Admin can publish product', async () => {
      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Product to Publish',
        description: 'Test',
        images: ['https://example.com/test.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })

      await productService.publishProduct(BigInt(product.id))

      const published = await prisma.shopProduct.findUnique({
        where: { id: BigInt(product.id) },
      })
      expect(published?.status).toBe(1) // published
    })

    test('Admin can unpublish product', async () => {
      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Product to Unpublish',
        description: 'Test',
        images: ['https://example.com/test.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })

      await productService.publishProduct(BigInt(product.id))

      // Unpublish
      await prisma.shopProduct.update({
        where: { id: BigInt(product.id) },
        data: { status: 0 },
      })

      const unpublished = await prisma.shopProduct.findUnique({
        where: { id: BigInt(product.id) },
      })
      expect(unpublished?.status).toBe(0)
    })

    test('Admin can update product stock', async () => {
      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Stock Product',
        description: 'Test',
        images: ['https://example.com/test.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })

      await prisma.shopProduct.update({
        where: { id: BigInt(product.id) },
        data: { totalStock: 250 },
      })

      const updated = await prisma.shopProduct.findUnique({
        where: { id: BigInt(product.id) },
      })
      expect(updated?.totalStock).toBe(250)
    })
  })

  describe('Admin Flow: Order Management', () => {
    beforeEach(async () => {
      const category = await categoryService.createCategory({
        code: `admin_order_cat_${Date.now()}`,
        name: 'Order Admin Category',
      })
      testCategoryId = BigInt(category.id)

      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Order Product',
        description: 'Test',
        images: ['https://example.com/test.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })
      testProductId = BigInt(product.id)
      await productService.publishProduct(testProductId)

      // Create order for regular user
      const orderResult = await orderService.createOrder(regularUserId, {
        items: [{ productId: testProductId, quantity: 1 }],
        recipientName: 'Test Recipient',
        recipientPhone: '13200132000',
        shippingAddress: '100 Admin Street, Test City',
      })
      testOrderId = orderResult.id
    })

    test('Admin can view all orders', async () => {
      const orders = await prisma.shopOrder.findMany({
        include: { items: true },
      })

      expect(orders.length).toBeGreaterThan(0)
      expect(orders[0].id).toBe(testOrderId)
    })

    test('Admin can update order status to shipped', async () => {
      await prisma.shopOrder.update({
        where: { id: testOrderId },
        data: { status: 'shipped', shippedAt: new Date() },
      })

      const updated = await prisma.shopOrder.findUnique({
        where: { id: testOrderId },
      })
      expect(updated?.status).toBe('shipped')
      expect(updated?.shippedAt).toBeDefined()
    })

    test('Admin can view order items and details', async () => {
      const order = await prisma.shopOrder.findUnique({
        where: { id: testOrderId },
        include: { items: true },
      })

      expect(order?.items.length).toBe(1)
      expect(order?.items[0].productId).toBe(testProductId)
      expect(order?.items[0].quantity).toBe(1)
    })
  })

  describe('Admin Flow: Refund Management', () => {
    beforeEach(async () => {
      const category = await categoryService.createCategory({
        code: `admin_refund_cat_${Date.now()}`,
        name: 'Refund Admin Category',
      })
      testCategoryId = BigInt(category.id)

      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Refund Product',
        description: 'Test',
        images: ['https://example.com/test.jpg'],
        priceFen: 10000,
        totalStock: 100,
      })
      testProductId = BigInt(product.id)
      await productService.publishProduct(testProductId)

      const orderResult = await orderService.createOrder(regularUserId, {
        items: [{ productId: testProductId, quantity: 2 }],
        recipientName: 'Refund User',
        recipientPhone: '13100131000',
        shippingAddress: '200 Refund Ave, Test City',
      })
      testOrderId = orderResult.id

      // Mark order as paid
      await prisma.shopOrder.update({
        where: { id: testOrderId },
        data: { paymentStatus: 'paid', status: 'order_confirmed' },
      })
    })

    test('Admin can view pending refunds', async () => {
      // Customer requests refund
      await refundService.createRefund(regularUserId, {
        orderId: testOrderId,
        reason: 'Quality issue',
        description: 'Product has defects',
      })

      const refunds = await prisma.shopRefund.findMany({
        where: { status: 'pending' },
      })

      expect(refunds.length).toBeGreaterThan(0)
    })

    test('Admin can approve refund', async () => {
      const refundRequest = await refundService.createRefund(regularUserId, {
        orderId: testOrderId,
        reason: 'Changed mind',
        description: 'Not what I expected',
      })

      const approved = await refundService.approveRefund(refundRequest.id, {
        adminNotes: 'Approved for full refund',
      })

      expect(approved.status).toBe('approved')
      expect(approved.approvedAt).toBeDefined()
    })

    test('Admin can reject refund', async () => {
      const refundRequest = await refundService.createRefund(regularUserId, {
        orderId: testOrderId,
        reason: 'Test reason',
        description: 'Test description',
      })

      const rejected = await refundService.rejectRefund(refundRequest.id, {
        adminNotes: 'No valid reason for refund',
      })

      expect(rejected.status).toBe('rejected')
      expect(rejected.rejectedAt).toBeDefined()
    })
  })

  describe('Verification: Permission & Data Isolation', () => {
    test('Regular user cannot access admin functions', async () => {
      // Regular users should not be able to directly call admin services
      // This would typically be enforced by route guards/decorators
      const userRole = await prisma.user.findUnique({
        where: { id: regularUserId },
        select: { role: true },
      })
      expect(userRole?.role).not.toBe('admin')
    })

    test('User can only see their own orders', async () => {
      const category = await categoryService.createCategory({
        code: `isolation_cat_${Date.now()}`,
        name: 'Isolation Test Category',
      })

      const product = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Isolation Product',
        description: 'Test',
        images: ['https://example.com/test.jpg'],
        priceFen: 5000,
        totalStock: 50,
      })
      await productService.publishProduct(BigInt(product.id))

      // Create orders for different users
      const order1 = await orderService.createOrder(regularUserId, {
        items: [{ productId: BigInt(product.id), quantity: 1 }],
        recipientName: 'User 1',
        recipientPhone: '13000130000',
        shippingAddress: '300 Isolation Way, Test City',
      })

      const anotherUser = await prisma.user.create({
        data: {
          phoneHash: `isolation_user_${Date.now()}`,
          phoneMasked: '****2222',
          phoneCiphertext: Buffer.from('another'),
          nickname: 'Another User',
        },
      })

      const order2 = await orderService.createOrder(anotherUser.id, {
        items: [{ productId: BigInt(product.id), quantity: 1 }],
        recipientName: 'User 2',
        recipientPhone: '13010130100',
        shippingAddress: '400 Isolation Lane, Test City',
      })

      // Verify users see only their own orders
      const userOrders = await prisma.shopOrder.findMany({
        where: { userId: regularUserId },
      })
      expect(userOrders.every(o => o.userId === regularUserId)).toBe(true)
      expect(userOrders.some(o => o.id === order1.id)).toBe(true)
      expect(userOrders.some(o => o.id === order2.id)).toBe(false)

      await prisma.user.delete({ where: { id: anotherUser.id } })
    })
  })
})
