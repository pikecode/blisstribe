import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common'
import { UserService } from './user.service'
import { UpdateUserDto, SetPasswordDto } from './dto'
import { JwtAuthGuard } from '../common/guards/jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('info')
  async getInfo(@CurrentUser() user: { userId: string }) {
    return this.userService.getInfo(user.userId)
  }

  @Put('info')
  async updateInfo(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto
  ) {
    return this.userService.updateInfo(user.userId, dto)
  }

  @Delete('account')
  async deactivateAccount(@CurrentUser() user: { userId: string }) {
    await this.userService.deactivateAccount(user.userId)
    return { success: true }
  }
}
