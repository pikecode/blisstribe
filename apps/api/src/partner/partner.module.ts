import { Module } from '@nestjs/common'
import { PrismaModule } from '../common/prisma.module'
import { PartnerAdminController, PartnerController } from './partner.controller'
import { PartnerService } from './partner.service'

@Module({
  imports: [PrismaModule],
  controllers: [PartnerController, PartnerAdminController],
  providers: [PartnerService],
  exports: [PartnerService],
})
export class PartnerModule {}
