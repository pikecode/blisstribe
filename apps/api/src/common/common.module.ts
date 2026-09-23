import { Module, Global } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtAuthGuard } from './guards/jwt.guard'
import { AdminJwtGuard } from './guards/admin-jwt.guard'
import { OptionalJwtGuard } from './guards/optional-jwt.guard'

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get<string>('ACCESS_TOKEN_EXPIRES', '2h') },
      }),
    }),
  ],
  providers: [JwtAuthGuard, AdminJwtGuard, OptionalJwtGuard],
  exports: [JwtAuthGuard, AdminJwtGuard, OptionalJwtGuard, JwtModule, PassportModule],
})
export class CommonModule {}