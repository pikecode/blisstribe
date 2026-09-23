import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化测试数据...')

  try {
    // 创建管理员
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        phone: '13800000001',
        roles: ['admin'],
        isVerified: true,
      },
    })
    console.log('✓ 管理员创建成功:', admin.email)

    // 创建测试客户
    const customer = await prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        username: 'user',
        password: await bcrypt.hash('user123', 10),
        phone: '13800000002',
        roles: ['user'],
        isVerified: true,
      },
    })
    console.log('✓ 测试用户创建成功:', customer.email)

    console.log('✅ 测试数据初始化完成！')
    console.log('\n登录凭证：')
    console.log('后台管理: admin@test.com / admin123')
    console.log('普通用户: user@test.com / user123')
  } catch (error) {
    console.error('❌ 错误:', error)
    process.exit(1)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
