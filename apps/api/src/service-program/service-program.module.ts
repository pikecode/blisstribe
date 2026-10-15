import { ServiceOperationsController } from './service-operations.controller'
import { ServiceExpiredOrderTask } from './goods/expired-order.task'
import { ServiceGoodsReturnService } from './goods/returns.service'
import { ServiceGoodsReturnAdminController, ServiceGoodsReturnUserController } from './goods/goods.controller'
import { ServiceGoodsService } from './goods/goods.service'
import { ServiceGoodsAdminController, ServiceGoodsUserController } from './goods/goods.controller'
import { ServiceDisputeService } from './dispute/dispute.service'
import { ServiceDisputeAdminController, ServiceDisputeUserController } from './dispute/dispute.controller'
import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { PrismaModule } from '../common/prisma.module'
import {
  ServiceInstitutionAdminController,
  ServiceOfferingAdminController,
  ServiceOfferingPublicController,
} from './offering/offering.controller'
import { ServiceOfferingService } from './offering/offering.service'
import { AuthModule } from '../auth/auth.module'
import {
  ServiceQualificationAdminController,
  ServiceQualificationUserController,
} from './qualification/qualification.controller'
import { ServiceQualificationService } from './qualification/qualification.service'
import { ServiceOrderAdminController, ServiceOrderController } from './order/order.controller'
import { ServiceOrderService } from './order/order.service'
import { PaymentChannelModule } from '../payment-channel/payment-channel.module'
import { ServicePaymentController, ServicePaymentWebhookController } from './payment/payment.controller'
import { ServicePaymentService } from './payment/payment.service'
import { ServiceAppointmentAdminController, ServiceAppointmentUserController } from './appointment/appointment.controller'
import { ServiceAppointmentService } from './appointment/appointment.service'
import { ServiceRefundAdminController, ServiceRefundUserController, ServiceRefundWebhookController } from './refund/refund.controller'
import { ServiceRefundService } from './refund/refund.service'
import { ServiceFollowUpAdminController, ServiceFollowUpUserController } from './follow-up/follow-up.controller'
import { ServiceFollowUpService } from './follow-up/follow-up.service'

@Module({
  imports: [PrismaModule, AdminModule, AuthModule, PaymentChannelModule],
  controllers: [
    ServiceOperationsController,
    ServiceDisputeAdminController, ServiceDisputeUserController,
    ServiceGoodsReturnAdminController, ServiceGoodsReturnUserController,
    ServiceGoodsAdminController, ServiceGoodsUserController,
    ServiceFollowUpAdminController,
    ServiceFollowUpUserController,
    ServiceOfferingPublicController,
    ServiceInstitutionAdminController,
    ServiceOfferingAdminController,
    ServiceQualificationAdminController,
    ServiceQualificationUserController,
    ServiceOrderController,
    ServiceOrderAdminController,
    ServicePaymentController,
    ServicePaymentWebhookController,
    ServiceAppointmentUserController,
    ServiceAppointmentAdminController,
    ServiceRefundUserController,
    ServiceRefundAdminController,
    ServiceRefundWebhookController,
  ],
  providers: [ServiceDisputeService, ServiceExpiredOrderTask, ServiceGoodsReturnService, ServiceGoodsService, ServiceFollowUpService, ServiceOfferingService, ServiceQualificationService, ServiceOrderService, ServicePaymentService, ServiceAppointmentService, ServiceRefundService],
  exports: [ServiceOfferingService, ServiceQualificationService, ServiceOrderService, ServicePaymentService, ServiceAppointmentService, ServiceRefundService],
})
export class ServiceProgramModule {}
