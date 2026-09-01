import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { PrismaModule } from '../common/prisma.module'
import { VenueModule } from '../venue/venue.module'
import {
  ActivityAdminController,
  ActivityController,
  ActivityRegistrationAdminController,
} from './activity.controller'
import { ActivityService } from './activity.service'

@Module({
  imports: [PrismaModule, AdminModule, VenueModule],
  controllers: [ActivityController, ActivityAdminController, ActivityRegistrationAdminController],
  providers: [ActivityService],
})
export class ActivityModule {}
