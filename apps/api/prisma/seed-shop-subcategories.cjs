// 仅调整既有商城测试商品的分类，不重置库存、售价或展示状态。
const assert = require('node:assert/strict')
const batch = 'SHOP-UAT-20261020'
const groups = [
  ['sleep', 'eye', '眼罩与耳塞', ['default', 'low']],
  ['sleep', 'aroma', '香氛与礼盒', ['sizes', 'soldout']],
  ['sleep', 'pillow', '枕具', ['partial']],
  ['exercise', 'stretch', '瑜伽与拉伸', ['matrix', 'disabled', 'page-1']],
  ['exercise', 'relax', '放松与配件', ['last', 'page-2']],
  ['wellness', 'cup', '杯具', ['multiimage']],
  ['wellness', 'journal', '手账文具', ['longdetail', 'manysku']],
  ['wellness', 'storage', '收纳用品', ['longname']],
  ['gift', 'box', '精选礼盒', ['gift']],
  ['gift', 'portable', '随行小物', ['page-3', 'page-4', 'page-5', 'page-6']],
  ['boundary', 'display', '支付与展示', ['onecent', 'noimage', 'longspec']],
  ['boundary', 'admin', '后台状态', ['draft', 'offline']],
]
const keys = groups.flatMap(([, , , products]) => products)
assert.equal(keys.length, 24)
assert.equal(new Set(keys).size, keys.length)

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ batch, subcategories: groups.length, products: keys.length, groups }, null, 2))
    return
  }
  assert(process.env.DATABASE_URL, '需要显式提供 DATABASE_URL')
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const manifest = await prisma.$transaction(async (tx) => {
      const rows = []
      for (const [index, [parentCode, code, name, products]] of groups.entries()) {
        const parent = await tx.shopCategory.findUnique({ where: { code: `${batch}-${parentCode}` } })
        assert(parent && parent.parentId === null, `测试一级分类不可用：${parentCode}`)
        const child = await tx.shopCategory.upsert({
          where: { code: `${batch}-${parentCode}-${code}` }, update: {},
          create: { code: `${batch}-${parentCode}-${code}`, name, parentId: parent.id, sortOrder: index, status: 1, description: '商城二级分类测试数据' },
        })
        assert.equal(child.parentId, parent.id, `测试子分类已被调整归属：${code}`)
        const assignments = []
        for (const key of products) {
          const sku = await tx.shopProductSku.findUnique({ where: { skuCode: `${batch}-${key}-1` } })
          assert(sku, `缺少测试商品：${key}`)
          const result = await tx.shopProduct.updateMany({
            where: { id: sku.productId, categoryId: parent.id }, data: { categoryId: child.id },
          })
          assignments.push({ productId: sku.productId.toString(), changed: result.count === 1 })
        }
        rows.push({ parentId: parent.id.toString(), categoryId: child.id.toString(), name, assignments })
      }
      return rows
    }, { timeout: 60000 })
    console.log(JSON.stringify({ batch, manifest }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
