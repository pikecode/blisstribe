import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { CartService } from '../../apps/api/src/shop/cart/cart.service'
import { OrderService } from '../../apps/api/src/shop/order/order.service'
import { PaymentService } from '../../apps/api/src/shop/payment/payment.service'
import { ConfigService } from '@nestjs/config'

/**
 * Performance Test Suite
 * Verifies response times meet requirements:
 * - Homepage load < 2s
 * - List pagination < 1s
 * - Payment flow < 3s
 */
describe('E2E: Performance Verification (Task 22)', () => {
  let prisma: PrismaService
  let categoryService: CategoryService
  let productService: ProductService
  let cartService: CartService
  let orderService: OrderService
  let paymentService: PaymentService

  let testUserId: bigint
  let testCategoryId: bigint
  let testProductIds: bigint[] = []

  // Performance thresholds
  const HOMEPAGE_LOAD_THRESHOLD_MS = 2000
  const LIST_PAGINATION_THRESHOLD_MS = 1000
  const PAYMENT_FLOW_THRESHOLD_MS = 3000

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        CategoryService,
        ProductService,
        CartService,
        OrderService,
        PaymentService,
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
    cartService = module.get<CartService>(CartService)
    orderService = module.get<OrderService>(OrderService)
    paymentService = module.get<PaymentService>(PaymentService)

    // Create test user
    const user = await prisma.user.create({
      data: {
        phoneHash: `perf_user_${Date.now()}`,
        phoneMasked: '****5555',
        phoneCiphertext: Buffer.from('perf'),
        nickname: 'Performance Test User',
      },
    })
    testUserId = user.id
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

    // Create test category
    const category = await categoryService.createCategory({
      code: `perf_cat_${Date.now()}`,
      name: 'Performance Test Category',
    })
    testCategoryId = BigInt(category.id)

    // Create multiple test products for pagination testing
    testProductIds = []
    for (let i = 0; i < 50; i++) {
      const product = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: `Performance Product ${i}`,
        description: `Test product ${i}`,
        images: [`https://example.com/perf-${i}.jpg`],
        priceFen: 10000 + i * 1000,
        totalStock: 1000,
      })
      await productService.publishProduct(BigInt(product.id))
      testProductIds.push(BigInt(product.id))
    }
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
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('Performance: Homepage Load', () => {
    test('Category list loads within threshold', async () => {
      const startTime = Date.now()

      const categories = await prisma.shopCategory.findMany()

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Category list load: ${duration}ms (threshold: ${HOMEPAGE_LOAD_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(HOMEPAGE_LOAD_THRESHOLD_MS)
      expect(categories.length).toBeGreaterThan(0)
    })

    test('Featured products load within threshold', async () => {
      const startTime = Date.now()

      const products = await prisma.shopProduct.findMany({
        where: {
          status: 1,
          deletedAt: null,
        },
        take: 10,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Featured products load: ${duration}ms (threshold: ${HOMEPAGE_LOAD_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(HOMEPAGE_LOAD_THRESHOLD_MS)
      expect(products.length).toBeGreaterThan(0)
    })

    test('Category with products load within threshold', async () => {
      const startTime = Date.now()

      const category = await prisma.shopCategory.findUnique({
        where: { id: testCategoryId },
      })

      const products = await prisma.shopProduct.findMany({
        where: {
          categoryId: testCategoryId,
          status: 1,
        },
        take: 20,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Category with products load: ${duration}ms (threshold: ${HOMEPAGE_LOAD_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(HOMEPAGE_LOAD_THRESHOLD_MS)
      expect(category).toBeDefined()
      expect(products.length).toBeGreaterThan(0)
    })
  })

  describe('Performance: List Pagination', () => {
    test('First page load within threshold', async () => {
      const startTime = Date.now()

      const products = await prisma.shopProduct.findMany({
        where: {
          categoryId: testCategoryId,
          status: 1,
        },
        skip: 0,
        take: 20,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`First page load: ${duration}ms (threshold: ${LIST_PAGINATION_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(LIST_PAGINATION_THRESHOLD_MS)
      expect(products.length).toBe(20)
    })

    test('Middle page load within threshold', async () => {
      const startTime = Date.now()

      const products = await prisma.shopProduct.findMany({
        where: {
          categoryId: testCategoryId,
          status: 1,
        },
        skip: 20,
        take: 20,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Middle page load: ${duration}ms (threshold: ${LIST_PAGINATION_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(LIST_PAGINATION_THRESHOLD_MS)
      expect(products.length).toBe(20)
    })

    test('Last page load within threshold', async () => {
      const startTime = Date.now()

      const products = await prisma.shopProduct.findMany({
        where: {
          categoryId: testCategoryId,
          status: 1,
        },
        skip: 40,
        take: 20,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Last page load: ${duration}ms (threshold: ${LIST_PAGINATION_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(LIST_PAGINATION_THRESHOLD_MS)
      expect(products.length).toBeGreaterThan(0)
    })

    test('Search/filter within threshold', async () => {
      const startTime = Date.now()

      const products = await prisma.shopProduct.findMany({
        where: {
          categoryId: testCategoryId,
          status: 1,
          name: { contains: 'Product 1' },
        },
        skip: 0,
        take: 20,
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Search results load: ${duration}ms (threshold: ${LIST_PAGINATION_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(LIST_PAGINATION_THRESHOLD_MS)
    })
  })

  describe('Performance: Payment Flow', () => {
    test('Order creation within threshold', async () => {
      const startTime = Date.now()

      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductIds[0], quantity: 2 }],
        recipientName: 'Perf Test User',
        recipientPhone: '13900139900',
        shippingAddress: '555 Perf St, Test City',
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Order creation: ${duration}ms (threshold: ${PAYMENT_FLOW_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(PAYMENT_FLOW_THRESHOLD_MS)
      expect(order).toBeDefined()
    })

    test('Payment callback processing within threshold', async () => {
      // Create order first
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductIds[1], quantity: 1 }],
        recipientName: 'Payment Test',
        recipientPhone: '13800138800',
        shippingAddress: '666 Payment Ave, Test City',
      })

      const startTime = Date.now()

      // Simulate payment callback
      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `perf_txn_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Payment callback processing: ${duration}ms (threshold: ${PAYMENT_FLOW_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(PAYMENT_FLOW_THRESHOLD_MS)
    })

    test('Cart operations within threshold', async () => {
      const startTime = Date.now()

      await cartService.addToCart(testUserId, {
        productId: testProductIds[2],
        quantity: 1,
      })

      await cartService.updateCartItemQuantity(testUserId, testProductIds[2], 3)

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Cart operations: ${duration}ms (threshold: ${PAYMENT_FLOW_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(PAYMENT_FLOW_THRESHOLD_MS)
    })

    test('Order query within threshold', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductIds[3], quantity: 1 }],
        recipientName: 'Query Test',
        recipientPhone: '13700137700',
        shippingAddress: '777 Query Lane, Test City',
      })

      const startTime = Date.now()

      const retrievedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
        include: { items: true },
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`Order query: ${duration}ms (threshold: ${PAYMENT_FLOW_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(PAYMENT_FLOW_THRESHOLD_MS)
      expect(retrievedOrder).toBeDefined()
    })
  })

  describe('Performance: Concurrent Operations', () => {
    test('Multiple concurrent cart additions within threshold', async () => {
      const startTime = Date.now()

      const promises = testProductIds.slice(0, 10).map(productId =>
        cartService.addToCart(testUserId, {
          productId,
          quantity: 1,
        })
      )

      await Promise.all(promises)

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`10 concurrent cart additions: ${duration}ms (threshold: ${PAYMENT_FLOW_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(PAYMENT_FLOW_THRESHOLD_MS)
    })

    test('Multiple concurrent order queries within threshold', async () => {
      // Create multiple orders
      const orders = []
      for (let i = 0; i < 5; i++) {
        const order = await orderService.createOrder(testUserId, {
          items: [{ productId: testProductIds[i], quantity: 1 }],
          recipientName: `User ${i}`,
          recipientPhone: `1370013${700 + i}`,
          shippingAddress: `${i} Concurrent Way, Test City`,
        })
        orders.push(order)
      }

      const startTime = Date.now()

      const promises = orders.map(order =>
        prisma.shopOrder.findUnique({
          where: { id: order.id },
          include: { items: true },
        })
      )

      await Promise.all(promises)

      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`5 concurrent order queries: ${duration}ms (threshold: ${PAYMENT_FLOW_THRESHOLD_MS}ms)`)
      expect(duration).toBeLessThan(PAYMENT_FLOW_THRESHOLD_MS)
    })
  })
})
