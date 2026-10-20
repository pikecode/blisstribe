// 专用商品验收数据；默认预览，--apply 才写入。重复执行不重置已被测试修改的商品或库存。
const { copyFileSync, existsSync, mkdirSync } = require('node:fs')
const { join, resolve } = require('node:path')
const assert = require('node:assert/strict')

const batch = 'SHOP-UAT-20261020'
const categories = [
  ['sleep', '【测试】舒眠日常'], ['exercise', '【测试】轻运动'],
  ['wellness', '【测试】生活好物'], ['gift', '【测试】心意礼赠'],
  ['boundary', '【测试】边界场景'], ['empty', '【测试】空分类'],
]
const sku = (specs, price, stock, enabled = true) => ({ specs, price, stock, enabled })
const products = [
  { key: 'default', category: 'sleep', name: '草本眼罩 · 默认规格', scene: '单规格且无规格属性，可直接选购', cover: 'sleep', skus: [sku({}, 2990, 50)] },
  { key: 'sizes', category: 'sleep', name: '枕边香氛 · 容量与价格', scene: '两种规格、不同价格', cover: 'emotion', skus: [sku({ 容量: '50ml' }, 4900, 20), sku({ 容量: '100ml' }, 7900, 15)] },
  { key: 'partial', category: 'sleep', name: '护颈枕 · 部分规格售罄', scene: '灰色有货，绿色售罄', cover: 'family', skus: [sku({ 颜色: '雾灰' }, 9900, 10), sku({ 颜色: '鼠尾草绿' }, 9900, 0)] },
  { key: 'low', category: 'sleep', name: '睡眠耳塞 · 仅剩两件', scene: '低库存提示、购买数量上限', cover: 'sleep', skus: [sku({ 规格: '一对装' }, 1990, 2)] },
  { key: 'soldout', category: 'sleep', name: '舒眠礼盒 · 全部售罄', scene: '商品售罄与不可购买状态', cover: 'family', skus: [sku({ 包装: '标准礼盒' }, 12900, 0)] },
  { key: 'matrix', category: 'exercise', name: '瑜伽垫 · 颜色与厚度', scene: '两组属性四个组合，含售罄组合', cover: 'weight', skus: [sku({ 颜色: '青绿', 厚度: '6mm' }, 6900, 30), sku({ 颜色: '青绿', 厚度: '8mm' }, 8900, 12), sku({ 颜色: '暖沙', 厚度: '6mm' }, 6900, 0), sku({ 颜色: '暖沙', 厚度: '8mm' }, 8900, 8)] },
  { key: 'disabled', category: 'exercise', name: '弹力训练带 · 停用规格', scene: '启用规格可选，停用规格不对用户提供', cover: 'weight', skus: [sku({ 阻力: '轻' }, 2900, 20), sku({ 阻力: '中' }, 3900, 20), sku({ 阻力: '重（停用）' }, 4900, 20, false)] },
  { key: 'last', category: 'exercise', name: '筋膜球 · 最后一件', scene: '库存一件，数量步进边界', cover: 'consult', skus: [sku({ 硬度: '中等' }, 1990, 1)] },
  { key: 'multiimage', category: 'wellness', name: '随行杯 · 三图轮播', scene: '详情图片轮播、两种颜色', cover: 'family', covers: ['family', 'consult', 'sleep'], skus: [sku({ 颜色: '奶油白' }, 5900, 30), sku({ 颜色: '松柏绿' }, 5900, 30)] },
  { key: 'longname', category: 'wellness', name: '居家与办公室通用的轻便折叠多功能收纳旅行套装 · 长标题换行与省略展示验收', scene: '列表、购物车和订单中长商品名称排版', cover: 'consult', skus: [sku({ 款式: '燕麦白 · 加大收纳套装' }, 3990, 25)] },
  { key: 'longdetail', category: 'wellness', name: '健康习惯手账 · 长详情', scene: '长描述滚动、换行与底部操作栏', cover: 'consult', detail: ['商品介绍：用于记录每日饮水、运动及休息习惯。', '规格说明：A5 大小，纸质封面，内页为周计划与每日记录。', '使用方式：每天选择固定时间填写，按实际体验记录。', '包装清单：手账一本、书签一张、贴纸一页。', '配送说明：此为验收样例，不承诺实际配送。', '售后说明：体验订单与真实订单的售后入口相同。'].join('\n\n'), skus: [sku({ 封面: '森林绿' }, 2990, 40)] },
  { key: 'manysku', category: 'wellness', name: '手账封面 · 八个规格', scene: '较多规格的选择面板及滚动', cover: 'beauty', skus: ['森林绿', '燕麦白', '雾灰', '海盐蓝', '暖杏', '浅粉', '深棕', '墨黑'].map((颜色, index) => sku({ 颜色 }, 2900 + index * 100, index === 6 ? 0 : 10)) },
  { key: 'gift', category: 'gift', name: '松弛时刻礼盒', scene: '常规礼盒与礼盒加卡片的价差', cover: 'family', skus: [sku({ 包装: '标准礼盒' }, 9900, 15), sku({ 包装: '礼盒与心意卡' }, 10900, 10)] },
  { key: 'onecent', category: 'boundary', name: '一分钱支付验收商品', scene: '真实微信支付与退款入口验收，付款会真实扣款', cover: 'sleep', skus: [sku({}, 1, 20)] },
  { key: 'noimage', category: 'boundary', name: '无图占位展示', scene: '无商品图片时的占位，避免依赖失效外链', cover: null, skus: [sku({}, 100, 10)] },
  { key: 'longspec', category: 'boundary', name: '长规格属性展示', scene: '规格名称、属性值较长时换行', cover: 'beauty', skus: [sku({ 适用场景: '居家办公与短途旅行通用', 包装形式: '环保纸盒与可重复使用收纳袋' }, 4990, 12)] },
  { key: 'draft', category: 'boundary', name: '草稿商品 · 仅后台', scene: '草稿不进入小程序列表', cover: 'beauty', status: 0, skus: [sku({}, 100, 10)] },
  { key: 'offline', category: 'boundary', name: '下架商品 · 仅后台', scene: '下架商品不进入小程序列表', cover: 'emotion', status: 2, skus: [sku({}, 100, 10)] },
  ...['便携拉伸带', '运动擦汗巾', '轻便帆布袋', '阅读书签', '随行收纳包', '心意明信片'].map((name, index) => ({
    key: `page-${index + 1}`, category: index < 2 ? 'exercise' : 'gift', name,
    scene: '商品列表分页、搜索与分类切换', cover: index % 2 ? 'family' : 'weight', skus: [sku({}, 990 + index * 500, 30)],
  })),
]

