import { Injectable, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, basename } from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

@Injectable()
export class UploadService {
  private readonly uploadDir: string
  readonly baseUrl: string

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads')
    const base = this.config.get<string>('PUBLIC_BASE_URL')
    if (!base) throw new Error('PUBLIC_BASE_URL env var is required')
    this.baseUrl = base
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async saveAvatar(file: Express.Multer.File): Promise<{ url: string; width: number; height: number; size: number }> {
    this.validateMagicBytes(file.buffer, file.mimetype)
    const image = sharp(file.buffer)
    const metadata = await image.metadata()
    const compressed = await image
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    const filename = `avatar_${randomUUID()}.webp`
    writeFileSync(join(this.uploadDir, filename), compressed)
    return {
      url: `${this.baseUrl}/uploads/${filename}`,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      size: compressed.length,
    }
  }

  async saveBanner(file: Express.Multer.File): Promise<{ url: string }> {
    this.validateMagicBytes(file.buffer, file.mimetype)
    const compressed = await sharp(file.buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
    const filename = `banner_${randomUUID()}.webp`
    writeFileSync(join(this.uploadDir, filename), compressed)
    return { url: `${this.baseUrl}/uploads/${filename}` }
  }

  async saveCover(file: Express.Multer.File): Promise<{ url: string }> {
    this.validateMagicBytes(file.buffer, file.mimetype)
    const compressed = await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()
    const filename = `cover_${randomUUID()}.webp`
    writeFileSync(join(this.uploadDir, filename), compressed)
    return { url: `${this.baseUrl}/uploads/${filename}` }
  }

  deleteFile(imageUrl: string) {
    if (!imageUrl) return
    try {
      const filename = basename(new URL(imageUrl).pathname)
      const filepath = join(this.uploadDir, filename)
      if (existsSync(filepath)) unlinkSync(filepath)
    } catch {
      // URL 解析失败或文件已不存在，忽略
    }
  }

  private validateMagicBytes(buffer: Buffer, mimetype: string) {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP'
    const valid = (mimetype === 'image/jpeg' && isJpeg)
      || (mimetype === 'image/png' && isPng)
      || (mimetype === 'image/webp' && isWebp)
    if (!valid) throw new BadRequestException('文件内容与声明的格式不符')
  }
}
