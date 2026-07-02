import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { AdminModule } from './admin/admin.module'
import { AgreementModule } from './agreement/agreement.module'
import { UploadModule } from './upload/upload.module'
import { StatsModule } from './stats/stats.module'
import { PrismaModule } from './common/prisma.module'
import { RedisModule } from './common/redis.module'

import { InvitationModule } from './invitation/invitation.module'
import { BannerModule } from './banner/banner.module'
import { MiniappModule } from './miniapp/miniapp.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    AdminModule,
    AgreementModule,
    UploadModule,
    StatsModule,
    InvitationModule,
    BannerModule,
    MiniappModule,
  ],
})
export class AppModule {}
