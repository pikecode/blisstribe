import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class WechatPayService {
  constructor(private configService: ConfigService) {}

  async createPrepay(params: {
    outTradeNo: string
    amount: number
    description: string
    notifyUrl: string
    clientIp: string
  }): Promise<{ prepayId: string }> {
    void params
    throw this.unavailable()
  }

  verifyNotifySignature(body: string, headers: {
    'wechat-pay-timestamp': string
    'wechat-pay-nonce': string
    'wechat-pay-signature': string
  }): boolean {
    void body
    void headers
    return false
  }

  async decryptNotify(encryptedData: {
    algorithm: string
    ciphertext: string
    associated_data: string
    nonce: string
  }): Promise<any> {
    void encryptedData
    throw this.unavailable()
  }

  async refund(params: {
    transactionId: string
    outRefundNo: string
    amount: number
    reason: string
  }): Promise<{ refundId: string }> {
    void params
    throw this.unavailable()
  }

  async queryTrade(outTradeNo: string): Promise<{
    tradeState: string
    transactionId?: string
    amountFen?: number
  }> {
    void outTradeNo
    throw this.unavailable()
  }

  async closeTrade(outTradeNo: string): Promise<{ tradeState: string }> {
    void outTradeNo
    throw this.unavailable()
  }

  private unavailable(): ServiceUnavailableException {
    const hasMerchantConfig = Boolean(
      this.configService.get<string>('WECHAT_APP_ID') &&
      this.configService.get<string>('WECHAT_MCH_ID') &&
      this.configService.get<string>('WECHAT_API_V3_KEY') &&
      this.configService.get<string>('WECHAT_MCH_PRIVATE_KEY') &&
      this.configService.get<string>('WECHAT_MCH_CERT_SERIAL_NO') &&
      this.configService.get<string>('WECHAT_PLATFORM_PUBLIC_KEY')
    )
    return new ServiceUnavailableException(
      hasMerchantConfig
        ? '微信支付适配器尚未实现'
        : '微信支付未配置，当前环境不可发起真实交易'
    )
  }
}
