import { Module } from '@nestjs/common'
import { PrismaModule } from '../common/prisma.module'
import { CategoryRepository } from './category/category.repository'
import { CategoryService } from './category/category.service'
import { CategoryController, AdminCategoryController } from './category/category.controller'
import { ProductRepository } from './product/product.repository'
import { ProductService } from './product/product.service'
import { ProductController, AdminProductController } from './product/product.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController, AdminCategoryController, ProductController, AdminProductController],
  providers: [CategoryRepository, CategoryService, ProductRepository, ProductService],
  exports: [CategoryService, ProductService],
})
export class ShopModule {}
