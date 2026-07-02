import { Controller, Get, Query, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'

@Controller('miniapp')
export class MiniappController {
  constructor(private readonly config: ConfigService) {}

  @Get('qrcode')
  async getQrcode(
    @Query('inviteCode') inviteCode: string,
    @Res() res: Response
  ): Promise<void> {
    const token = await this.getAccessToken()
    const resp = await fetch(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene: `code=${inviteCode}`,
          page: 'pages/register/register',
          width: 280,
          auto_color: false,
          line_color: { r: 0, g: 0, b: 0 },
        }),
      }
    )
    const contentType = resp.headers.get('content-type') || ''
    if (contentType.includes('image')) {
      const buffer = await resp.arrayBuffer()
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.send(Buffer.from(buffer))
    } else {
      const json = (await resp.json()) as { errcode?: number; errmsg?: string }
      res.status(500).json({ message: json.errmsg || '生成二维码失败' })
    }
  }

  private async getAccessToken(): Promise<string> {
    const appId = this.config.get<string>('WX_APP_ID')!
    const secret = this.config.get<string>('WX_APP_SECRET')!
    const r = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`
    )
    const data = (await r.json()) as { access_token?: string }
    if (!data.access_token) throw new Error('获取access_token失败')
    return data.access_token
  }
}
