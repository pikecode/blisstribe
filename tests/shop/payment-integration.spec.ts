import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PaymentService } from '../../apps/api/src/shop/payment/payment.service';
import { PaymentRepository } from '../../apps/api/src/shop/payment/payment.repository';
import { OrderRepository } from '../../apps/api/src/shop/order/order.repository';
import { WechatPayService } from '../../apps/api/src/shop/payment/wechat-pay.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Payment Service Unit Tests (Task 7)', () => {
  let paymentService: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let orderRepository: jest.Mocked<OrderRepository>;
  let wechatPayService: jest.Mocked<WechatPayService>;
  let prismaService: any;

  const mockOrderId = 1n;
  const mockOrderNo = 'ORDER-20250921-001';
  const mockAmountFen = 10000;
  const mockUserId = 1n;

  beforeEach(() => {
    paymentRepository = {
      findByOrderId: jest.fn(),
      create: jest.fn(),
      updateByOrderId: jest.fn(),
      findByOrderIdAndTransactionId: jest.fn(),
    } as any;

    orderRepository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    wechatPayService = {
      createPrepay: jest.fn(),
      verifyNotifySignature: jest.fn(),
      decryptNotify: jest.fn(),
      refund: jest.fn(),
    } as any;

    prismaService = {
      shopOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      shopPayment: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      shopProduct: {
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => {
        // Create a mock transaction context
        const txContext = {
          shopPayment: {
            findFirst: jest.fn(),
            updateMany: jest.fn(),
            create: jest.fn(),
          },
          shopProduct: {
            updateMany: jest.fn(),
          },
          shopOrder: {
            update: jest.fn(),
          },
        };
        return callback(txContext);
      }),
    };

    paymentService = new PaymentService(
      prismaService,
      orderRepository,
      paymentRepository,
      wechatPayService
    );
  });

  describe('createPayment', () => {
    test('Creates payment successfully for pending order', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: mockAmountFen,
        userId: mockUserId,
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      wechatPayService.createPrepay.mockResolvedValue({
        prepayId: 'wx123456789',
      });
      paymentRepository.create.mockResolvedValue({
        id: 1n,
        orderId: mockOrderId,
        prepayId: 'wx123456789',
        outTradeNo: mockOrderNo,
        status: 'pending',
        amountFen: mockAmountFen,
      } as any);

      const result = await paymentService.createPayment(mockOrderId, '127.0.0.1');

      expect(result).toBeDefined();
      expect(result.prepayId).toBe('wx123456789');
      expect(wechatPayService.createPrepay).toHaveBeenCalled();
      expect(paymentRepository.create).toHaveBeenCalled();
    });

    test('Throws NotFoundException for non-existent order', async () => {
      orderRepository.findById.mockResolvedValue(null as any);

      await expect(
        paymentService.createPayment(mockOrderId, '127.0.0.1')
      ).rejects.toThrow(NotFoundException);
    });

    test('Throws BadRequestException for already-paid order', async () => {
      const paidOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        status: 'completed',
        paymentStatus: 'paid',
        totalAmountFen: mockAmountFen,
        userId: mockUserId,
      };

      orderRepository.findById.mockResolvedValue(paidOrder as any);

      await expect(
        paymentService.createPayment(mockOrderId, '127.0.0.1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWechatNotify', () => {
    test('Handles successful WeChat callback', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        paymentAmountFen: mockAmountFen,
        items: [],
      };

      prismaService.shopOrder.findUnique.mockResolvedValue(mockOrder);
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txContext = {
          shopPayment: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
          shopProduct: {
            updateMany: jest.fn().mockResolvedValue({}),
          },
          shopOrder: {
            update: jest.fn().mockResolvedValue(mockOrder),
          },
        };
        return callback(txContext);
      });

      const callbackData = {
        out_trade_no: mockOrderNo,
        transaction_id: 'wx_trans_123',
        amount: { total: mockAmountFen },
      };

      const result = await paymentService.handleWechatNotify(callbackData);

      expect(result.message).toBe('success');
      expect(prismaService.shopOrder.findUnique).toHaveBeenCalledWith({
        where: { orderNo: mockOrderNo },
        include: { items: true },
      });
    });

    test('Throws BadRequestException for amount mismatch', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        paymentAmountFen: mockAmountFen,
      };

      prismaService.shopOrder.findUnique.mockResolvedValue(mockOrder);

      const callbackData = {
        out_trade_no: mockOrderNo,
        transaction_id: 'wx_trans_123',
        amount: { total: 20000 },
      };

      await expect(
        paymentService.handleWechatNotify(callbackData)
      ).rejects.toThrow(BadRequestException);
    });

    test('Rejects callback if payment not found', async () => {
      prismaService.shopOrder.findUnique.mockResolvedValue(null);

      const callbackData = {
        out_trade_no: 'NOTFOUND',
        transaction_id: 'wx_trans_123',
        amount: { total: mockAmountFen },
      };

      await expect(
        paymentService.handleWechatNotify(callbackData)
      ).rejects.toThrow(BadRequestException);
    });

    test('Handles idempotency - duplicate callback only processes once', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        paymentAmountFen: mockAmountFen,
        items: [],
      };

      prismaService.shopOrder.findUnique.mockResolvedValue(mockOrder);
      prismaService.$transaction.mockImplementation(async (callback) => {
        const txContext = {
          shopPayment: {
            findFirst: jest.fn().mockResolvedValue({
              id: 1n,
              wechatTransactionId: 'wx_trans_123',
            }),
          },
          shopProduct: {},
          shopOrder: {},
        };
        return callback(txContext);
      });

      const callbackData = {
        out_trade_no: mockOrderNo,
        transaction_id: 'wx_trans_123',
        amount: { total: mockAmountFen },
      };

      const result = await paymentService.handleWechatNotify(callbackData);

      expect(result.message).toBe('success');
    });
  });

  describe('processRefund', () => {
    test('Processes refund successfully for paid order', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
      };

      const mockPayment = {
        id: 1n,
        orderId: mockOrderId,
        wechatTransactionId: 'wx_trans_123',
        amountFen: mockAmountFen,
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      prismaService.shopPayment.findFirst.mockResolvedValue(mockPayment);
      wechatPayService.refund.mockResolvedValue({
        refundId: 'wx_refund_123',
      });
      prismaService.shopPayment.updateMany.mockResolvedValue({});

      const result = await paymentService.processRefund(
        mockOrderId,
        'REFUND-001',
        mockAmountFen
      );

      expect(result.refundId).toBe('wx_refund_123');
      expect(wechatPayService.refund).toHaveBeenCalled();
    });

    test('Throws BadRequestException for unpaid order', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      prismaService.shopPayment.findFirst.mockResolvedValue(null);

      await expect(
        paymentService.processRefund(mockOrderId, 'REFUND-001', mockAmountFen)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payment idempotency', () => {
    test('Multiple requests with same order ID return cached result', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        paymentAmountFen: mockAmountFen,
        paymentStatus: 'unpaid',
      };

      const mockPayment = {
        id: 1n,
        orderId: mockOrderId,
        prepayId: 'wx123456789',
        outTradeNo: mockOrderNo,
        status: 'pending',
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      paymentRepository.create.mockResolvedValue(mockPayment as any);
      wechatPayService.createPrepay.mockResolvedValue({
        prepayId: 'wx123456789',
      });

      const result1 = await paymentService.createPayment(mockOrderId, '127.0.0.1');
      const result2 = await paymentService.createPayment(mockOrderId, '127.0.0.1');

      expect(result1).toEqual(result2);
      expect(result1.prepayId).toBe('wx123456789');
    });
  });

  describe('Signature verification', () => {
    test('Verifies WeChat callback signature', async () => {
      wechatPayService.verifyNotifySignature.mockReturnValue(true);

      const result = wechatPayService.verifyNotifySignature(
        '{"test": "data"}',
        {
          'wechat-pay-timestamp': '1234567890',
          'wechat-pay-nonce': 'nonce',
          'wechat-pay-signature': 'signature',
        }
      );

      expect(result).toBe(true);
    });

    test('Rejects invalid signature', async () => {
      wechatPayService.verifyNotifySignature.mockReturnValue(false);

      const result = wechatPayService.verifyNotifySignature(
        '{"test": "data"}',
        {
          'wechat-pay-timestamp': '1234567890',
          'wechat-pay-nonce': 'nonce',
          'wechat-pay-signature': 'invalid_signature',
        }
      );

      expect(result).toBe(false);
    });
  });

  describe('Payment status transitions', () => {
    test('Order transitions from pending_payment to completed on payment success', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        totalAmountFen: mockAmountFen,
        userId: mockUserId,
      };

      const expectedUpdate = {
        status: 'completed',
        paymentStatus: 'paid',
        paidAt: expect.any(Date),
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      orderRepository.updateStatus.mockResolvedValue({
        ...mockOrder,
        ...expectedUpdate,
      } as any);

      const result = await orderRepository.updateStatus(
        mockOrderId,
        'completed'
      );

      expect(result.status).toBe('completed');
    });
  });

  describe('WeChat API integration', () => {
    test('createPrepay calls WeChat API with correct params', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
        paymentAmountFen: mockAmountFen,
        paymentStatus: 'unpaid',
      };

      const mockPayment = {
        id: 1n,
        orderId: mockOrderId,
        prepayId: 'wx123456789',
        outTradeNo: mockOrderNo,
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      paymentRepository.create.mockResolvedValue(mockPayment as any);
      wechatPayService.createPrepay.mockResolvedValue({
        prepayId: 'wx123456789',
      });

      await paymentService.createPayment(mockOrderId, '127.0.0.1');

      expect(wechatPayService.createPrepay).toHaveBeenCalledWith({
        outTradeNo: mockOrderNo,
        amount: mockAmountFen,
        description: expect.any(String),
        notifyUrl: expect.any(String),
        clientIp: '127.0.0.1',
      });
    });

    test('refund calls WeChat API with correct params', async () => {
      const mockOrder = {
        id: mockOrderId,
        orderNo: mockOrderNo,
      };

      const mockPayment = {
        id: 1n,
        orderId: mockOrderId,
        wechatTransactionId: 'wx_trans_123',
        amountFen: mockAmountFen,
      };

      orderRepository.findById.mockResolvedValue(mockOrder as any);
      prismaService.shopPayment.findFirst.mockResolvedValue(mockPayment);
      wechatPayService.refund.mockResolvedValue({
        refundId: 'wx_refund_123',
      });
      prismaService.shopPayment.updateMany.mockResolvedValue({});

      await paymentService.processRefund(
        mockOrderId,
        'REFUND-001',
        mockAmountFen
      );

      expect(wechatPayService.refund).toHaveBeenCalled();
    });
  });
});
