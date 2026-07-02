import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
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

  @Put('password')
  async setPassword(
    @CurrentUser() user: { userId: string },
    @Body() dto: SetPasswordDto
  ) {
    return this.userService.setPassword(user.userId, dto)
  }
}
