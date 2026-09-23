import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../apps/api/src/common/prisma.service';
import { PaymentService } from '../../apps/api/src/shop/payment/payment.service';
import { PaymentRepository } from '../../apps/api/src/shop/payment/payment.repository';
import { WechatPayService } from '../../apps/api/src/shop/payment/wechat-pay.service';
import { OrderRepository } from '../../apps/api/src/shop/order/order.repository';
import { ProductRepository } from '../../apps/api/src/shop/product/product.repository';

describe('Payment Integration (Task 7)', () => {
  let paymentService: PaymentService;
  let paymentRepository: PaymentRepository;
  let orderRepository: OrderRepository;
  let productRepository: ProductRepository;
  let wechatPayService: WechatPayService;
  let prisma: PrismaService;

  let testUserId: bigint;
  let testCategoryId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();

    const mockWechatPayService = {
      createPrepay: jest.fn().mockResolvedValue({
        prepayId: 'test-prepay-id',
      }),
      verifyNotifySignature: jest.fn().mockReturnValue(true),
      decryptNotify: jest.fn().mockResolvedValue({
        transaction_id: 'test-transaction-id',
        amount: { total: 10000 },
      }),
      refund: jest.fn().mockResolvedValue({
        refundId: 'test-refund-id',
      }),
    } as any;

    paymentRepository = new PaymentRepository(prisma);
    orderRepository = new OrderRepository(prisma);
    productRepository = new ProductRepository(prisma);

    paymentService = new PaymentService(
      prisma,
      orderRepository,
      paymentRepository,
      mockWechatPayService
    );

    wechatPayService = mockWechatPayService;

    const user = await prisma.user.create({
      data: {
        phoneHash: `paymenttest_${Date.now()}`,
        phoneMasked: '****0000',
        phoneCiphertext: Buffer.from('test'),
        nickname: 'Payment Test User',
      },
    });
    testUserId = user.id;

    const category = await prisma.shopCategory.create({
      data: {
        code: `payment-test-${Date.now()}`,
        name: 'Payment Test Category',
      },
    });
    testCategoryId = category.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Create payment successfully for pending order', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `TEST${Date.now()}`,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
      include: { items: true },
    });

    jest.spyOn(wechatPayService, 'createPrepay').mockResolvedValue({
      prepayId: 'wx123456',
    });

    const result = await paymentService.createPayment(order.id, '127.0.0.1');

    expect(result.prepayId).toBe('wx123456');
    expect(result.outTradeNo).toBe(order.orderNo);

    const payment = await paymentRepository.findByOrderId(order.id);
    expect(payment).toBeDefined();
    expect(payment?.status).toBe('pending');
  });

  test('Create payment with non-existent order throws NotFoundException', async () => {
    const fakeOrderId = 99999n;

    await expect(
      paymentService.createPayment(fakeOrderId, '127.0.0.1')
    ).rejects.toThrow(NotFoundException);
  });

  test('Create payment for already-paid order throws BadRequestException', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product 2',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `PAID${Date.now()}`,
        status: 'completed',
        paymentStatus: 'paid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        paidAt: new Date(),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
      include: { items: true },
    });

    await expect(
      paymentService.createPayment(order.id, '127.0.0.1')
    ).rejects.toThrow(BadRequestException);
  });

  test('Handle WeChat callback successfully', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product 3',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `CB${Date.now()}`,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
      include: { items: true },
    });

    await prisma.shopPayment.create({
      data: {
        orderId: order.id,
        outTradeNo: order.orderNo,
        prepayId: 'wx123456',
        amountFen: 10000,
        status: 'pending',
      },
    });

    const callbackData = {
      out_trade_no: order.orderNo,
      transaction_id: 'wx_trans_123',
      amount: { total: 10000 },
    };

    await paymentService.handleWechatNotify(callbackData);

    const updatedOrder = await orderRepository.findById(order.id);
    expect(updatedOrder?.paymentStatus).toBe('paid');
    expect(updatedOrder?.status).toBe('completed');

    const updatedProduct = await productRepository.findById(product.id);
    expect(updatedProduct?.soldStock).toBe(1);
    expect(updatedProduct?.reservedStock).toBe(0);
  });

  test('Handle WeChat callback with amount mismatch throws BadRequestException', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product 4',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `AM${Date.now()}`,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
    });

    const callbackData = {
      out_trade_no: order.orderNo,
      transaction_id: 'wx_trans_123',
      amount: { total: 20000 },
    };

    await expect(
      paymentService.handleWechatNotify(callbackData)
    ).rejects.toThrow(BadRequestException);
  });

  test('Handle duplicate WeChat callback (idempotency - only process once)', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product 5',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `DUP${Date.now()}`,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
      include: { items: true },
    });

    await prisma.shopPayment.create({
      data: {
        orderId: order.id,
        outTradeNo: order.orderNo,
        prepayId: 'wx123456',
        amountFen: 10000,
        status: 'pending',
      },
    });

    const callbackData = {
      out_trade_no: order.orderNo,
      transaction_id: 'wx_trans_123',
      amount: { total: 10000 },
    };

    await paymentService.handleWechatNotify(callbackData);

    let updatedProduct = await productRepository.findById(product.id);
    const firstSoldStock = updatedProduct?.soldStock;

    await paymentService.handleWechatNotify(callbackData);

    updatedProduct = await productRepository.findById(product.id);
    expect(updatedProduct?.soldStock).toBe(firstSoldStock);
  });

  test('WeChat callback is rejected if order not found', async () => {
    const callbackData = {
      out_trade_no: `NOTFOUND${Date.now()}`,
      transaction_id: 'wx_trans_123',
      amount: { total: 10000 },
    };

    await expect(
      paymentService.handleWechatNotify(callbackData)
    ).rejects.toThrow(BadRequestException);
  });

  test('Process refund for paid order', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product 6',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `REF${Date.now()}`,
        status: 'completed',
        paymentStatus: 'paid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        paidAt: new Date(),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
      include: { items: true },
    });

    await prisma.shopPayment.create({
      data: {
        orderId: order.id,
        outTradeNo: order.orderNo,
        prepayId: 'wx123456',
        amountFen: 10000,
        status: 'success',
        wechatTransactionId: 'wx_trans_123',
        paidAt: new Date(),
      },
    });

    jest.spyOn(wechatPayService, 'refund').mockResolvedValue({
      refundId: 'wx_refund_123',
    });

    const result = await paymentService.processRefund(
      order.id,
      `REF${Date.now()}`,
      10000
    );

    expect(result.refundId).toBe('wx_refund_123');
  });

  test('Refund fails if order not paid throws BadRequestException', async () => {
    const product = await prisma.shopProduct.create({
      data: {
        categoryId: testCategoryId,
        name: 'Test Product 7',
        description: 'Test',
        priceFen: 10000,
        totalStock: 100,
        reservedStock: 0,
        soldStock: 0,
      },
    });

    const order = await prisma.shopOrder.create({
      data: {
        userId: testUserId,
        orderNo: `UNPAID${Date.now()}`,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: 10000,
        paymentAmountFen: 10000,
        expiresAt: new Date(Date.now() + 3600000),
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            unitPriceFen: 10000,
            quantity: 1,
            subtotalFen: 10000,
          },
        },
      },
    });

    await expect(
      paymentService.processRefund(order.id, `REF${Date.now()}`, 10000)
    ).rejects.toThrow(BadRequestException);
  });
});
