import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common'
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard'
import { ProductService } from './product.service'
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto'

@Controller('shop/products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  async getPublishedProducts(
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string
  ) {
    const categoryIdBig = categoryId ? BigInt(categoryId) : undefined
    return this.productService.getPublishedProductsPage({
      categoryId: categoryIdBig,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      keyword,
    })
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(BigInt(id))
  }
}

@Controller('admin/shop/products')
export class AdminProductController {
  constructor(private productService: ProductService) {}

  @Get()
  @UseGuards(AdminJwtGuard)
  async getAllProducts(
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    const categoryIdBig = categoryId ? BigInt(categoryId) : undefined
    return this.productService.getAllProducts({
      categoryId: categoryIdBig,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      keyword,
    })
  }

  @Post()
  @UseGuards(AdminJwtGuard)
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto)
  }

  @Put(':id')
  @UseGuards(AdminJwtGuard)
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(BigInt(id), dto)
  }

  @Post(':id/publish')
  @UseGuards(AdminJwtGuard)
  async publishProduct(@Param('id') id: string) {
    return this.productService.publishProduct(BigInt(id))
  }

  @Post(':id/unpublish')
  @UseGuards(AdminJwtGuard)
  async unpublishProduct(@Param('id') id: string) {
    return this.productService.unpublishProduct(BigInt(id))
  }

  @Delete(':id')
  @UseGuards(AdminJwtGuard)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(BigInt(id))
  }
}
