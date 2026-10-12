import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript'

describe('小程序支付结果确认', () => {
  function setup(status: string, paymentError?: unknown) {
    const request = jest.fn(async (options: { url: string }) =>
      options.url.endsWith('/query') ? { paymentStatus: status } : {
        mock: false, prepayId: 'PREPAY', outTradeNo: 'ORDER',
        paymentParams: { timeStamp: '1', nonceStr: 'NONCE', package: 'prepay_id=PREPAY', signType: 'RSA', paySign: 'SIGN' },
      })
    const uni = {
      login: jest.fn(async () => ({ code: 'LOGIN-CODE' })),
      requestPayment: jest.fn(async () => { if (paymentError) throw paymentError }),
    }
    const source = readFileSync(join(__dirname, '../../apps/miniapp/src/api/modules/shop.ts'), 'utf8')
    const compiled = transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2021 },
    }).outputText
    const moduleExports: any = {}
    new Function('require', 'exports', 'uni', compiled)(() => ({ request }), moduleExports, uni)
    return { api: moduleExports.shopApi, request, uni }
  }

  it('收银台成功后仍以服务端确认结果为准', async () => {
    const { api, request } = setup('unpaid')
    await expect(api.createPayment('10')).resolves.toMatchObject({ paymentStatus: 'unpaid' })
    expect(request).toHaveBeenLastCalledWith({ url: '/shop/orders/10/payment/query', method: 'POST' })
  })

  it('收银台返回异常但服务端确认已付款时返回成功', async () => {
    const { api } = setup('paid', { errMsg: 'requestPayment:fail' })
    await expect(api.createPayment('10')).resolves.toMatchObject({ paymentStatus: 'paid' })
  })

  it('用户取消且服务端未支付时保留取消结果', async () => {
    const error = { errMsg: 'requestPayment:fail cancel' }
    const { api, request } = setup('unpaid', error)
    await expect(api.createPayment('10')).rejects.toBe(error)
    expect(request).toHaveBeenCalledTimes(2)
  })
})
