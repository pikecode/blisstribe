import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createDecipheriv, createSign, createVerify, randomBytes } from 'crypto'

export type WechatPayNotifyHeaders = {
  'wechat-pay-timestamp': string
  'wechat-pay-nonce': string
  'wechat-pay-signature': string
  'wechat-pay-serial': string
}

type WechatPayResponse = {
  status: number
  headers: Headers
  body: string
}

@Injectable()
export class WechatPayService {
  private readonly apiBaseUrl = 'https://api.mch.weixin.qq.com'

  constructor(private configService: ConfigService) {}

  isMockPaymentEnabled(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      this.configService.get<string>('SHOP_PAYMENT_MOCK_ENABLED') === 'true'
    )
  }

  getNotifyUrl(event: 'wechat-pay' | 'wechat-refund'): string {
    let base: URL
    try {
      base = new URL(this.required('API_BASE_URL'))
    } catch {
      throw new ServiceUnavailableException('微信支付 API_BASE_URL 配置无效')
    }
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      !base.pathname.replace(/\/+$/, '').endsWith('/api/v1')
    ) {
      throw new ServiceUnavailableException(
        '微信支付回调基址必须是以 /api/v1 结尾的 HTTPS 地址'
      )
    }
    return `${base.toString().replace(/\/+$/, '')}/shop/webhooks/${event}`
  }

  async createPrepay(params: {
    outTradeNo: string
    amount: number
    description: string
    notifyUrl: string
    clientIp: string
    openId: string
  }): Promise<{ prepayId: string }> {
    const response = await this.request('POST', '/v3/pay/transactions/jsapi', {
      appid: this.required('WECHAT_APP_ID'),
      mchid: this.required('WECHAT_MCH_ID'),
      description: params.description.slice(0, 127),
      out_trade_no: params.outTradeNo,
      notify_url: this.validateNotifyUrl(params.notifyUrl),
      amount: { total: this.validateAmount(params.amount), currency: 'CNY' },
      payer: { openid: params.openId },
      scene_info: { payer_client_ip: params.clientIp },
    })
    const prepayId = this.parseBody(response).prepay_id
    if (typeof prepayId !== 'string' || !prepayId) {
      throw new ServiceUnavailableException('微信支付下单响应缺少预支付单号')
    }
    return { prepayId }
  }

  verifyNotifySignature(body: string, headers: WechatPayNotifyHeaders): boolean {
    try {
      if (!body || !headers['wechat-pay-timestamp'] || !headers['wechat-pay-nonce']) {
        return false
      }
      if (!this.isFreshTimestamp(headers['wechat-pay-timestamp'])) return false
      if (headers['wechat-pay-serial'] !== this.required('WECHAT_PLATFORM_SERIAL_NO')) {
        return false
      }
      const verifier = createVerify('RSA-SHA256')
      verifier.update(
        `${headers['wechat-pay-timestamp']}\n${headers['wechat-pay-nonce']}\n${body}\n`,
        'utf8'
      )
      verifier.end()
      return verifier.verify(this.publicKey(), headers['wechat-pay-signature'], 'base64')
    } catch {
      return false
    }
  }

  validatePaymentNotification(data: any): void {
    if (
      data?.appid !== this.required('WECHAT_APP_ID') ||
      data?.mchid !== this.required('WECHAT_MCH_ID') ||
      data?.trade_state !== 'SUCCESS' ||
      data?.amount?.currency !== 'CNY'
    ) {
      throw new UnauthorizedException('微信支付通知商户、应用、状态或币种不匹配')
    }
  }

  validateRefundNotification(data: any): void {
    if (
      data?.mchid !== this.required('WECHAT_MCH_ID') ||
      typeof data?.refund_status !== 'string'
    ) {
      throw new UnauthorizedException('微信退款通知商户或状态不匹配')
    }
  }

  async decryptNotify(encryptedData: {
    algorithm: string
    ciphertext: string
    associated_data: string
    nonce: string
  }): Promise<unknown> {
    if (encryptedData.algorithm !== 'AEAD_AES_256_GCM') {
      throw new UnauthorizedException('不支持的微信支付通知加密算法')
    }
    const key = Buffer.from(this.required('WECHAT_API_V3_KEY'), 'utf8')
    if (key.length !== 32) {
      throw new ServiceUnavailableException('微信支付 APIv3 密钥必须为 32 字节')
    }
    const payload = Buffer.from(encryptedData.ciphertext, 'base64')
    if (payload.length <= 16) {
      throw new UnauthorizedException('微信支付通知密文格式无效')
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(encryptedData.nonce, 'utf8')
    )
    decipher.setAAD(Buffer.from(encryptedData.associated_data || '', 'utf8'))
    decipher.setAuthTag(payload.subarray(payload.length - 16))
    const plaintext = Buffer.concat([
      decipher.update(payload.subarray(0, payload.length - 16)),
      decipher.final(),
    ]).toString('utf8')
    return JSON.parse(plaintext)
  }

  async refund(params: {
    transactionId: string
    outRefundNo: string
    amount: number
    reason: string
  }): Promise<{ refundId: string }> {
    const amount = this.validateAmount(params.amount)
    const response = await this.request('POST', '/v3/refund/domestic/refunds', {
      transaction_id: params.transactionId,
      out_refund_no: params.outRefundNo,
      reason: params.reason.slice(0, 80),
      notify_url: this.getNotifyUrl('wechat-refund'),
      amount: { refund: amount, total: amount, currency: 'CNY' },
    })
    const refundId = this.parseBody(response).refund_id
    if (typeof refundId !== 'string' || !refundId) {
      throw new ServiceUnavailableException('微信支付退款响应缺少退款单号')
    }
    return { refundId }
  }

  async queryRefund(outRefundNo: string): Promise<{
    refundStatus: string
    refundId?: string
    outRefundNo?: string
    amountFen?: number
    totalAmountFen?: number
  }> {
    const response = await this.request(
      'GET',
      `/v3/refund/domestic/refunds/${encodeURIComponent(outRefundNo)}`
    )
    const body = this.parseBody(response)
    return {
      refundStatus: String(body.status || ''),
      refundId: typeof body.refund_id === 'string' ? body.refund_id : undefined,
      outRefundNo:
        typeof body.out_refund_no === 'string' ? body.out_refund_no : undefined,
      amountFen: Number.isInteger(body.amount?.refund) ? body.amount.refund : undefined,
      totalAmountFen: Number.isInteger(body.amount?.total) ? body.amount.total : undefined,
    }
  }

  async queryTrade(outTradeNo: string): Promise<{
    tradeState: string
    transactionId?: string
    amountFen?: number
  }> {
    if (this.isMockPaymentEnabled()) return { tradeState: 'NOTPAY' }

    const mchid = encodeURIComponent(this.required('WECHAT_MCH_ID'))
    const response = await this.request(
      'GET',
      `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${mchid}`
    )
    const body = this.parseBody(response)
    return {
      tradeState: String(body.trade_state || ''),
      transactionId:
        typeof body.transaction_id === 'string' ? body.transaction_id : undefined,
      amountFen: Number.isInteger(body.amount?.total) ? body.amount.total : undefined,
    }
  }

  async closeTrade(outTradeNo: string): Promise<{ tradeState: string }> {
    if (this.isMockPaymentEnabled()) return { tradeState: 'CLOSED' }

    await this.request(
      'POST',
      `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}/close`,
      { mchid: this.required('WECHAT_MCH_ID') }
    )
    return { tradeState: 'CLOSED' }
  }

  buildClientPaymentParams(prepayId: string): {
    appId: string
    timeStamp: string
    nonceStr: string
    package: string
    signType: 'RSA'
    paySign: string
  } {
    const appId = this.required('WECHAT_APP_ID')
    const timeStamp = Math.floor(Date.now() / 1000).toString()
    const nonceStr = randomBytes(16).toString('hex')
    const packageValue = `prepay_id=${prepayId}`
    const signer = createSign('RSA-SHA256')
    signer.update(`${appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`)
    signer.end()
    return {
      appId,
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: 'RSA',
      paySign: signer.sign(this.privateKey(), 'base64'),
    }
  }

  private async request(
    method: string,
    path: string,
    payload?: Record<string, unknown>
  ): Promise<WechatPayResponse> {
    if (this.configService.get<string>('WECHAT_PAY_ENABLED') !== 'true') {
      throw new ServiceUnavailableException('微信支付功能开关未启用')
    }
    const body = payload ? JSON.stringify(payload) : ''
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = randomBytes(16).toString('hex')
    const signer = createSign('RSA-SHA256')
    signer.update(`${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`)
    signer.end()
    const authorization =
      `WECHATPAY2-SHA256-RSA2048 mchid="${this.required('WECHAT_MCH_ID')}",` +
      `nonce_str="${nonce}",signature="${signer.sign(this.privateKey(), 'base64')}",` +
      `timestamp="${timestamp}",serial_no="${this.required('WECHAT_MCH_CERT_SERIAL_NO')}"`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: authorization,
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
        },
        body: payload ? body : undefined,
        signal: controller.signal,
      })
      const responseBody = await response.text()
      this.verifyResponse(response, responseBody)
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `微信支付接口返回错误（HTTP ${response.status}）`
        )
      }
      return { status: response.status, headers: response.headers, body: responseBody }
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error
      }
      throw new ServiceUnavailableException('微信支付请求失败或结果未知')
    } finally {
      clearTimeout(timeout)
    }
  }

  private verifyResponse(response: Response, body: string): void {
    const timestamp = response.headers.get('wechatpay-timestamp') || ''
    const nonce = response.headers.get('wechatpay-nonce') || ''
    const signature = response.headers.get('wechatpay-signature') || ''
    const serial = response.headers.get('wechatpay-serial') || ''
    if (
      serial !== this.required('WECHAT_PLATFORM_SERIAL_NO') ||
      !timestamp ||
      !nonce ||
      !signature ||
      !this.isFreshTimestamp(timestamp)
    ) {
      throw new UnauthorizedException('微信支付应答缺少有效验签信息')
    }
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${timestamp}\n${nonce}\n${body}\n`, 'utf8')
    verifier.end()
    if (!verifier.verify(this.publicKey(), signature, 'base64')) {
      throw new UnauthorizedException('微信支付应答签名无效')
    }
  }

  private isFreshTimestamp(value: string): boolean {
    if (!/^\d{1,12}$/.test(value)) return false
    return Math.abs(Math.floor(Date.now() / 1000) - Number(value)) <= 300
  }

  private parseBody(response: WechatPayResponse): Record<string, any> {
    try {
      return JSON.parse(response.body)
    } catch {
      throw new ServiceUnavailableException('微信支付返回了无效响应')
    }
  }

  private validateAmount(amount: number): number {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ServiceUnavailableException('支付金额必须为正整数分')
    }
    return amount
  }

  private validateNotifyUrl(value: string): string {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new ServiceUnavailableException('微信支付回调地址无效')
    }
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new ServiceUnavailableException('微信支付回调地址必须使用 HTTPS')
    }
    return url.toString()
  }

  private required(name: string): string {
    const value = this.configService.get<string>(name)?.trim()
    if (!value) throw this.unavailable()
    return value
  }

  private privateKey(): string {
    return this.required('WECHAT_MCH_PRIVATE_KEY').replace(/\\n/g, '\n')
  }

  private publicKey(): string {
    return this.required('WECHAT_PLATFORM_PUBLIC_KEY').replace(/\\n/g, '\n')
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException(
      '微信支付未配置完整，当前环境不可发起真实交易'
    )
  }
}
