import { PrismaClient } from '@prisma/client'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const prisma = new PrismaClient()
const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads')
const coverDir = join(__dirname, 'assets/covers')

const categories = [
  ['sleep', '舒眠好物', '帮助放松身心，建立更舒服的睡前节奏'],
  ['exercise', '轻运动', '适合居家和办公室的轻量运动装备'],
  ['wellness', '健康日常', '把健康习惯放进每一天'],
  ['aroma', '香氛疗愈', '用气味和温度营造松弛时刻'],
  ['gift', '心意礼赠', '适合分享给家人与朋友的精选礼物'],
] as const

interface SkuSeed {
  code: string
  specs: Record<string, string>
  priceFen: number
  stock: number
  sold?: number
}

interface ProductSeed {
  category: string
  name: string
  description: string
  image: string
  sortOrder: number
  skus: SkuSeed[]
}

const products: ProductSeed[] = [
  { category: 'sleep', name: '晚安枕边香氛喷雾', description: '薰衣草与雪松的柔和气息，睡前喷洒于枕边和织物，帮助空间慢慢安静下来。', image: 'product-sleep.jpg', sortOrder: 10, skus: [
    { code: 'BT-SLEEP-SPRAY-50', specs: { 容量: '50ml' }, priceFen: 6900, stock: 36, sold: 18 },
    { code: 'BT-SLEEP-SPRAY-100', specs: { 容量: '100ml' }, priceFen: 10900, stock: 18, sold: 9 },
  ] },
  { category: 'sleep', name: '草本热敷蒸汽眼罩', description: '温热约二十分钟，适合通勤、午休和睡前使用。独立包装，外出携带方便。', image: 'product-emotion.jpg', sortOrder: 20, skus: [
    { code: 'BT-EYE-MASK-5', specs: { 规格: '5片装', 香型: '无香' }, priceFen: 2990, stock: 58, sold: 32 },
    { code: 'BT-EYE-MASK-10', specs: { 规格: '10片装', 香型: '薰衣草' }, priceFen: 4990, stock: 4, sold: 26 },
  ] },
  { category: 'sleep', name: '云感慢回弹护颈枕', description: '分区承托颈椎与肩部，柔软但不失支撑，适合仰睡和侧睡人群。', image: 'product-family.jpg', sortOrder: 30, skus: [
    { code: 'BT-PILLOW-GRAY', specs: { 颜色: '雾灰' }, priceFen: 19900, stock: 12, sold: 7 },
    { code: 'BT-PILLOW-GREEN', specs: { 颜色: '鼠尾草绿' }, priceFen: 19900, stock: 0, sold: 15 },
  ] },
  { category: 'exercise', name: '轻量防滑瑜伽垫', description: '细腻防滑纹理，兼顾缓冲与稳定，适合瑜伽、拉伸和居家力量训练。', image: 'product-weight.jpg', sortOrder: 10, skus: [
    { code: 'BT-YOGA-SAGE', specs: { 颜色: '鼠尾草绿', 厚度: '6mm' }, priceFen: 12900, stock: 22, sold: 14 },
    { code: 'BT-YOGA-SAND', specs: { 颜色: '暖沙色', 厚度: '8mm' }, priceFen: 15900, stock: 9, sold: 8 },
  ] },
  { category: 'exercise', name: '深层放松筋膜球组合', description: '一软一硬双球组合，适合肩颈、足底和腿部放松，附基础动作说明卡。', image: 'product-consult.jpg', sortOrder: 20, skus: [
    { code: 'BT-FASCIA-2', specs: { 规格: '双球套装' }, priceFen: 4590, stock: 45, sold: 21 },
  ] },
  { category: 'exercise', name: '弹力训练带三件套', description: '三档阻力覆盖激活、塑形与进阶训练，收纳后只有掌心大小。', image: 'product-beauty.jpg', sortOrder: 30, skus: [
    { code: 'BT-BAND-3', specs: { 阻力: '轻/中/重' }, priceFen: 5990, stock: 27, sold: 19 },
  ] },
  { category: 'wellness', name: '一周健康习惯手账', description: '用七天记录睡眠、饮水、运动与情绪，页面简洁，不给坚持增加负担。', image: 'product-consult.jpg', sortOrder: 10, skus: [
    { code: 'BT-JOURNAL-GREEN', specs: { 封面: '森林绿' }, priceFen: 3900, stock: 80, sold: 42 },
    { code: 'BT-JOURNAL-CREAM', specs: { 封面: '燕麦白' }, priceFen: 3900, stock: 65, sold: 37 },
  ] },
  { category: 'wellness', name: '轻盈随行保温杯', description: '轻量杯身与顺滑杯口，保温约六小时，适合办公室和短途出行。', image: 'product-family.jpg', sortOrder: 20, skus: [
    { code: 'BT-CUP-WHITE', specs: { 颜色: '奶油白', 容量: '420ml' }, priceFen: 8900, stock: 16, sold: 24 },
    { code: 'BT-CUP-GREEN', specs: { 颜色: '松柏绿', 容量: '420ml' }, priceFen: 8900, stock: 3, sold: 31 },
  ] },
  { category: 'wellness', name: '晚间舒缓花草茶', description: '洋甘菊、桂花与少量陈皮调和，无咖啡因，适合晚间温饮。', image: 'product-sleep.jpg', sortOrder: 30, skus: [
    { code: 'BT-TEA-10', specs: { 规格: '10袋装' }, priceFen: 4900, stock: 34, sold: 28 },
    { code: 'BT-TEA-20', specs: { 规格: '20袋礼盒' }, priceFen: 8600, stock: 11, sold: 16 },
  ] },
  { category: 'aroma', name: '天然大豆香薰蜡烛', description: '植物蜡低烟燃烧，木质香调温和克制，适合阅读、沐浴和独处时点燃。', image: 'product-emotion.jpg', sortOrder: 10, skus: [
    { code: 'BT-CANDLE-WOOD', specs: { 香型: '雨后雪松' }, priceFen: 7900, stock: 19, sold: 13 },
    { code: 'BT-CANDLE-TEA', specs: { 香型: '白茶无花果' }, priceFen: 7900, stock: 15, sold: 18 },
  ] },
  { category: 'aroma', name: '海盐草本泡浴盐', description: '海盐搭配迷迭香与薰衣草，适合运动后泡浴或足浴放松。', image: 'product-beauty.jpg', sortOrder: 20, skus: [
    { code: 'BT-BATH-300', specs: { 净含量: '300g' }, priceFen: 5900, stock: 24, sold: 11 },
  ] },
  { category: 'gift', name: '把松弛送给你礼盒', description: '包含花草茶、蒸汽眼罩与香氛蜡烛，附可手写心意卡。', image: 'product-family.jpg', sortOrder: 10, skus: [
    { code: 'BT-GIFT-RELAX', specs: { 包装: '经典礼盒' }, priceFen: 16900, stock: 8, sold: 12 },
    { code: 'BT-GIFT-RELAX-CARD', specs: { 包装: '礼盒+代写卡片' }, priceFen: 17900, stock: 6, sold: 9 },
  ] },
]

