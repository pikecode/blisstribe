import 'reflect-metadata'
jest.mock('@nestjs/common', () => {
  const decorator = () => () => undefined
  return {
    ...Object.fromEntries(['Controller', 'Post', 'Get', 'Param', 'Body', 'Query', 'UseGuards', 'Req', 'Request', 'HttpCode', 'SetMetadata'].map((key) => [key, decorator])),
    createParamDecorator: () => decorator,
    UnauthorizedException: class extends Error { status = 401 },
    InternalServerErrorException: class extends Error { status = 500 },
  }
})
jest.mock('../../apps/api/src/shop/payment/payment.service', () => ({ PaymentService: class {} }))
jest.mock('../../apps/api/src/shop/refund/refund.service', () => ({ RefundService: class {} }))
jest.mock('../../apps/api/src/shop/payment/wechat-pay.service', () => ({ WechatPayService: class {} }))
jest.mock('../../apps/api/src/auth/auth.service', () => ({ AuthService: class {} }))
jest.mock('../../apps/api/src/common/guards/jwt.guard', () => ({ JwtAuthGuard: class {} }))
jest.mock('../../apps/api/src/common/guards/admin-jwt.guard', () => ({ AdminJwtGuard: class {} }))
import { PaymentWebhookController } from '../../apps/api/src/shop/payment/payment.controller'
import { RefundWebhookController } from '../../apps/api/src/shop/refund/refund.controller'

describe.each(['支付', '退款'])('%s通知入口', (kind) => {
  function setup() {
    const business: any = { handleWechatNotify: jest.fn(), handleRefundCallback: jest.fn() }
    const wechat: any = {
      verifyNotifySignature: jest.fn(() => true), decryptNotify: jest.fn(async () => ({ id: 'EVENT' })),
      validatePaymentNotification: jest.fn(), validateRefundNotification: jest.fn(),
    }
    const headers: Record<string, string> = {
      'wechatpay-timestamp': 'TIME', 'wechatpay-nonce': 'NONCE',
      'wechatpay-signature': 'SIGN', 'wechatpay-serial': 'KEY-ID',
    }
    const req: any = { rawBody: Buffer.from('{"resource":{}}'), get: (key: string) => headers[key] }
    const controller = kind === '支付' ? new PaymentWebhookController(business, wechat) : new RefundWebhookController(business, wechat)
    const invoke = () => kind === '支付'
      ? (controller as PaymentWebhookController).handleWechatPayNotify({ resource: {} }, req)
      : (controller as RefundWebhookController).handleWechatRefundNotify({ resource: {} }, req)
    return { business, wechat, invoke }
  }

  it('使用官方请求头与原始请求体验签', async () => {
    const { invoke, wechat } = setup()
    await expect(invoke()).resolves.toEqual({ code: 'SUCCESS' })
    expect(wechat.verifyNotifySignature).toHaveBeenCalledWith('{"resource":{}}', {
      'wechat-pay-timestamp': 'TIME', 'wechat-pay-nonce': 'NONCE',
      'wechat-pay-signature': 'SIGN', 'wechat-pay-serial': 'KEY-ID',
    })
  })

  it('验签失败返回401且不进入业务记账', async () => {
    const { invoke, wechat, business } = setup()
    wechat.verifyNotifySignature.mockReturnValue(false)
    await expect(invoke()).rejects.toMatchObject({ status: 401 })
    expect(business.handleWechatNotify).not.toHaveBeenCalled()
    expect(business.handleRefundCallback).not.toHaveBeenCalled()
  })

  it('业务记账失败返回500以便渠道重试', async () => {
    const { invoke, business } = setup()
    business.handleWechatNotify.mockRejectedValue(new Error('数据库异常'))
    business.handleRefundCallback.mockRejectedValue(new Error('数据库异常'))
    await expect(invoke()).rejects.toMatchObject({ status: 500 })
  })
})
