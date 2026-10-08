import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import {
  ProductController,
  ProductLeadAdminController,
  ProductModuleController,
  ProductPartnerController,
  TagDictionaryPublicController,
} from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from '../common/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';

@Module({
  imports: [PrismaModule, PassportModule, AuthModule],
  controllers: [
    ProductController,
    ProductLeadAdminController,
    ProductModuleController,
    ProductPartnerController,
    TagDictionaryPublicController,
  ],
  providers: [ProductService, OptionalJwtGuard],
})
export class ProductModule {}