function copyCovers(): Record<string, string> {
  mkdirSync(uploadDir, { recursive: true })
  return Object.fromEntries([...new Set(products.map((item) => item.image))].map((name) => {
    const target = `shop-demo-${name}`
    const targetPath = join(uploadDir, target)
    if (!existsSync(targetPath)) copyFileSync(join(coverDir, name), targetPath)
    return [name, `${baseUrl}/uploads/${target}`]
  }))
}

async function seedProducts(images: Record<string, string>) {
  const categoryByCode = new Map<string, bigint>()
  for (const [code, name, description] of categories) {
    const category = await prisma.shopCategory.upsert({
      where: { code },
      update: { name, description, status: 1 },
      create: { code, name, description, status: 1 },
    })
    categoryByCode.set(code, category.id)
  }

  const skuByCode = new Map<string, Awaited<ReturnType<typeof prisma.shopProductSku.findUnique>>>()
  for (const item of products) {
    const existingSku = await prisma.shopProductSku.findUnique({ where: { skuCode: item.skus[0].code } })
    const product = existingSku
      ? await prisma.shopProduct.update({
          where: { id: existingSku.productId },
          data: { categoryId: categoryByCode.get(item.category)!, name: item.name, description: item.description, images: [images[item.image]], status: 1, sortOrder: item.sortOrder, deletedAt: null },
        })
      : await prisma.shopProduct.create({
          data: { categoryId: categoryByCode.get(item.category)!, name: item.name, description: item.description, images: [images[item.image]], status: 1, sortOrder: item.sortOrder },
        })

    for (const sku of item.skus) {
      const specificationKey = JSON.stringify(Object.fromEntries(Object.entries(sku.specs).sort(([a], [b]) => a.localeCompare(b))))
      const saved = await prisma.shopProductSku.upsert({
        where: { skuCode: sku.code },
        update: { productId: product.id, specifications: sku.specs, specificationKey, priceFen: sku.priceFen, totalStock: sku.stock, soldStock: sku.sold || 0, enabled: true },
        create: { productId: product.id, skuCode: sku.code, specifications: sku.specs, specificationKey, priceFen: sku.priceFen, totalStock: sku.stock, soldStock: sku.sold || 0, enabled: true },
      })
      skuByCode.set(sku.code, saved)
    }
  }
  return skuByCode
}

