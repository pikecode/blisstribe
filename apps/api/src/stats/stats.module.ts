import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'

@Module({
  imports: [PassportModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
