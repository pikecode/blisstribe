import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from '../common/prisma.module'
import { CategoryRepository } from './category/category.repository'
import { CategoryService } from './category/category.service'
import { CategoryController, AdminCategoryController } from './category/category.controller'
import { ProductRepository } from './product/product.repository'
import { ProductService } from './product/product.service'
import { ProductController, AdminProductController } from './product/product.controller'
import { CartRepository } from './cart/cart.repository'
import { CartService } from './cart/cart.service'
import { CartController } from './cart/cart.controller'
import { OrderRepository } from './order/order.repository'
import { OrderService } from './order/order.service'
import { OrderController, AdminOrderController } from './order/order.controller'
import { PaymentRepository } from './payment/payment.repository'
import { WechatPayService } from './payment/wechat-pay.service'
import { PaymentService } from './payment/payment.service'
import { PaymentController, PaymentWebhookController } from './payment/payment.controller'
import { ExpiredOrderTask } from './common/tasks/expired-order.task'
import { ReconciliationTask } from './common/tasks/reconciliation.task'
import { RefundRepository } from './refund/refund.repository'
import { RefundService } from './refund/refund.service'
import { RefundController, AdminRefundController, RefundWebhookController } from './refund/refund.controller'

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [
    CategoryController,
    AdminCategoryController,
    ProductController,
    AdminProductController,
    CartController,
    OrderController,
    AdminOrderController,
    PaymentController,
    PaymentWebhookController,
    RefundController,
    AdminRefundController,
    RefundWebhookController,
  ],
  providers: [
    CategoryRepository,
    CategoryService,
    ProductRepository,
    ProductService,
    CartRepository,
    CartService,
    OrderRepository,
    OrderService,
    PaymentRepository,
    WechatPayService,
    PaymentService,
    RefundRepository,
    RefundService,
    ExpiredOrderTask,
    ReconciliationTask,
  ],
  exports: [CategoryService, ProductService, CartService, OrderService, PaymentService, RefundService],
})
export class ShopModule {}
