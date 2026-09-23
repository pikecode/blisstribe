import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { AdminJwtStrategy } from './admin-jwt.strategy'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule, PassportModule],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
  exports: [AdminJwtStrategy, AuthModule, PassportModule],
})
export class AdminModule {}
