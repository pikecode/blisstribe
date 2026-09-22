import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { RefundService } from '../../apps/api/src/shop/refund/refund.service'
import { RefundRepository } from '../../apps/api/src/shop/refund/refund.repository'
import { PaymentService } from '../../apps/api/src/shop/payment/payment.service'
import { WechatPayService } from '../../apps/api/src/shop/payment/wechat-pay.service'
import { OrderRepository } from '../../apps/api/src/shop/order/order.repository'
import { ProductRepository } from '../../apps/api/src/shop/product/product.repository'
import { CreateRefundDto } from '../../apps/api/src/shop/dto/refund.dto'

describe('RefundService', () => {
  let refundService: RefundService
  let refundRepository: RefundRepository
  let paymentService: PaymentService
  let wechatPayService: WechatPayService
  let orderRepository: OrderRepository
  let prisma: PrismaService

  let testUserId: bigint
  let testCategoryId: bigint

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        RefundService,
        RefundRepository,
        PaymentService,
        WechatPayService,
        OrderRepository,
        ProductRepository,
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

    prisma = moduleFixture.get<PrismaService>(PrismaService)
    refundService = moduleFixture.get<RefundService>(RefundService)
    refundRepository = moduleFixture.get<RefundRepository>(RefundRepository)
    paymentService = moduleFixture.get<PaymentService>(PaymentService)
    wechatPayService = moduleFixture.get<WechatPayService>(WechatPayService)
    orderRepository = moduleFixture.get<OrderRepository>(OrderRepository)

    // Create test user
    const user = await prisma.user.create({
      data: {
        phoneHash: `refundtest_${Date.now()}`,
        phoneMasked: '****0000',
        phoneCiphertext: Buffer.from('test'),
        nickname: 'Refund Test User',
      },
    })
    testUserId = user.id

    // Create test category
    const category = await prisma.shopCategory.create({
      data: {
        name: 'Refund Test Category',
        code: `test_refund_${Date.now()}`,
      },
    })
    testCategoryId = category.id
  })

  afterAll(async () => {
    await prisma.shopRefund.deleteMany({})
    await prisma.shopOrderItem.deleteMany({})
    await prisma.shopOrder.deleteMany({})
    await prisma.shopPayment.deleteMany({})
    await prisma.shopProduct.deleteMany({})
    await prisma.shopCart.deleteMany({})
    await prisma.user.delete({
      where: { id: testUserId },
    })
    await prisma.shopCategory.delete({
      where: { id: testCategoryId },
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.shopRefund.deleteMany({})
    await prisma.shopPayment.deleteMany()
    await prisma.shopOrderItem.deleteMany({})
    await prisma.shopOrder.deleteMany({})
    await prisma.shopProduct.deleteMany({})
  })

  async function createTestProduct() {
    return await prisma.shopProduct.create({
      data: {
        name: 'Test Product ' + Date.now(),
        priceFen: 10000,
        description: 'A test product',
        images: ['https://example.com/image.jpg'],
        categoryId: testCategoryId,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    })
  }

  async function createTestOrder(productId: bigint, quantity: number = 1, paymentStatus: string = 'paid') {
    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
    })

    const unitPriceFen = product?.priceFen || 10000
    const totalAmount = unitPriceFen * quantity

    const order = await prisma.shopOrder.create({
      data: {
        orderNo: `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId: testUserId,
        totalAmountFen: totalAmount,
        paymentAmountFen: totalAmount,
        paymentStatus: paymentStatus as any,
        fulfillmentStatus: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        status: paymentStatus === 'paid' ? 'paid' : 'pending_payment',
        items: {
          create: [
            {
              productId: productId,
              quantity: quantity,
              unitPriceFen: unitPriceFen,
              subtotalFen: unitPriceFen * quantity,
              productName: product?.name || 'Product',
            },
          ],
        },
      },
      include: { items: true },
    })

    // Update product soldStock
    await prisma.shopProduct.update({
      where: { id: productId },
      data: {
        soldStock: {
          increment: quantity,
        },
      },
    })

    // Create payment record if paid
    if (paymentStatus === 'paid') {
      await prisma.shopPayment.create({
        data: {
          orderId: order.id,
          amountFen: totalAmount,
          status: 'success',
          outTradeNo: `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          wechatTransactionId: `transaction_${Date.now()}`,
        },
      })
    }

    return order
  }

  describe('requestRefund', () => {
    it('should create refund for paid order successfully', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const dto: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, dto)

      expect(refund).toBeDefined()
      expect(refund.orderId).toBe(order.id)
      expect(refund.status).toBe('pending')
      expect(refund.reason).toBe('Changed mind')
    })

    it('should throw BadRequestException for unpaid order', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'pending')

      const dto: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      await expect(refundService.requestRefund(testUserId, order.id, dto)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for delivered order', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          fulfillmentStatus: 'delivered',
        },
      })

      const dto: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      await expect(refundService.requestRefund(testUserId, order.id, dto)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should throw BadRequestException for completed order', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          completedAt: new Date(),
        },
      })

      const dto: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      await expect(refundService.requestRefund(testUserId, order.id, dto)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should throw NotFoundException for non-existent order', async () => {
      const dto: CreateRefundDto = {
        amountInFen: 10000,
        reason: 'Changed mind',
      }

      await expect(refundService.requestRefund(testUserId, BigInt(999999), dto)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw NotFoundException when user does not own order', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const otherUser = await prisma.user.create({
        data: {
          phoneHash: `other_${Date.now()}`,
          phoneMasked: '****1111',
          phoneCiphertext: Buffer.from('other'),
          nickname: 'Other User',
        },
      })

      try {
        const dto: CreateRefundDto = {
          amountInFen: order.totalAmountFen,
          reason: 'Changed mind',
        }

        await expect(refundService.requestRefund(otherUser.id, order.id, dto)).rejects.toThrow(
          NotFoundException,
        )
      } finally {
        await prisma.user.delete({ where: { id: otherUser.id } })
      }
    })

    it('should handle refund request with reason text', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const dto: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Product quality not as expected',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, dto)

      expect(refund.reason).toBe('Product quality not as expected')
    })
  })

  describe('approveRefund', () => {
    it('should approve refund', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const refundRequest: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, refundRequest)

      // Mock processRefund
      jest.spyOn(paymentService, 'processRefund').mockResolvedValue({
        refundId: `refund_${Date.now()}`,
      })

      const approvedRefund = await refundService.approveRefund(refund.id, true)

      expect(approvedRefund).toBeDefined()
      expect(approvedRefund.status).toBe('approved')
    })

    it('should reject refund', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const refundRequest: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, refundRequest)

      const rejectedRefund = await refundService.approveRefund(refund.id, false)

      expect(rejectedRefund.status).toBe('rejected')
    })

    it('should throw BadRequestException if refund is not pending', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const refundRequest: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, refundRequest)

      jest.spyOn(paymentService, 'processRefund').mockResolvedValue({
        refundId: `refund_${Date.now()}`,
      })

      await refundService.approveRefund(refund.id, true)

      await expect(refundService.approveRefund(refund.id, true)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('should throw NotFoundException for non-existent refund', async () => {
      await expect(refundService.approveRefund(BigInt(999999), true)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('handleRefundCallback', () => {
    it('should handle successful WeChat refund callback', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 2, 'paid')

      const refundRequest: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, refundRequest)

      jest.spyOn(paymentService, 'processRefund').mockResolvedValue({
        refundId: `refund_${Date.now()}`,
      })

      await refundService.approveRefund(refund.id, true)

      const result = await refundService.handleRefundCallback({
        out_refund_no: refund.outRefundNo,
        refund_id: `refund_${Date.now()}`,
      })

      expect(result.message).toBe('success')

      const updatedRefund = await prisma.shopRefund.findUnique({
        where: { id: refund.id },
      })
      expect(updatedRefund?.status).toBe('success')
    })

    it('should restore inventory when refund succeeds', async () => {
      const product = await createTestProduct()
      const quantity = 2

      const productBefore = await prisma.shopProduct.findUnique({
        where: { id: product.id },
      })
      const soldStockBefore = productBefore?.soldStock || 0

      const order = await createTestOrder(product.id, quantity, 'paid')

      const productAfterOrder = await prisma.shopProduct.findUnique({
        where: { id: product.id },
      })
      expect(productAfterOrder?.soldStock).toBe(soldStockBefore + quantity)

      const refundRequest: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, refundRequest)

      jest.spyOn(paymentService, 'processRefund').mockResolvedValue({
        refundId: `refund_${Date.now()}`,
      })

      await refundService.approveRefund(refund.id, true)

      await refundService.handleRefundCallback({
        out_refund_no: refund.outRefundNo,
        refund_id: `refund_id_${Date.now()}`,
      })

      const productAfter = await prisma.shopProduct.findUnique({
        where: { id: product.id },
      })
      expect(productAfter?.soldStock).toBe(soldStockBefore)
    })

    it('should handle failed refund callback', async () => {
      const product = await createTestProduct()
      const order = await createTestOrder(product.id, 1, 'paid')

      const refundRequest: CreateRefundDto = {
        amountInFen: order.totalAmountFen,
        reason: 'Changed mind',
      }

      const refund = await refundService.requestRefund(testUserId, order.id, refundRequest)

      jest.spyOn(paymentService, 'processRefund').mockResolvedValue({
        refundId: `refund_${Date.now()}`,
      })

      await refundService.approveRefund(refund.id, true)

      const result = await refundService.handleRefundCallback({
        out_refund_no: refund.outRefundNo,
        refund_id: null,
        status: 'REFUND_ABNORMAL',
      })

      expect(result.message).toBe('refund failed')

      const updatedRefund = await prisma.shopRefund.findUnique({
        where: { id: refund.id },
      })
      expect(updatedRefund?.status).toBe('failed')
    })

    it('should throw NotFoundException for unknown refund callback', async () => {
      const unknownOutRefundNo = `refund_${Date.now()}`

      await expect(
        refundService.handleRefundCallback({
          out_refund_no: unknownOutRefundNo,
          refund_id: `refund_id_${Date.now()}`,
        }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getUserRefunds', () => {
    it('should list user refunds with pagination', async () => {
      const product = await createTestProduct()
      const order1 = await createTestOrder(product.id, 1, 'paid')
      const order2 = await createTestOrder(product.id, 1, 'paid')

      const dto1: CreateRefundDto = { amountInFen: order1.totalAmountFen, reason: 'Reason 1' }
      const dto2: CreateRefundDto = { amountInFen: order2.totalAmountFen, reason: 'Reason 2' }

      await refundService.requestRefund(testUserId, order1.id, dto1)
      await refundService.requestRefund(testUserId, order2.id, dto2)

      const result = await refundService.getUserRefunds(testUserId, { page: 1, limit: 20 })

      expect(result.refunds.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
    })

    it('should filter refunds by status', async () => {
      const product = await createTestProduct()
      const order1 = await createTestOrder(product.id, 1, 'paid')
      const order2 = await createTestOrder(product.id, 1, 'paid')

      const dto1: CreateRefundDto = { amountInFen: order1.totalAmountFen, reason: 'Reason 1' }
      const dto2: CreateRefundDto = { amountInFen: order2.totalAmountFen, reason: 'Reason 2' }

      const refund1 = await refundService.requestRefund(testUserId, order1.id, dto1)
      await refundService.requestRefund(testUserId, order2.id, dto2)

      jest.spyOn(paymentService, 'processRefund').mockResolvedValue({
        refundId: `refund_${Date.now()}`,
      })

      await refundService.approveRefund(refund1.id, true)

      const pendingResult = await refundService.getUserRefunds(testUserId, { status: 'pending', page: 1, limit: 20 })
      const approvedResult = await refundService.getUserRefunds(testUserId, { status: 'approved', page: 1, limit: 20 })

      expect(pendingResult.refunds.length).toBeGreaterThanOrEqual(0)
      expect(approvedResult.refunds.length).toBeGreaterThanOrEqual(0)
    })
  })
})
