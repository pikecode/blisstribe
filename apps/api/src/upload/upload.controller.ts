import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadService } from './upload.service'
import { JwtAuthGuard } from '../common/guards/jwt.guard'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
          return cb(new BadRequestException('仅支持 jpg/png 格式'), false)
        }
        cb(null, true)
      },
    })
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件')
    return this.uploadService.saveAvatar(file)
  }

  @UseGuards(AdminJwtGuard)
  @Post('banner')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          return cb(new BadRequestException('仅支持 jpg/png/webp 格式'), false)
        }
        cb(null, true)
      },
    })
  )
  async uploadBanner(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请上传文件')
    return this.uploadService.saveBanner(file)
  }
}