async function seedUserScenarios(skus: Map<string, any>, images: Record<string, string>) {
  const users = await prisma.user.findMany({ where: { status: 1, deletedAt: null }, take: 20, orderBy: { id: 'asc' } })
  if (!users.length) throw new Error('本地库没有可用用户，请先运行 pnpm prisma:seed')

  const scenarios = [
    { key: 'PENDING', status: 'pending_payment', paymentStatus: 'unpaid', fulfillmentStatus: 'pending', sku: 'BT-CANDLE-WOOD', quantity: 1 },
    { key: 'PAID', status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'pending', sku: 'BT-YOGA-SAGE', quantity: 1 },
    { key: 'SHIPPED', status: 'shipped', paymentStatus: 'paid', fulfillmentStatus: 'shipped', sku: 'BT-CUP-WHITE', quantity: 1 },
    { key: 'COMPLETED', status: 'completed', paymentStatus: 'paid', fulfillmentStatus: 'completed', sku: 'BT-GIFT-RELAX', quantity: 1 },
    { key: 'REFUND', status: 'paid', paymentStatus: 'paid', fulfillmentStatus: 'pending', sku: 'BT-EYE-MASK-10', quantity: 2 },
  ]

  const pendingSku = products.flatMap((product) => product.skus)
    .find((sku) => sku.code === 'BT-CANDLE-WOOD')!
  const pendingCapacity = Math.max(0, pendingSku.stock - (pendingSku.sold || 0))

  for (const [userIndex, user] of users.entries()) {
    const cart = await prisma.shopCart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
    for (const [code, quantity] of [['BT-TEA-10', 2], ['BT-JOURNAL-GREEN', 1], ['BT-FASCIA-2', 1]] as const) {
      await prisma.shopCartItem.upsert({
        where: { cartId_skuId: { cartId: cart.id, skuId: skus.get(code).id } },
        update: {},
        create: { cartId: cart.id, skuId: skus.get(code).id, quantity },
      })
    }

    for (const [index, scenario] of scenarios.entries()) {
      if (scenario.key === 'PENDING' && userIndex >= pendingCapacity) continue
      const sku = skus.get(scenario.sku)
      const product = products.find((item) => item.skus.some((entry) => entry.code === scenario.sku))!
      const orderNo = `DEMO${user.id.toString().padStart(4, '0')}${scenario.key}`
      const total = sku.priceFen * scenario.quantity
      const createdAt = new Date(Date.now() - (index + 1) * 2 * 24 * 60 * 60 * 1000)
      const paid = scenario.paymentStatus === 'paid'
      const existingOrder = await prisma.shopOrder.findUnique({ where: { orderNo }, select: { id: true } })
      const order = await prisma.shopOrder.upsert({
        where: { orderNo },
        update: { items: { updateMany: { where: { productImage: null }, data: { productImage: images[product.image] } } } },
        create: {
          orderNo, userId: user.id, status: scenario.status, paymentStatus: scenario.paymentStatus,
          fulfillmentStatus: scenario.fulfillmentStatus, totalAmountFen: total, paymentAmountFen: total,
          receiverName: user.nickname, receiverPhone: '138****8888', shippingAddress: '浙江省杭州市余杭区未来科技城 88 号 6 幢 1201 室',
          trackingNo: scenario.status === 'shipped' ? `SFDEMO${user.id}${index}` : null,
          remark: index === 1 ? '工作日白天送达即可' : null,
          expiresAt: new Date(createdAt.getTime() + 30 * 60 * 1000), createdAt,
          paidAt: paid ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
          shippedAt: scenario.status === 'shipped' ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
          completedAt: scenario.status === 'completed' ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
          items: { create: [{ productId: sku.productId, skuId: sku.id, productName: product.name, productImage: images[product.image], skuCode: sku.skuCode, skuSpecifications: sku.specifications, unitPriceFen: sku.priceFen, quantity: scenario.quantity, subtotalFen: total }] },
        },
      })

      if (!existingOrder && scenario.key === 'PENDING') {
        await prisma.shopProductSku.update({
          where: { id: sku.id },
          data: { reservedStock: { increment: scenario.quantity } },
        })
      }

      if (paid) {
        await prisma.shopPayment.upsert({
          where: { outTradeNo: `PAY-${orderNo}` },
          update: {},
          create: { orderId: order.id, outTradeNo: `PAY-${orderNo}`, wechatTransactionId: `WX-${orderNo}`, amountFen: total, status: 'success', paidAt: order.paidAt },
        })
      }
      if (scenario.key === 'REFUND') {
        const refund = await prisma.shopRefund.upsert({
          where: { refundNo: `REF-${orderNo}` },
          update: {},
          create: { orderId: order.id, refundNo: `REF-${orderNo}`, outRefundNo: `OUT-REF-${orderNo}`, requestedAmountFen: total, reason: '收到后发现规格不合适，希望申请退款', status: 'pending' },
        })
        const event = await prisma.shopRefundEvent.findFirst({ where: { refundId: refund.id, eventType: 'created' } })
        if (!event) await prisma.shopRefundEvent.create({ data: { refundId: refund.id, eventType: 'created', actorType: 'user', actorId: user.id, toStatus: 'pending', detail: '用户提交退款申请' } })
      }
    }
  }
  return users.length
}

async function main() {
  const images = copyCovers()
  const skus = await seedProducts(images)
  const userCount = await seedUserScenarios(skus, images)
  console.log(`商城演示数据已就绪：${categories.length} 个分类，${products.length} 个商品，${skus.size} 个 SKU，${userCount} 个用户场景`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
