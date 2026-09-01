import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { PrismaModule } from '../common/prisma.module'
import { VenueAdminController, VenueController } from './venue.controller'
import { VenueService } from './venue.service'

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [VenueController, VenueAdminController],
  providers: [VenueService],
  exports: [VenueService],
})
export class VenueModule {}
