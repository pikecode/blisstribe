// 先构建 API，再使用独立空测试数据库运行；模拟微信渠道，不产生真实交易。
const assert = require('node:assert/strict')
const { PrismaClient } = require('@prisma/client')
const { OrderService } = require('../../apps/api/dist/shop/order/order.service')
const { OrderRepository } = require('../../apps/api/dist/shop/order/order.repository')
const { PaymentService } = require('../../apps/api/dist/shop/payment/payment.service')
const { PaymentRepository } = require('../../apps/api/dist/shop/payment/payment.repository')
const { RefundService } = require('../../apps/api/dist/shop/refund/refund.service')
const { RefundRepository } = require('../../apps/api/dist/shop/refund/refund.repository')

assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/blisstribe_paycheck_/, '仅允许独立支付验收数据库')
const prisma = new PrismaClient()
const suffix = `${Date.now()}`
const trades = new Map()
const wechat = {
  assertCheckoutEnabled() {}, isMockPaymentEnabled: () => false,
  getNotifyUrl: () => 'https://api.example.com/api/v1/shop/webhooks/wechat-pay',
  createPrepay: async ({ outTradeNo }) => { trades.set(outTradeNo, { tradeState: 'NOTPAY' }); return { prepayId: `PRE-${outTradeNo}` } },
  buildClientPaymentParams: () => ({}),
  queryTrade: async (orderNo) => trades.get(orderNo) || { tradeState: 'NOT_CREATED' },
  closeTrade: async (orderNo) => { trades.set(orderNo, { tradeState: 'CLOSED' }); return { tradeState: 'CLOSED' } },
  refund: async ({ outRefundNo }) => ({ refundId: `WX-${outRefundNo}` }),
}
const repository = new OrderRepository(prisma)
const payments = new PaymentService(prisma, repository, new PaymentRepository(prisma), wechat)
const orders = new OrderService(prisma, repository, {}, payments)
const refunds = new RefundService(prisma, new RefundRepository(prisma), repository, payments)

async function check() {
  const user = await prisma.user.create({ data: {
    phoneCiphertext: Buffer.from('验收虚拟用户'), phoneHash: `check-${suffix}`, phoneMasked: '虚拟号码', nickname: '支付自动验收', tags: [],
  } })
  const category = await prisma.shopCategory.create({ data: { code: `check-${suffix}`, name: '验收分类' } })
  const product = await prisma.shopProduct.create({ data: { categoryId: category.id, name: '验收商品', images: [], status: 1 } })
  const sku = await prisma.shopProductSku.create({ data: {
    productId: product.id, skuCode: `check-${suffix}`, specificationKey: '', priceFen: 1, totalStock: 10,
  } })
  const checkout = (quantity) => orders.createOrder(user.id, {
    items: [{ skuId: sku.id.toString(), quantity }], receiverName: '虚拟收件人', receiverPhone: '13800000000', shippingAddress: '测试地址',
  })
  const stock = async (reserved, sold) => {
    const current = await prisma.shopProductSku.findUnique({ where: { id: sku.id } })
    assert.equal(current.reservedStock, reserved)
    assert.equal(current.soldStock, sold)
  }
  const order = await checkout(2)
  await stock(2, 0)
  await payments.createPayment(order.id, user.id, '127.0.0.1', 'TEST-OPENID')
  await payments.createPayment(order.id, user.id, '127.0.0.1', 'TEST-OPENID')
  assert.equal(await prisma.shopPayment.count({ where: { orderId: order.id } }), 1)
  const paid = { out_trade_no: order.orderNo, transaction_id: `WX-${suffix}`, amount: { total: 2 } }
  await assert.rejects(payments.handleWechatNotify({ ...paid, amount: { total: 999 } }), /支付金额/)
  await stock(2, 0)
  await payments.handleWechatNotify(paid)
  await payments.handleWechatNotify(paid)
  await stock(0, 2)
  const refund = await refunds.requestRefund(user.id, order.id, { amountInFen: 2, reason: '验收' })
  await assert.rejects(orders.shipOrder(order.id, { trackingNo: 'TEST-TRACK' }), /进行中的退款/)
  await refunds.approveRefund(refund.id, 1n)
  const returned = { out_refund_no: refund.outRefundNo, refund_id: `WX-${refund.outRefundNo}`, refund_status: 'SUCCESS', amount: { refund: 2, total: 2, currency: 'CNY' } }
  await refunds.handleRefundCallback(returned)
  await refunds.handleRefundCallback(returned)
  await stock(0, 0)
  assert.equal((await repository.findById(order.id)).refundedAmountFen, 2)
  const cancelled = await checkout(3)
  await payments.closeUnpaidOrder(cancelled.id, '验收取消')
  await payments.closeUnpaidOrder(cancelled.id, '验收重复取消')
  await stock(0, 0)
  const delayed = await checkout(2)
  await payments.createPayment(delayed.id, user.id, '127.0.0.1', 'TEST-OPENID')
  trades.set(delayed.orderNo, { tradeState: 'SUCCESS', transactionId: `WX-DELAY-${suffix}`, amountFen: 2 })
  assert.equal((await payments.confirmPayment(delayed.id, user.id)).paymentStatus, 'paid')
  await stock(0, 2)
  const concurrent = await Promise.allSettled([checkout(5), checkout(5)])
  assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1)
  await stock(5, 2)
  console.log('真实数据库检查通过：预留库存、重复支付、金额不匹配、重复回调、退款恢复、取消恢复、回调延迟补记账、并发防超卖；微信渠道全部模拟。')
}
check().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
