import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { CategoryService } from './category.service'
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto'

@Controller('shop/categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  async getCategories() {
    return this.categoryService.getAllCategories()
  }

  @Post()
  @UseGuards(AdminJwtGuard)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto)
  }

  @Put(':id')
  @UseGuards(AdminJwtGuard)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(BigInt(id), dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtGuard)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(BigInt(id))
  }
}

@Controller('admin/shop/categories')
export class AdminCategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  @UseGuards(AdminJwtGuard)
  async getAllCategories() {
    return this.categoryService.getAllCategories()
  }

  @Post()
  @UseGuards(AdminJwtGuard)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto)
  }

  @Put(':id')
  @UseGuards(AdminJwtGuard)
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(BigInt(id), dto)
  }

  @Delete(':id')
  @UseGuards(AdminJwtGuard)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(BigInt(id))
  }
}
