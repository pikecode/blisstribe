import { Module } from '@nestjs/common'
import { PrismaModule } from '../common/prisma.module'
import { CategoryRepository } from './category/category.repository'
import { CategoryService } from './category/category.service'
import { CategoryController, AdminCategoryController } from './category/category.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController, AdminCategoryController],
  providers: [CategoryRepository, CategoryService],
  exports: [CategoryService],
})
export class ShopModule {}