// 写入前检查价格、库存和属性组合，避免创建不能正常选购的样例。
assert.equal(new Set(products.map(({ key }) => key)).size, products.length)
for (const product of products) {
  assert(categories.some(([code]) => code === product.category))
  const combinations = product.skus.map(({ specs }) => JSON.stringify(Object.fromEntries(Object.entries(specs).sort(([a], [b]) => a.localeCompare(b)))))
  assert.equal(new Set(combinations).size, product.skus.length)
  for (const item of product.skus) {
    assert(Number.isSafeInteger(item.price) && item.price > 0)
    assert(Number.isSafeInteger(item.stock) && item.stock >= 0)
  }
}

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ batch, categories: categories.length, products: products.length, skus: products.reduce((sum, product) => sum + product.skus.length, 0), scenarios: products.map(({ key, scene, status = 1 }) => ({ key, scene, status })) }, null, 2))
    return
  }
  assert(process.env.DATABASE_URL, '需要显式提供 DATABASE_URL')
  assert(process.env.PUBLIC_BASE_URL, '需要显式提供 PUBLIC_BASE_URL')
  assert(process.env.UPLOAD_DIR, '需要显式提供 UPLOAD_DIR')
  const baseUrl = process.env.PUBLIC_BASE_URL.replace(/\/$/, '')
  assert.equal(new URL(baseUrl).protocol, 'https:')
  const uploadDir = resolve(process.env.UPLOAD_DIR)
  mkdirSync(uploadDir, { recursive: true })
  for (const cover of new Set(products.flatMap((product) => product.covers || (product.cover ? [product.cover] : [])))) {
    const filename = `${batch.toLowerCase()}-${cover}.jpg`
    if (!existsSync(join(uploadDir, filename))) copyFileSync(join(__dirname, 'assets/covers', `product-${cover}.jpg`), join(uploadDir, filename))
  }
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const result = await prisma.$transaction(async (tx) => {
      const categoryIds = new Map()
      for (const [index, [code, name]] of categories.entries()) {
        const category = await tx.shopCategory.upsert({
          where: { code: `${batch}-${code}` }, update: {},
          create: { code: `${batch}-${code}`, name, description: '商城测试分类，验收后可停用。', status: 1, sortOrder: 100 + index },
        })
        categoryIds.set(code, category.id)
      }
      const manifest = []
      for (const [index, product] of products.entries()) {
        const firstCode = `${batch}-${product.key}-1`
        const existing = await tx.shopProductSku.findUnique({ where: { skuCode: firstCode }, select: { productId: true } })
        if (existing) {
          manifest.push({ id: existing.productId.toString(), key: product.key, result: '保留已有数据' })
          continue
        }
        const covers = product.covers || (product.cover ? [product.cover] : [])
        const created = await tx.shopProduct.create({ data: {
          categoryId: categoryIds.get(product.category), name: `【测试】${product.name}`,
          description: `商城场景测试数据，图片为场景示意。请勿当作正式在售商品。\n验收场景：${product.scene}。\n${product.detail || ''}`,
          images: covers.map((cover) => `${baseUrl}/uploads/${batch.toLowerCase()}-${cover}.jpg`),
          status: product.status ?? 1, sortOrder: 100 + index,
          skus: { create: product.skus.map((item, skuIndex) => ({
            skuCode: `${batch}-${product.key}-${skuIndex + 1}`, specifications: item.specs,
            specificationKey: JSON.stringify(Object.fromEntries(Object.entries(item.specs).sort(([a], [b]) => a.localeCompare(b)))),
            priceFen: item.price, totalStock: item.stock, reservedStock: 0, soldStock: 0, enabled: item.enabled,
          })) },
        } })
        manifest.push({ id: created.id.toString(), key: product.key, name: created.name, status: created.status, scene: product.scene, result: '已创建' })
      }
      return manifest
    }, { timeout: 60000 })
    console.log(JSON.stringify({ batch, manifest: result }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
