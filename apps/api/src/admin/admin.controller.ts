import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import {
  AdminLoginDto,
  AdminCreateUserDto,
  AdminUpdateUserDto,
  CreateAdminDto,
  UpdateAdminDto,
  ResetPasswordDto,
  AssignRolesDto,
} from './dto'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { CurrentAdmin } from '../common/decorators/current-admin.decorator'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 管理员登录
  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto)
  }

  // 用户管理
  @UseGuards(AdminJwtGuard)
  @Get('users')
  async listUsers(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string
  ) {
    return this.adminService.listUsers(Number(page), Number(pageSize), keyword)
  }

  @UseGuards(AdminJwtGuard)
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id)
  }

  @UseGuards(AdminJwtGuard)
  @Post('users')
  async createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto)
  }

  @UseGuards(AdminJwtGuard)
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto)
  }

  @UseGuards(AdminJwtGuard)
  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: number }
  ) {
    return this.adminService.updateUserStatus(id, body.status)
  }

  // ===== 管理员管理 =====

  // 管理员列表
  @UseGuards(AdminJwtGuard)
  @Get('admins')
  async listAdmins(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string
  ) {
    return this.adminService.listAdmins(Number(page), Number(pageSize), keyword)
  }

  // 新增管理员
  @UseGuards(AdminJwtGuard)
  @Post('admins')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto)
  }

  // 编辑管理员
  @UseGuards(AdminJwtGuard)
  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, dto)
  }

  // 启停管理员
  @UseGuards(AdminJwtGuard)
  @Put('admins/:id/status')
  async updateAdminStatus(
    @Param('id') id: string,
    @Body() body: { status: number }
  ) {
    return this.adminService.updateAdminStatus(id, body.status)
  }

  // 重置管理员密码
  @UseGuards(AdminJwtGuard)
  @Put('admins/:id/password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.adminService.resetPassword(id, dto)
  }

  // 给管理员分配角色
  @UseGuards(AdminJwtGuard)
  @Put('admins/:id/roles')
  async assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.adminService.assignRoles(id, dto.roleIds)
  }

  // ===== 角色与权限 =====

  @UseGuards(AdminJwtGuard)
  @Get('roles')
  async listRoles() {
    return this.adminService.listRoles()
  }

  @UseGuards(AdminJwtGuard)
  @Post('roles')
  async createRole(@Body() body: { code: string; name: string }) {
    return this.adminService.createRole(body.code, body.name)
  }

  // 当前管理员信息
  @UseGuards(AdminJwtGuard)
  @Get('profile')
  async getProfile(@CurrentAdmin() admin: { adminId: string }) {
    return this.adminService.getProfile(admin.adminId)
  }
}
