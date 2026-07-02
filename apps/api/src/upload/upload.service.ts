import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

@Injectable()
export class UploadService {
  private readonly uploadDir: string

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads')
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async saveBanner(file: Express.Multer.File): Promise<{ url: string }> {
    const ext = extname(file.originalname) || '.jpg'
    const filename = `banner_${randomUUID()}${ext}`
    const filepath = join(this.uploadDir, filename)
    writeFileSync(filepath, file.buffer)
    const baseUrl = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:4000')
    return { url: `${baseUrl}/uploads/${filename}` }
  }

  async saveAvatar(file: Express.Multer.File): Promise<{ url: string; width: number; height: number; size: number }> {
    const ext = extname(file.originalname) || '.jpg'
    const filename = `avatar_${randomUUID()}${ext}`
    const filepath = join(this.uploadDir, filename)
    writeFileSync(filepath, file.buffer)

    // 生产环境应上传到 OSS/COS 并返回 CDN URL
    // 这里返回本地静态服务 URL
    const baseUrl = this.config.get<string>('PUBLIC_BASE_URL', 'http://localhost:4000')
    return {
      url: `${baseUrl}/uploads/${filename}`,
      width: 0, // TODO: 用 sharp 解析图片尺寸
      height: 0,
      size: file.size,
    }
  }
}
