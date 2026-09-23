import { Module, forwardRef } from '@nestjs/common'
import { InvitationController, AdminInvitationController } from './invitation.controller'
import { InvitationService } from './invitation.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [InvitationController, AdminInvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}{}
