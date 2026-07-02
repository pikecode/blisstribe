import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'
import { AdminModule } from '../admin/admin.module'

@Module({
  imports: [AdminModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
