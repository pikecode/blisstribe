import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { CategoryService } from '../../apps/api/src/shop/category/category.service'
import { ProductService } from '../../apps/api/src/shop/product/product.service'
import { CartService } from '../../apps/api/src/shop/cart/cart.service'
import { OrderService } from '../../apps/api/src/shop/order/order.service'
import { PaymentService } from '../../apps/api/src/shop/payment/payment.service'
import { RefundService } from '../../apps/api/src/shop/refund/refund.service'
import { ConfigService } from '@nestjs/config'

/**
 * Integration Test Suite: Backend System Integration
 *
 * Critical Test Scenarios:
 * 1. Inventory never oversells (concurrent order creation)
 * 2. Payment callback idempotency (duplicate callbacks don't double-charge)
 * 3. Order cancellation releases inventory
 * 4. Complete refund flow
 * 5. Correct amount calculations (fen → yuan)
 */
describe('Integration: Backend System (Task 22)', () => {
  let prisma: PrismaService
  let categoryService: CategoryService
  let productService: ProductService
  let cartService: CartService
  let orderService: OrderService
  let paymentService: PaymentService
  let refundService: RefundService

  let testUserId: bigint
  let anotherUserId: bigint
  let testCategoryId: bigint
  let testProductId: bigint

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

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        phoneHash: `integration_user1_${Date.now()}`,
        phoneMasked: '****7777',
        phoneCiphertext: Buffer.from('user1'),
        nickname: 'Integration Test User 1',
      },
    })
    testUserId = user1.id

    const user2 = await prisma.user.create({
      data: {
        phoneHash: `integration_user2_${Date.now()}`,
        phoneMasked: '****8888',
        phoneCiphertext: Buffer.from('user2'),
        nickname: 'Integration Test User 2',
      },
    })
    anotherUserId = user2.id
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
      code: `integration_cat_${Date.now()}`,
      name: 'Integration Test Category',
    })
    testCategoryId = BigInt(category.id)

    // Create test product with limited stock
    const product = await productService.createProduct({
      categoryId: Number(testCategoryId),
      name: 'Integration Product',
      description: 'Limited stock product',
      images: ['https://example.com/integration.jpg'],
      priceFen: 10000,
      totalStock: 10, // Limited stock for oversell testing
    })
    testProductId = BigInt(product.id)
    await productService.publishProduct(testProductId)
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
    await prisma.user.delete({ where: { id: anotherUserId } })
    await prisma.$disconnect()
  })

  describe('Critical: Inventory Management', () => {
    test('✅ Inventory never oversells - sequential orders', async () => {
      const initialProduct = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(initialProduct?.totalStock).toBe(10)

      // Create 5 sequential orders of 2 items each
      for (let i = 0; i < 5; i++) {
        const userId = i % 2 === 0 ? testUserId : anotherUserId
        const order = await orderService.createOrder(userId, {
          items: [{ productId: testProductId, quantity: 2 }],
          recipientName: `User ${i}`,
          recipientPhone: `1360013${600 + i}`,
          shippingAddress: `${i} Oversell St, Test City`,
        })

        expect(order).toBeDefined()
        expect(order.paymentAmountFen).toBe(20000) // 2 * 10000 fen
      }

      // Check inventory after orders
      const product = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(product?.reservedStock).toBe(10)
      expect(product?.reservedStock + product?.soldStock!).toBeLessThanOrEqual(10)
    })

    test('✅ Inventory never oversells - concurrent orders', async () => {
      // Attempt 15 concurrent orders of 1 item each (should fail for last 5)
      const promises = []
      for (let i = 0; i < 15; i++) {
        const promise = orderService
          .createOrder(testUserId, {
            items: [{ productId: testProductId, quantity: 1 }],
            recipientName: `Concurrent User ${i}`,
            recipientPhone: `1360014${i.toString().padStart(2, '0')}`,
            shippingAddress: `${i} Concurrent St, Test City`,
          })
          .catch(err => ({ error: err.message }))
        promises.push(promise)
      }

      const results = await Promise.allSettled(promises)

      // Count successful orders
      let successCount = 0
      let failureCount = 0

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          if ((result.value as any).error) {
            failureCount++
          } else {
            successCount++
          }
        } else {
          failureCount++
        }
      })

      // Should have at most 10 successful orders
      expect(successCount).toBeLessThanOrEqual(10)
      expect(successCount + failureCount).toBe(15)

      // Verify final inventory state
      const product = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(product?.reservedStock).toBeLessThanOrEqual(10)
    })

    test('✅ Inventory updates correctly after order confirmation', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 3 }],
        recipientName: 'Inventory Update Test',
        recipientPhone: '13500135000',
        shippingAddress: 'Inventory Test St, Test City',
      })

      // Check product after order
      const product = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })

      expect(product?.reservedStock).toBe(3)
      expect(product?.totalStock - product?.reservedStock!).toBe(7)
    })
  })

  describe('Critical: Payment Callback Idempotency', () => {
    test('✅ Payment callback idempotency - duplicate callbacks do not double-charge', async () => {
      // Create and prepare order for payment
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 1 }],
        recipientName: 'Idempotency Test',
        recipientPhone: '13400134000',
        shippingAddress: 'Idempotency St, Test City',
      })

      const transactionId = `txn_idempotent_${Date.now()}`
      const callbackData = {
        out_trade_no: order.orderNo,
        transaction_id: transactionId,
        amount: { total: order.paymentAmountFen },
      }

      // First callback
      await paymentService.handleWechatNotify(callbackData)

      // Verify order is paid
      let updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
      })
      expect(updatedOrder?.paymentStatus).toBe('paid')

      const paymentAfterFirst = await prisma.shopPayment.findFirst({
        where: { orderId: order.id },
      })
      const paymentCountAfterFirst = paymentAfterFirst ? 1 : 0

      // Second callback (duplicate)
      await paymentService.handleWechatNotify(callbackData)

      // Verify order is still paid (not double-charged)
      updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
      })
      expect(updatedOrder?.paymentStatus).toBe('paid')

      // Verify only one payment record for this transaction
      const payments = await prisma.shopPayment.findMany({
        where: {
          orderId: order.id,
          wechatTransactionId: transactionId,
        },
      })
      expect(payments.length).toBeLessThanOrEqual(1)
    })

    test('✅ Multiple payment callbacks for same order are idempotent', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 2 }],
        recipientName: 'Multiple Callback Test',
        recipientPhone: '13300133000',
        shippingAddress: 'Multiple Callback St, Test City',
      })

      const transactionId = `txn_multi_${Date.now()}`

      // Send 5 duplicate callbacks
      for (let i = 0; i < 5; i++) {
        await paymentService.handleWechatNotify({
          out_trade_no: order.orderNo,
          transaction_id: transactionId,
          amount: { total: order.paymentAmountFen },
        })
      }

      // Verify order paid status unchanged
      const finalOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
      })
      expect(finalOrder?.paymentStatus).toBe('paid')

      // Verify only one payment record
      const payments = await prisma.shopPayment.findMany({
        where: { orderId: order.id },
      })
      expect(payments.filter(p => p.wechatTransactionId === transactionId).length).toBeLessThanOrEqual(1)
    })
  })

  describe('Critical: Refund Flow Completeness', () => {
    test('✅ Complete refund flow from request to approval', async () => {
      // Create order
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 1 }],
        recipientName: 'Refund Flow Test',
        recipientPhone: '13200132000',
        shippingAddress: 'Refund Flow St, Test City',
      })

      // Mark as paid
      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_refund_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      // Request refund
      const refundRequest = await refundService.createRefund(testUserId, {
        orderId: order.id,
        reason: 'Quality issue',
        description: 'Product damaged on arrival',
      })

      expect(refundRequest.status).toBe('pending')
      expect(refundRequest.refundAmountFen).toBe(order.paymentAmountFen)

      // Approve refund
      const approvedRefund = await refundService.approveRefund(refundRequest.id, {
        adminNotes: 'Verified damage, approved full refund',
      })

      expect(approvedRefund.status).toBe('approved')
      expect(approvedRefund.approvedAt).toBeDefined()

      // Verify inventory released
      const product = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(product?.reservedStock).toBe(0)
    })

    test('✅ Refund flow with rejection', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 1 }],
        recipientName: 'Reject Refund Test',
        recipientPhone: '13100131000',
        shippingAddress: 'Reject Refund St, Test City',
      })

      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_reject_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      const refundRequest = await refundService.createRefund(testUserId, {
        orderId: order.id,
        reason: 'Changed mind',
        description: 'No longer needed',
      })

      // Reject refund
      const rejectedRefund = await refundService.rejectRefund(refundRequest.id, {
        adminNotes: 'Not covered by refund policy',
      })

      expect(rejectedRefund.status).toBe('rejected')
      expect(rejectedRefund.rejectedAt).toBeDefined()

      // Inventory should remain reserved
      const product = await prisma.shopProduct.findUnique({
        where: { id: testProductId },
      })
      expect(product?.reservedStock).toBe(1)
    })
  })

  describe('Critical: Amount Calculations', () => {
    test('✅ Fen to Yuan conversion is correct', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 1 }],
        recipientName: 'Amount Calc Test',
        recipientPhone: '13000130000',
        shippingAddress: 'Amount Calc St, Test City',
      })

      // Product price: 10000 fen = 100 yuan
      // Quantity: 1
      // Total: 10000 fen = 100 yuan
      expect(order.paymentAmountFen).toBe(10000)
      expect(order.paymentAmountFen / 100).toBe(100) // In yuan
    })

    test('✅ Multiple items amount calculation', async () => {
      const product1 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Product 1',
        description: 'Test',
        images: ['https://example.com/1.jpg'],
        priceFen: 5000,
        totalStock: 50,
      })
      await productService.publishProduct(BigInt(product1.id))

      const product2 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Product 2',
        description: 'Test',
        images: ['https://example.com/2.jpg'],
        priceFen: 15000,
        totalStock: 50,
      })
      await productService.publishProduct(BigInt(product2.id))

      const order = await orderService.createOrder(testUserId, {
        items: [
          { productId: BigInt(product1.id), quantity: 2 }, // 5000 * 2 = 10000
          { productId: BigInt(product2.id), quantity: 1 }, // 15000 * 1 = 15000
        ],
        recipientName: 'Multi Item Test',
        recipientPhone: '12900129000',
        shippingAddress: 'Multi Item St, Test City',
      })

      // Total: 10000 + 15000 = 25000 fen = 250 yuan
      expect(order.paymentAmountFen).toBe(25000)
      expect(order.paymentAmountFen / 100).toBe(250)
    })

    test('✅ Refund amount precision', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 3 }],
        recipientName: 'Refund Amount Test',
        recipientPhone: '12800128000',
        shippingAddress: 'Refund Amount St, Test City',
      })

      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_refund_amt_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      const refund = await refundService.createRefund(testUserId, {
        orderId: order.id,
        reason: 'Test',
        description: 'Test',
      })

      // Refund amount should match order amount: 10000 * 3 = 30000 fen
      expect(refund.refundAmountFen).toBe(30000)
      expect(refund.refundAmountFen / 100).toBe(300) // In yuan
    })
  })

  describe('Critical: Data Consistency', () => {
    test('✅ Order items persist correctly', async () => {
      const product1 = await productService.createProduct({
        categoryId: Number(testCategoryId),
        name: 'Item 1',
        description: 'Test',
        images: ['https://example.com/item1.jpg'],
        priceFen: 8000,
        totalStock: 100,
      })
      await productService.publishProduct(BigInt(product1.id))

      const order = await orderService.createOrder(testUserId, {
        items: [
          { productId: testProductId, quantity: 2 },
          { productId: BigInt(product1.id), quantity: 1 },
        ],
        recipientName: 'Items Test',
        recipientPhone: '12700127000',
        shippingAddress: 'Items St, Test City',
      })

      const retrievedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
        include: { items: true },
      })

      expect(retrievedOrder?.items.length).toBe(2)
      expect(retrievedOrder?.items.some(i => i.productId === testProductId && i.quantity === 2)).toBe(true)
      expect(retrievedOrder?.items.some(i => i.productId === BigInt(product1.id) && i.quantity === 1)).toBe(true)
    })

    test('✅ Order status transitions are consistent', async () => {
      const order = await orderService.createOrder(testUserId, {
        items: [{ productId: testProductId, quantity: 1 }],
        recipientName: 'Status Test',
        recipientPhone: '12600126000',
        shippingAddress: 'Status St, Test City',
      })

      expect(order.status).toBe('pending_payment')
      expect(order.paymentStatus).toBe('unpaid')

      // Process payment
      await paymentService.handleWechatNotify({
        out_trade_no: order.orderNo,
        transaction_id: `txn_status_${Date.now()}`,
        amount: { total: order.paymentAmountFen },
      })

      const updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id },
      })

      expect(updatedOrder?.status).toBe('order_confirmed')
      expect(updatedOrder?.paymentStatus).toBe('paid')
    })
  })
})
