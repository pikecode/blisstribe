import { Module } from '@nestjs/common'
import { PrismaModule } from '../common/prisma.module'
import { AdminModule } from '../admin/admin.module'
import { ProductService } from './product.service'
import {
  AssessmentTemplateAdminController,
  ProductAdminController,
  ProductController,
  ProductLeadAdminController,
  ProductModuleController,
  ProductModuleAdminController,
  ProductPartnerController,
  TagDictionaryPublicController,
  RecommendationRuleAdminController,
  TagDictionaryAdminController,
} from './product.controller'

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [
    ProductController,
    ProductModuleController,
    ProductModuleAdminController,
    AssessmentTemplateAdminController,
    ProductAdminController,
    ProductLeadAdminController,
    RecommendationRuleAdminController,
    TagDictionaryPublicController,
    TagDictionaryAdminController,
    ProductPartnerController,
  ],
  providers: [ProductService],
})
export class ProductModule {}
