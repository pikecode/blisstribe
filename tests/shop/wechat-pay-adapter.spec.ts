import {
  createCipheriv,
  createSign,
  generateKeyPairSync,
} from 'crypto'
import { jest } from '@jest/globals'

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  ServiceUnavailableException: class ServiceUnavailableException extends Error {},
  UnauthorizedException: class UnauthorizedException extends Error {},
}))
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}))

import { WechatPayService } from '../../apps/api/src/shop/payment/wechat-pay.service'

describe('WechatPayService', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  const values: Record<string, string> = {
    WECHAT_APP_ID: 'wx-app',
    WECHAT_MCH_ID: 'merchant-1',
    WECHAT_API_V3_KEY: '0123456789abcdef0123456789abcdef',
    WECHAT_MCH_PRIVATE_KEY: privateKey,
    WECHAT_MCH_CERT_SERIAL_NO: 'merchant-cert-serial',
    WECHAT_PLATFORM_PUBLIC_KEY: publicKey,
    WECHAT_PLATFORM_SERIAL_NO: 'platform-key-serial',
    WECHAT_PAY_ENABLED: 'true',
    API_BASE_URL: 'https://api.example.com/api/v1',
  }
  const config = { get: (key: string) => values[key] } as any
  let service: WechatPayService
  let fetchMock: any

  function signedResponse(body: string, status = 200): Response {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = 'response-nonce'
    const signer = createSign('RSA-SHA256')
    signer.update(`${timestamp}\n${nonce}\n${body}\n`)
    signer.end()
    return new Response(body, {
      status,
      headers: {
        'wechatpay-timestamp': timestamp,
        'wechatpay-nonce': nonce,
        'wechatpay-serial': values.WECHAT_PLATFORM_SERIAL_NO,
        'wechatpay-signature': signer.sign(privateKey, 'base64'),
      },
    })
  }

  beforeEach(() => {
    service = new WechatPayService(config)
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      signedResponse(JSON.stringify({ prepay_id: 'prepay-123' }))
    )
  })

  afterEach(() => fetchMock.mockRestore())

  it('以商户私钥签名 JSAPI 请求并只发送分为单位的金额', async () => {
    const result = await service.createPrepay({
      outTradeNo: 'ORDER-1',
      amount: 1234,
      description: '商城订单',
      notifyUrl: 'https://api.example.com/api/v1/shop/webhooks/wechat-pay',
      clientIp: '127.0.0.1',
      openId: 'openid-1',
    })

    expect(result).toEqual({ prepayId: 'prepay-123' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi')
    expect(JSON.parse(init.body)).toMatchObject({
      appid: 'wx-app',
      mchid: 'merchant-1',
      out_trade_no: 'ORDER-1',
      amount: { total: 1234, currency: 'CNY' },
      payer: { openid: 'openid-1' },
    })
    expect(init.headers.Authorization).toContain('WECHATPAY2-SHA256-RSA2048')
  })

  it('拒绝非 HTTPS 通知地址且不发出网络请求', async () => {
    await expect(
      service.createPrepay({
        outTradeNo: 'ORDER-1',
        amount: 100,
        description: '商城订单',
        notifyUrl: 'http://api.example.com/notify',
        clientIp: '127.0.0.1',
        openId: 'openid-1',
      })
    ).rejects.toThrow('必须使用 HTTPS')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('未显式启用支付开关时不访问微信 API', async () => {
    values.WECHAT_PAY_ENABLED = 'false'
    await expect(
      service.createPrepay({
        outTradeNo: 'ORDER-1',
        amount: 100,
        description: '商城订单',
        notifyUrl: 'https://api.example.com/api/v1/shop/webhooks/wechat-pay',
        clientIp: '127.0.0.1',
        openId: 'openid-1',
      })
    ).rejects.toThrow('功能开关未启用')
    expect(fetchMock).not.toHaveBeenCalled()
    values.WECHAT_PAY_ENABLED = 'true'
  })

  it('Mock 支付只能在非生产环境显式启用', () => {
    values.SHOP_PAYMENT_MOCK_ENABLED = 'true'
    values.NODE_ENV = 'development'
    expect(service.isMockPaymentEnabled()).toBe(true)

    values.NODE_ENV = 'production'
    expect(service.isMockPaymentEnabled()).toBe(false)

    delete values.SHOP_PAYMENT_MOCK_ENABLED
    delete values.NODE_ENV
  })

  it('Mock 模式下查询与关闭未支付订单不访问微信 API', async () => {
    values.SHOP_PAYMENT_MOCK_ENABLED = 'true'
    values.NODE_ENV = 'development'

    await expect(service.queryTrade('ORDER-MOCK')).resolves.toEqual({ tradeState: 'NOTPAY' })
    await expect(service.closeTrade('ORDER-MOCK')).resolves.toEqual({ tradeState: 'CLOSED' })
    expect(fetchMock).not.toHaveBeenCalled()

    delete values.SHOP_PAYMENT_MOCK_ENABLED
    delete values.NODE_ENV
  })

  it('只使用原始报文、有效时间戳和匹配平台序列号验签', () => {
    const body = '{"resource":{"ciphertext":"abc"}}'
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = 'notify-nonce'
    const signer = createSign('RSA-SHA256')
    signer.update(`${timestamp}\n${nonce}\n${body}\n`)
    signer.end()
    const headers = {
      'wechat-pay-timestamp': timestamp,
      'wechat-pay-nonce': nonce,
      'wechat-pay-signature': signer.sign(privateKey, 'base64'),
      'wechat-pay-serial': values.WECHAT_PLATFORM_SERIAL_NO,
    }

    expect(service.verifyNotifySignature(body, headers)).toBe(true)
    expect(service.verifyNotifySignature(`${body} `, headers)).toBe(false)
    expect(
      service.verifyNotifySignature(body, {
        ...headers,
        'wechat-pay-serial': 'untrusted-serial',
      })
    ).toBe(false)
    expect(
      service.verifyNotifySignature(body, {
        ...headers,
        'wechat-pay-timestamp': '1',
      })
    ).toBe(false)
  })

  it('解密并认证微信 AES-256-GCM 通知资源', async () => {
    const key = Buffer.from(values.WECHAT_API_V3_KEY)
    const nonce = Buffer.from('nonce12345678')
    const aad = Buffer.from('transaction')
    const cipher = createCipheriv('aes-256-gcm', key, nonce)
    cipher.setAAD(aad)
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify({ out_trade_no: 'ORDER-2' })),
      cipher.final(),
      cipher.getAuthTag(),
    ])
    const resource = {
      algorithm: 'AEAD_AES_256_GCM',
      ciphertext: encrypted.toString('base64'),
      associated_data: aad.toString(),
      nonce: nonce.toString(),
    }

    await expect(service.decryptNotify(resource)).resolves.toEqual({
      out_trade_no: 'ORDER-2',
    })
    const tampered = { ...resource, associated_data: 'tampered' }
    await expect(service.decryptNotify(tampered)).rejects.toThrow()
  })

  it('校验支付和退款通知中的渠道身份与规范状态字段', () => {
    expect(() =>
      service.validatePaymentNotification({
        appid: 'wx-app',
        mchid: 'merchant-1',
        trade_state: 'SUCCESS',
        amount: { currency: 'CNY' },
      })
    ).not.toThrow()
    expect(() =>
      service.validatePaymentNotification({
        appid: 'another-app',
        mchid: 'merchant-1',
        trade_state: 'SUCCESS',
        amount: { currency: 'CNY' },
      })
    ).toThrow()
    expect(() =>
      service.validateRefundNotification({
        mchid: 'merchant-1',
        refund_status: 'SUCCESS',
      })
    ).not.toThrow()
    expect(() =>
      service.validateRefundNotification({
        mchid: 'another-merchant',
        refund_status: 'SUCCESS',
      })
    ).toThrow()
  })

  it('验签微信 API 响应后生成小程序调起参数', () => {
    const params = service.buildClientPaymentParams('prepay-abc')
    const verifier = require('crypto').createVerify('RSA-SHA256')
    verifier.update(
      `${params.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.package}\n`
    )
    verifier.end()
    expect(verifier.verify(publicKey, params.paySign, 'base64')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
