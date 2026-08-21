import { Controller, Get, Logger, Query, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response as ExpressResponse } from 'express'
import * as QRCode from 'qrcode'

@Controller('miniapp')
export class MiniappController {
  private readonly logger = new Logger(MiniappController.name)

  constructor(private readonly config: ConfigService) {}

  @Get('qrcode')
  async getQrcode(
    @Query('inviteCode') inviteCode: string,
    @Res() res: ExpressResponse
  ): Promise<void> {
    const safeInviteCode = this.normalizeInviteCode(inviteCode)

    try {
      const token = await this.getAccessToken()
      const resp = await this.fetchWithTimeout(
        `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scene: safeInviteCode ? `code=${safeInviteCode}` : 'code=',
            page: 'pages/index/index',
            width: 280,
            auto_color: false,
            line_color: { r: 0, g: 0, b: 0 },
          }),
        }
      )

      const contentType = resp.headers.get('content-type') || ''
      if (contentType.includes('image')) {
        const buffer = await resp.arrayBuffer()
        this.sendImage(res, Buffer.from(buffer), contentType, false)
        return
      }

      const json = (await resp.json()) as { errcode?: number; errmsg?: string }
      this.logger.warn(
        `微信小程序码生成失败: ${json.errcode ?? 'unknown'} ${json.errmsg ?? 'unknown'}`
      )
    } catch (error) {
      this.logger.warn(
        `微信小程序码生成异常，使用本地二维码兜底: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    const fallbackBuffer = await this.buildLocalQrcode(safeInviteCode)
    this.sendImage(res, fallbackBuffer, 'image/png', true)
  }

  private async getAccessToken(): Promise<string> {
    const appId = this.config.get<string>('WX_APP_ID')!
    const secret = this.config.get<string>('WX_APP_SECRET')!
    const r = await this.fetchWithTimeout(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`
    )
    const data = (await r.json()) as { access_token?: string; errmsg?: string }
    if (!data.access_token) throw new Error(data.errmsg || '获取access_token失败')
    return data.access_token
  }

  private normalizeInviteCode(inviteCode?: string): string {
    return (inviteCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 32)
  }

  private async buildLocalQrcode(inviteCode: string): Promise<Buffer> {
    const path = inviteCode
      ? `/pages/index/index?inviteCode=${encodeURIComponent(inviteCode)}`
      : '/pages/index/index'

    return QRCode.toBuffer(path, {
      type: 'png',
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  }

  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
    timeoutMs = 8000
  ): Promise<globalThis.Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  private sendImage(
    res: ExpressResponse,
    buffer: Buffer,
    contentType: string,
    fallback: boolean
  ): void {
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', fallback ? 'public, max-age=300' : 'public, max-age=86400')
    if (fallback) {
      res.setHeader('X-Qrcode-Fallback', 'local')
    }
    res.send(buffer)
  }
}
