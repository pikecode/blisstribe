import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { AdminModule } from './admin/admin.module'
import { AgreementModule } from './agreement/agreement.module'
import { UploadModule } from './upload/upload.module'
import { StatsModule } from './stats/stats.module'
import { PrismaModule } from './common/prisma.module'
import { RedisModule } from './common/redis.module'
import { CommonModule } from './common/common.module'

import { InvitationModule } from './invitation/invitation.module'
import { BannerModule } from './banner/banner.module'
import { MiniappModule } from './miniapp/miniapp.module'
import { PartnerModule } from './partner/partner.module'
import { ProductModule } from './product/product.module'
import { ActivityModule } from './activity/activity.module'
import { VenueModule } from './venue/venue.module'
import { ShopModule } from './shop/shop.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    CommonModule,
    AuthModule,
    UserModule,
    AdminModule,
    AgreementModule,
    UploadModule,
    StatsModule,
    InvitationModule,
    BannerModule,
    MiniappModule,
    PartnerModule,
    ProductModule,
    VenueModule,
    ActivityModule,
    ShopModule,
  ],
})
export class AppModule {}
