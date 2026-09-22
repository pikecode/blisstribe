import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CartService } from './cart.service'
import { AddCartItemDto, UpdateCartItemDto } from '../dto/cart.dto'

@Controller('shop/cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@Request() req: any) {
    const userId = BigInt(req.user.id)
    return this.cartService.getCart(userId)
  }

  @Post('items')
  async addItem(@Request() req: any, @Body() dto: AddCartItemDto) {
    const userId = BigInt(req.user.id)
    return this.cartService.addItem(userId, dto)
  }

  @Patch('items/:id')
  async updateItem(
    @Request() req: any,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto
  ) {
    const userId = BigInt(req.user.id)
    return this.cartService.updateItem(userId, BigInt(itemId), dto)
  }

  @Delete('items/:id')
  async removeItem(@Request() req: any, @Param('id') itemId: string) {
    const userId = BigInt(req.user.id)
    return this.cartService.removeItem(userId, BigInt(itemId))
  }

  @Delete()
  async clearCart(@Request() req: any) {
    const userId = BigInt(req.user.id)
    return this.cartService.clearCart(userId)
  }
}
