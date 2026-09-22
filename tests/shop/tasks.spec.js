import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/common/prisma.service';
import { ExpiredOrderTask } from '@/shop/common/tasks/expired-order.task';
import { ReconciliationTask } from '@/shop/common/tasks/reconciliation.task';

describe('Shop Tasks', () => {
  let prisma: PrismaService;
  let expiredOrderTask: ExpiredOrderTask;
  let reconciliationTask: ReconciliationTask;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [PrismaService, ExpiredOrderTask, ReconciliationTask]
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    expiredOrderTask = module.get<ExpiredOrderTask>(ExpiredOrderTask);
    reconciliationTask = module.get<ReconciliationTask>(ReconciliationTask);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('ExpiredOrderTask', () => {
    let userId: bigint;
    let productId: bigint;
    let categoryId: bigint;

    beforeEach(async () => {
      // Clean up test data
      await prisma.shopOrder.deleteMany({});
      await prisma.shopProduct.deleteMany({});
      await prisma.shopCategory.deleteMany({});
      await prisma.user.deleteMany({});

      // Create test user
      const user = await prisma.user.create({
        data: {
          phoneCiphertext: Buffer.from('test'),
          phoneHash: 'hash123',
          phoneMasked: '****1234',
          nickname: 'TestUser'
        }
      });
      userId = user.id;

      // Create test category
      const category = await prisma.shopCategory.create({
        data: {
          name: 'Test Category',
          code: 'test-cat-1',
          sortOrder: 1
        }
      });
      categoryId = category.id;

      // Create test product
      const product = await prisma.shopProduct.create({
        data: {
          categoryId,
          name: 'Test Product',
          priceFen: 10000,
          totalStock: 100,
          reservedStock: 0,
          soldStock: 0,
          status: 1
        }
      });
      productId = product.id;
    });

    it('should cancel expired pending orders', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 60000); // 1 minute ago

      // Create expired order
      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-expired-1',
          userId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt
        }
      });

      // Run task
      await expiredOrderTask.handleExpiredOrders();

      // Verify order is cancelled
      const updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id }
      });

      expect(updatedOrder!.status).toBe('cancelled');
      expect(updatedOrder!.cancelledAt).toBeDefined();
      expect(updatedOrder!.cancelReason).toContain('expired');
    });

    it('should release reserved inventory when order expires', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 60000);

      // Create order with items
      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-inventory-1',
          userId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          totalAmountFen: 20000,
          paymentAmountFen: 20000,
          expiresAt,
          items: {
            create: [
              {
                productId,
                productName: 'Test Product',
                unitPriceFen: 10000,
                quantity: 2,
                subtotalFen: 20000
              }
            ]
          }
        }
      });

      // Reserve inventory
      await prisma.shopProduct.update({
        where: { id: productId },
        data: { reservedStock: 2 }
      });

      const productBefore = await prisma.shopProduct.findUnique({
        where: { id: productId }
      });
      expect(productBefore!.reservedStock).toBe(2);

      // Run task
      await expiredOrderTask.handleExpiredOrders();

      // Verify inventory is released
      const productAfter = await prisma.shopProduct.findUnique({
        where: { id: productId }
      });
      expect(productAfter!.reservedStock).toBe(0);

      const updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id }
      });
      expect(updatedOrder!.status).toBe('cancelled');
    });

    it('should not affect non-expired orders', async () => {
      const now = new Date();
      const futureExpiry = new Date(now.getTime() + 600000); // 10 minutes from now

      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-not-expired-1',
          userId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt: futureExpiry
        }
      });

      // Run task
      await expiredOrderTask.handleExpiredOrders();

      // Verify order is still pending
      const updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id }
      });

      expect(updatedOrder!.status).toBe('pending_payment');
      expect(updatedOrder!.cancelledAt).toBeNull();
    });

    it('should process multiple expired orders in one run', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 60000);

      const orders = await Promise.all([
        prisma.shopOrder.create({
          data: {
            orderNo: 'order-multi-1',
            userId,
            status: 'pending_payment',
            paymentStatus: 'unpaid',
            totalAmountFen: 10000,
            paymentAmountFen: 10000,
            expiresAt
          }
        }),
        prisma.shopOrder.create({
          data: {
            orderNo: 'order-multi-2',
            userId,
            status: 'pending_payment',
            paymentStatus: 'unpaid',
            totalAmountFen: 10000,
            paymentAmountFen: 10000,
            expiresAt
          }
        }),
        prisma.shopOrder.create({
          data: {
            orderNo: 'order-multi-3',
            userId,
            status: 'pending_payment',
            paymentStatus: 'unpaid',
            totalAmountFen: 10000,
            paymentAmountFen: 10000,
            expiresAt
          }
        })
      ]);

      // Run task
      await expiredOrderTask.handleExpiredOrders();

      // Verify all orders are cancelled
      for (const order of orders) {
        const updated = await prisma.shopOrder.findUnique({
          where: { id: order.id }
        });
        expect(updated!.status).toBe('cancelled');
      }
    });

    it('should handle errors gracefully without crashing', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 60000);

      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-error-1',
          userId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt
        }
      });

      // Run task - should not throw
      await expect(expiredOrderTask.handleExpiredOrders()).resolves.not.toThrow();

      // Task should have completed despite potential issues
      const updatedOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id }
      });
      expect(updatedOrder).toBeDefined();
    });
  });

  describe('ReconciliationTask', () => {
    let userId: bigint;
    let productId: bigint;
    let categoryId: bigint;

    beforeEach(async () => {
      // Clean up test data
      await prisma.shopRefund.deleteMany({});
      await prisma.shopPayment.deleteMany({});
      await prisma.shopOrder.deleteMany({});
      await prisma.shopProduct.deleteMany({});
      await prisma.shopCategory.deleteMany({});
      await prisma.user.deleteMany({});

      // Create test user
      const user = await prisma.user.create({
        data: {
          phoneCiphertext: Buffer.from('test'),
          phoneHash: 'hash456',
          phoneMasked: '****5678',
          nickname: 'TestUser2'
        }
      });
      userId = user.id;

      // Create test category
      const category = await prisma.shopCategory.create({
        data: {
          name: 'Test Category 2',
          code: 'test-cat-2',
          sortOrder: 1
        }
      });
      categoryId = category.id;

      // Create test product
      const product = await prisma.shopProduct.create({
        data: {
          categoryId,
          name: 'Test Product 2',
          priceFen: 10000,
          totalStock: 100,
          reservedStock: 0,
          soldStock: 0,
          status: 1
        }
      });
      productId = product.id;
    });

    it('should detect orders with status=paid but no payment record', async () => {
      const loggerWarnSpy = jest.spyOn(reconciliationTask['logger'], 'warn');

      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-no-payment-1',
          userId,
          status: 'paid',
          paymentStatus: 'paid',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt: new Date(),
          paidAt: new Date()
        }
      });

      // Run reconciliation
      await reconciliationTask.reconcilePayments();

      // Verify warning was logged
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('paid orders without payment records'),
        expect.anything()
      );
    });

    it('should detect successful payments with unpaid orders', async () => {
      const loggerWarnSpy = jest.spyOn(reconciliationTask['logger'], 'warn');

      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-unpaid-1',
          userId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt: new Date()
        }
      });

      // Create successful payment
      await prisma.shopPayment.create({
        data: {
          orderId: order.id,
          outTradeNo: 'trade-success-1',
          amountFen: 10000,
          status: 'success',
          paidAt: new Date()
        }
      });

      // Run reconciliation
      await reconciliationTask.reconcilePayments();

      // Verify warning was logged
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('successful payments with unpaid orders'),
        expect.anything()
      );
    });

    it('should auto-fix successful payments by marking order as paid', async () => {
      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-autofix-1',
          userId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt: new Date()
        }
      });

      const paidAt = new Date();
      await prisma.shopPayment.create({
        data: {
          orderId: order.id,
          outTradeNo: 'trade-autofix-1',
          amountFen: 10000,
          status: 'success',
          paidAt
        }
      });

      // Verify order is unpaid before
      let checkOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id }
      });
      expect(checkOrder!.paymentStatus).toBe('unpaid');

      // Run reconciliation
      await reconciliationTask.reconcilePayments();

      // Verify order is now marked as paid
      checkOrder = await prisma.shopOrder.findUnique({
        where: { id: order.id }
      });
      expect(checkOrder!.paymentStatus).toBe('paid');
      expect(checkOrder!.status).toBe('paid');
      expect(checkOrder!.paidAt).toBeDefined();
    });

    it('should detect refunded orders with inventory not restored', async () => {
      const loggerWarnSpy = jest.spyOn(reconciliationTask['logger'], 'warn');

      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-refund-1',
          userId,
          status: 'refunded',
          paymentStatus: 'refunded',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt: new Date(),
          items: {
            create: [
              {
                productId,
                productName: 'Test Product 2',
                unitPriceFen: 10000,
                quantity: 1,
                subtotalFen: 10000
              }
            ]
          }
        }
      });

      // Set sold stock as if inventory wasn't restored
      await prisma.shopProduct.update({
        where: { id: productId },
        data: { soldStock: 1 }
      });

      // Create refund marked as successful
      await prisma.shopRefund.create({
        data: {
          orderId: order.id,
          refundNo: 'refund-1',
          outRefundNo: 'out-refund-1',
          requestedAmountFen: 10000,
          approvedAmountFen: 10000,
          reason: 'Customer request',
          status: 'refund_success',
          completedAt: new Date()
        }
      });

      // Run reconciliation
      await reconciliationTask.reconcilePayments();

      // Verify warning was logged
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('refunded orders with inventory not restored'),
        expect.anything()
      );
    });

    it('should restore inventory for refunded orders', async () => {
      const order = await prisma.shopOrder.create({
        data: {
          orderNo: 'order-restore-1',
          userId,
          status: 'refunded',
          paymentStatus: 'refunded',
          totalAmountFen: 10000,
          paymentAmountFen: 10000,
          expiresAt: new Date(),
          items: {
            create: [
              {
                productId,
                productName: 'Test Product 2',
                unitPriceFen: 10000,
                quantity: 2,
                subtotalFen: 10000
              }
            ]
          }
        }
      });

      // Set sold stock
      await prisma.shopProduct.update({
        where: { id: productId },
        data: { soldStock: 2 }
      });

      // Create refund
      await prisma.shopRefund.create({
        data: {
          orderId: order.id,
          refundNo: 'refund-2',
          outRefundNo: 'out-refund-2',
          requestedAmountFen: 10000,
          approvedAmountFen: 10000,
          reason: 'Customer request',
          status: 'refund_success',
          completedAt: new Date()
        }
      });

      // Verify sold stock before
      let product = await prisma.shopProduct.findUnique({
        where: { id: productId }
      });
      expect(product!.soldStock).toBe(2);

      // Run reconciliation
      await reconciliationTask.reconcilePayments();

      // Verify inventory is restored
      product = await prisma.shopProduct.findUnique({
        where: { id: productId }
      });
      expect(product!.soldStock).toBe(0);
    });

    it('should handle errors gracefully without crashing', async () => {
      // Run task with no errors - should not throw
      await expect(reconciliationTask.reconcilePayments()).resolves.not.toThrow();
    });
  });
});
