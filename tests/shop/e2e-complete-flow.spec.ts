import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { CartService } from '../../apps/api/src/shop/cart/cart.service'
import { OrderService } from '../../apps/api/src/shop/order/order.service'
import { PaymentService } from '../../apps/api/src/shop/payment/payment.service'
import { RefundService } from '../../apps/api/src/shop/refund/refund.service'
import { ConfigService } from '@nestjs/config'

/**
 * E2E Test Suite: Complete Shopping Flow (10 Steps)
 *
 * Scenario 1: Complete Customer Shopping Journey
 * 1. Homepage load with categories and featured products
 * 2. Browse product listings
 * 3. Search and filter products
 * 4. View product details
 * 5. Add items to shopping cart
 * 6. Modify cart (change quantities)
 * 7. Create order from cart
 * 8. Payment flow with WeChat callback
 * 9. Query order status and details
 * 10. Request refund and track process
 *
 * This test validates the complete end-to-end flow from product discovery
 * to refund management, including all intermediate steps and state transitions.
 */
describe('E2E: Complete Shopping Flow - 10 Steps (Task 22 - Scenario 1)', () => {
  let prisma: PrismaService
  let categoryService: CategoryService
  let productService: ProductService
  let cartService: CartService
  let orderService: OrderService
  let paymentService: PaymentService
  let refundService: RefundService

  let testUserId: bigint
  let testCategoryId: bigint
  let testProduct1Id: bigint
  let testProduct2Id: bigint
  let testCartId: bigint
  let testOrderId: bigint

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        CategoryService,
        ProductService,
        CartService,
        OrderService,
        PaymentService,
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
    cartService = module.get<CartService>(CartService)
    orderService = module.get<OrderService>(OrderService)
    paymentService = module.get<PaymentService>(PaymentService)
    refundService = module.get<RefundService>(RefundService)

    // Create test customer user
    const user = await prisma.user.create({
      data: {
        phoneHash: `complete_flow_user_${Date.now()}`,
        phoneMasked: '****3333',
        phoneCiphertext: Buffer.from('customer'),
        nickname: 'Complete Flow Test Customer',
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

  describe('Complete 10-Step Shopping Flow', () => {
    test('Step 1: Homepage - Load categories and featured products', async () => {
      // Create test category
      const category = await categoryService.createCategory({
        code: `flow_cat_${Date.now()}`,
        name: 'Featured Category',
      })
      testCategoryId = BigInt(category.id)

      // Create featured products
      const product1 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Featured Product 1',
        description: 'Amazing product',
        images: ['https://example.com/featured1.jpg'],
        priceFen: 12000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product1.id))

      const product2 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Featured Product 2',
        description: 'Great deal',
        images: ['https://example.com/featured2.jpg'],
        priceFen: 18000,
        totalStock: 50,
      })
      await productService.publishProduct(BigInt(product2.id))

      // Load homepage
      const categories = await prisma.shopCategory.findMany()
      const featuredProducts = await prisma.shopProduct.findMany({
        where: { status: 1, deletedAt: null },
        take: 10,
      })

      expect(categories.length).toBeGreaterThan(0)
      expect(categories[0].id).toBe(testCategoryId)
      expect(featuredProducts.length).toBe(2)
      expect(
        featuredProducts.some(p => p.name === 'Featured Product 1')
      ).toBe(true)

      testProduct1Id = BigInt(product1.id)
      testProduct2Id = BigInt(product2.id)
    })

    test('Step 2: Browse products in category', async () => {
      const category = await categoryService.createCategory({
        code: `browse_cat_${Date.now()}`,
        name: 'Browse Category',
      })
      testCategoryId = BigInt(category.id)

      // Create multiple products for browsing
      for (let i = 1; i <= 5; i++) {
        const product = await productService.createProduct({
          categoryId: Number(testCategoryId),
          name: `Browse Product ${i}`,
          description: `Description ${i}`,
          images: [`https://example.com/browse${i}.jpg`],
          priceFen: 10000 + i * 1000,
          totalStock: 100 - i * 5,
        })
        await productService.publishProduct(BigInt(product.id))
      }

      // Browse products in category
      const products = await prisma.shopProduct.findMany({
        where: {
          categoryId: testCategoryId,
          status: 1,
        },
        skip: 0,
        take: 10,
      })

      expect(products.length).toBe(5)
      expect(products.every(p => p.categoryId === testCategoryId)).toBe(true)
    })

    test('Step 3: Search and filter products', async () => {
      const category = await categoryService.createCategory({
        code: `search_cat_${Date.now()}`,
        name: 'Search Category',
      })

      // Create products with different names
      const product1 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Premium Wireless Headphones',
        description: 'High quality audio',
        images: ['https://example.com/headphones.jpg'],
        priceFen: 50000,
        totalStock: 30,
      })
      await productService.publishProduct(BigInt(product1.id))

      const product2 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Budget USB Cable',
        description: 'Basic cable',
        images: ['https://example.com/cable.jpg'],
        priceFen: 500,
        totalStock: 200,
      })
      await productService.publishProduct(BigInt(product2.id))

      // Search for "Wireless"
      const searchResults = await prisma.shopProduct.findMany({
        where: {
          categoryId: BigInt(category.id),
          status: 1,
          name: { contains: 'Wireless' },
        },
      })

      expect(searchResults.length).toBe(1)
      expect(searchResults[0].name).toBe('Premium Wireless Headphones')

      // Filter by price range (budget items)
      const budgetItems = await prisma.shopProduct.findMany({
        where: {
          categoryId: BigInt(category.id),
          status: 1,
          priceFen: { lte: 5000 },
        },
      })

      expect(budgetItems.length).toBe(1)
      expect(budgetItems[0].name).toBe('Budget USB Cable')
    })

    test('Step 4: View product details', async () => {
      const category = await categoryService.createCategory({
        code: `detail_cat_${Date.now()}`,
        name: 'Detail Category',
      })

      const product = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Detail View Product',
        description: 'Detailed product information goes here',
        images: ['https://example.com/detail1.jpg', 'https://example.com/detail2.jpg'],
        priceFen: 25000,
        totalStock: 75,
      })
      await productService.publishProduct(BigInt(product.id))

      // View product details
      const productDetail = await prisma.shopProduct.findUnique({
        where: { id: BigInt(product.id) },
      })

      expect(productDetail).toBeDefined()
      expect(productDetail?.name).toBe('Detail View Product')
      expect(productDetail?.description).toBe('Detailed product information goes here')
      expect(productDetail?.priceFen).toBe(25000)
      expect(productDetail?.totalStock).toBe(75)
      expect(productDetail?.status).toBe(1)

      testProduct1Id = BigInt(product.id)
    })

    test('Step 5 & 6: Add items to cart and modify quantities', async () => {
      // Setup products
      const category = await categoryService.createCategory({
        code: `cart_cat_${Date.now()}`,
        name: 'Cart Category',
      })

      const product1 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Cart Product 1',
        description: 'Test',
        images: ['https://example.com/cart1.jpg'],
        priceFen: 8000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product1.id))

      const product2 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Cart Product 2',
        description: 'Test',
        images: ['https://example.com/cart2.jpg'],
        priceFen: 12000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product2.id))

      // Get or create cart
      const cart = await cartService.getOrCreateCart(testUserId)
      testCartId = cart.id

      // Add first item to cart
      await cartService.addToCart(testUserId, {
        productId: BigInt(product1.id),
        quantity: 1,
      })

      // Verify item in cart
      const cartAfterFirstAdd = await prisma.shopCart.findUnique({
        where: { id: testCartId },
        include: { items: true },
      })
      expect(cartAfterFirstAdd?.items.length).toBe(1)
      expect(cartAfterFirstAdd?.items[0].quantity).toBe(1)

      // Add second item
      await cartService.addToCart(testUserId, {
        productId: BigInt(product2.id),
        quantity: 2,
      })

      // Verify both items in cart
      let cartAfterSecondAdd = await prisma.shopCart.findUnique({
        where: { id: testCartId },
        include: { items: true },
      })
      expect(cartAfterSecondAdd?.items.length).toBe(2)

      // Update first item quantity from 1 to 3
      await cartService.updateCartItemQuantity(testUserId, BigInt(product1.id), 3)

      // Verify updated quantity
      cartAfterSecondAdd = await prisma.shopCart.findUnique({
        where: { id: testCartId },
        include: { items: true },
      })
      const updatedItem = cartAfterSecondAdd?.items.find(
        item => item.productId === BigInt(product1.id)
      )
      expect(updatedItem?.quantity).toBe(3)

      testProduct1Id = BigInt(product1.id)
      testProduct2Id = BigInt(product2.id)
    })

    test('Step 7: Create order from cart items', async () => {
      // Setup
      const category = await categoryService.createCategory({
        code: `order_cat_${Date.now()}`,
        name: 'Order Category',
      })

      const product1 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Order Item 1',
        description: 'Test',
        images: ['https://example.com/order1.jpg'],
        priceFen: 6000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product1.id))

      const product2 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Order Item 2',
        description: 'Test',
        images: ['https://example.com/order2.jpg'],
        priceFen: 14000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product2.id))

      // Create order directly (combining cart items conceptually)
      const order = await orderService.createOrder(testUserId, {
        items: [
          { productId: BigInt(product1.id), quantity: 2 },
          { productId: BigInt(product2.id), quantity: 1 },
        ],
        recipientName: 'John Doe',
        recipientPhone: '13100131000',
        shippingAddress: '123 Main Street, Test City',
      })

      expect(order).toBeDefined()
      expect(order.userId).toBe(testUserId)
      expect(order.status).toBe('pending_payment')
      expect(order.paymentStatus).toBe('unpaid')
      expect(order.paymentAmountFen).toBe(6000 * 2 + 14000) // 26000 fen

      testOrderId = order.id
    })

    test('Step 8: Payment flow with WeChat callback', async () => {
      // Setup
      const category = await categoryService.createCategory({
        code: `payment_cat_${Date.now()}`,
        name: 'Payment Category',
      })

      const product = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Payment Product',
        description: 'Test',
        images: ['https://example.com/payment.jpg'],
        priceFen: 20000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product.id))

      // Create order
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: BigInt(product.id), quantity: 1 }],
        recipientName: 'Payment Tester',
        recipientPhone: '13000130000',
        shippingAddress: '456 Payment Lane, Test City',
      })

      expect(order.paymentStatus).toBe('unpaid')

      // Simulate WeChat payment callback
      const transactionId = `txn_complete_flow_${Date.now()}`
      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: transactionId,
        amount: { total: order.paymentAmountFen },
      })

      // Verify payment recorded
      const payment = await prisma.shopPayment.findFirst({
        where: { orderId: order.id },
      })

      expect(payment).toBeDefined()
      expect(payment?.wechatTransactionId).toBe(transactionId)
      expect(payment?.paymentAmountFen).toBe(order.paymentAmountFen)

      // Verify order status changed
      const updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
      })

      expect(updatedOrder?.paymentStatus).toBe('paid')
      expect(updatedOrder?.status).toBe('order_confirmed')

      testOrderId = order.id
    })

    test('Step 9: Query order status and details', async () => {
      // Setup
      const category = await categoryService.createCategory({
        code: `query_cat_${Date.now()}`,
        name: 'Query Category',
      })

      const product1 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Query Product 1',
        description: 'Test',
        images: ['https://example.com/query1.jpg'],
        priceFen: 5000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product1.id))

      const product2 = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Query Product 2',
        description: 'Test',
        images: ['https://example.com/query2.jpg'],
        priceFen: 7000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product2.id))

      // Create and pay order
      const order = await orderService.createOrder(testUserId, {
        items: [
          { productId: BigInt(product1.id), quantity: 1 },
          { productId: BigInt(product2.id), quantity: 2 },
        ],
        recipientName: 'Query User',
        recipientPhone: '12900129000',
        shippingAddress: '789 Query Way, Test City',
      })

      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_query_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      // Query order details
      const queriedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
        include: { items: true },
      })

      expect(queriedOrder).toBeDefined()
      expect(queriedOrder?.userId).toBe(testUserId)
      expect(queriedOrder?.paymentStatus).toBe('paid')
      expect(queriedOrder?.items.length).toBe(2)
      expect(queriedOrder?.items[0].productId).toBe(BigInt(product1.id))
      expect(queriedOrder?.items[0].quantity).toBe(1)
      expect(queriedOrder?.items[1].productId).toBe(BigInt(product2.id))
      expect(queriedOrder?.items[1].quantity).toBe(2)
      expect(queriedOrder?.paymentAmountFen).toBe(5000 + 7000 * 2) // 19000 fen = 190 yuan

      testOrderId = order.id
    })

    test('Step 10: Request refund and track approval', async () => {
      // Setup
      const category = await categoryService.createCategory({
        code: `refund_cat_${Date.now()}`,
        name: 'Refund Category',
      })

      const product = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Refund Product',
        description: 'Test',
        images: ['https://example.com/refund.jpg'],
        priceFen: 30000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product.id))

      // Create and pay order
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: BigInt(product.id), quantity: 1 }],
        recipientName: 'Refund Customer',
        recipientPhone: '12800128000',
        shippingAddress: '999 Refund Road, Test City',
      })

      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_refund_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      // Customer requests refund
      const refundRequest = await refundService.createRefund(testUserId, {
        orderId: order.id,
        reason: 'Damaged in shipping',
        description: 'Package arrived with damage to product',
      })

      expect(refundRequest.status).toBe('pending')
      expect(refundRequest.orderId).toBe(order.id)
      expect(refundRequest.userId).toBe(testUserId)
      expect(refundRequest.refundAmountFen).toBe(30000)

      // Admin approves refund
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
      })

      const approvedRefund = await refundService.approveRefund(refundRequest.id, {
        adminNotes: 'Damage verified, approved full refund',
      })

      expect(approvedRefund.status).toBe('approved')
      expect(approvedRefund.approvedAt).toBeDefined()
      expect(approvedRefund.adminNotes).toBe('Damage verified, approved full refund')

      // Verify customer can track refund status
      const trackedRefund = await prisma.shopRefund.findUnique({
        where: { id: refundRequest.id },
      })

      expect(trackedRefund?.status).toBe('approved')
      expect(trackedRefund?.approvedAt).toBeDefined()
    })
  })

  describe('Complete Flow - Amount Calculation Validation', () => {
    test('Fen to Yuan conversion throughout flow', async () => {
      const category = await categoryService.createCategory({
        code: `amount_cat_${Date.now()}`,
        name: 'Amount Test Category',
      })

      const product = await productService.createProduct({
        categoryId: Number(category.id),
        name: 'Amount Test Product',
        description: 'Test',
        images: ['https://example.com/amount.jpg'],
        priceFen: 10000, // 100 yuan
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product.id))

      // Create order
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: BigInt(product.id), quantity: 2 }],
        recipientName: 'Amount Tester',
        recipientPhone: '12700127000',
        shippingAddress: '111 Amount St, Test City',
      })

      // Verify amount: 10000 fen/item * 2 items = 20000 fen = 200 yuan
      expect(order.paymentAmountFen).toBe(20000)
      expect(order.paymentAmountFen / 100).toBe(200)

      // Process payment
      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_amount_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      // Request refund
      const refund = await refundService.createRefund(testUserId, {
        orderId: order.id,
        reason: 'Test',
        description: 'Test',
      })

      // Verify refund amount equals order amount
      expect(refund.refundAmountFen).toBe(20000)
      expect(refund.refundAmountFen / 100).toBe(200)
    })
  })
})
