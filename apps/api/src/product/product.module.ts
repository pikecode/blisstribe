import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import {
  AssessmentTemplateAdminController,
  ProductAdminController,
  ProductController,
  ProductLeadAdminController,
  ProductModuleAdminController,
  ProductModuleController,
  ProductPartnerController,
  RecommendationRuleAdminController,
  TagDictionaryAdminController,
  TagDictionaryPublicController,
} from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from '../common/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';

@Module({
  imports: [PrismaModule, PassportModule, AuthModule],
  controllers: [
    AssessmentTemplateAdminController,
    ProductAdminController,
    ProductController,
    ProductLeadAdminController,
    ProductModuleAdminController,
    ProductModuleController,
    ProductPartnerController,
    RecommendationRuleAdminController,
    TagDictionaryAdminController,
    TagDictionaryPublicController,
  ],
  providers: [ProductService, OptionalJwtGuard],
})
export class ProductModule {}
