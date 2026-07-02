import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { createHmac } from 'crypto'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  // 1. 创建初始管理员
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      nickname: '超级管理员',
      status: 1,
    },
  })
  console.log(`管理员已就绪: ${admin.username} / admin123`)

  // 2. 创建初始协议版本
  for (const type of ['user', 'privacy'] as const) {
    await prisma.agreement.upsert({
      where: { type_version: { type, version: '1.0' } },
      update: {},
      create: {
        type,
        version: '1.0',
        title: type === 'user' ? '用户服务协议' : '隐私保护政策',
        content: `${type === 'user' ? '用户服务协议' : '隐私保护政策'}内容（待补充）`,
        isCurrent: true,
        effectiveAt: new Date(),
      },
    })
  }
  console.log('协议初版已就绪')

  // 3. 创建角色与权限（RBAC）
  const superAdminRole = await prisma.role.upsert({
    where: { code: 'super_admin' },
    update: {},
    create: { code: 'super_admin', name: '超级管理员', status: 1 },
  })
  await prisma.adminRole.upsert({
    where: { adminId_roleId: { adminId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { adminId: admin.id, roleId: superAdminRole.id },
  })

  const permissions = [
    { code: 'user:read', name: '查看用户' },
    { code: 'user:write', name: '编辑用户' },
    { code: 'agreement:publish', name: '发布协议' },
    { code: 'stats:read', name: '查看统计' },
  ]
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    })
  }
  console.log('RBAC 初始化完成')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// 辅助：HMAC（与 service 一致，便于测试数据）
export function hmac(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('hex')
}
