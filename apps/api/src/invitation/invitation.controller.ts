import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { InvitationService } from './invitation.service'
import { JwtAuthGuard } from '../common/guards/jwt.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'

@Controller('invitation')
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  // 获取我的邀请码
  @Get('my-code')
  async getMyCode(@CurrentUser() user: { userId: string }) {
    const code = await this.invitationService.getMyCode(BigInt(user.userId))
    return { inviteCode: code }
  }

  // 使用邀请码
  @Post('use-code')
  async useCode(
    @CurrentUser() user: { userId: string },
    @Body('code') code: string
  ) {
    await this.invitationService.useInviteCode(BigInt(user.userId), code)
    return { success: true }
  }

  // 获取我的邀请记录
  @Get('my-invitations')
  async getMyInvitations(@CurrentUser() user: { userId: string }) {
    return this.invitationService.getMyInvitations(BigInt(user.userId))
  }
}

@Controller('admin/invitation')
@UseGuards(AdminJwtGuard)
export class AdminInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  // 邀请统计
  @Get('stats')
  async getStats() {
    return this.invitationService.getStats()
  }

  // 邀请记录列表
  @Get('records')
  async getRecords(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('keyword') keyword?: string
  ) {
    return this.invitationService.getRecords({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
    })
  }
}
