import { Module } from '@nestjs/common'
import { BannerController } from './banner.controller'
import { BannerService } from './banner.service'
import { PrismaModule } from '../common/prisma.module'
import { AdminModule } from '../admin/admin.module'

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [BannerController],
  providers: [BannerService],
})
export class BannerModule {}
