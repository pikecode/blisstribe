import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CartService } from './cart.service'
import { AddCartItemDto, UpdateCartItemDto } from '../dto/cart.dto'

@Controller('shop/cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: { userId: string }) {
    const userId = BigInt(user.userId)
    return this.cartService.getCart(userId)
  }

  @Post('items')
  async addItem(@CurrentUser() user: { userId: string }, @Body() dto: AddCartItemDto) {
    const userId = BigInt(user.userId)
    return this.cartService.addItem(userId, dto)
  }

  @Patch('items/:id')
  async updateItem(
    @CurrentUser() user: { userId: string },
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto
  ) {
    const userId = BigInt(user.userId)
    return this.cartService.updateItem(userId, BigInt(itemId), dto)
  }

  @Delete('items/:id')
  async removeItem(@CurrentUser() user: { userId: string }, @Param('id') itemId: string) {
    const userId = BigInt(user.userId)
    return this.cartService.removeItem(userId, BigInt(itemId))
  }

  @Delete()
  async clearCart(@CurrentUser() user: { userId: string }) {
    const userId = BigInt(user.userId)
    return this.cartService.clearCart(userId)
  }
}
