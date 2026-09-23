import { Module } from '@nestjs/common'
import { AgreementController } from './agreement.controller'
import { AgreementService } from './agreement.service'
import { AdminModule } from '../admin/admin.module'

@Module({
  imports: [AdminModule],
  controllers: [AgreementController],
  providers: [AgreementService],
})
export class AgreementModule {}
