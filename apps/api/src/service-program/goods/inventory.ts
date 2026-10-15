import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'

type GoodsItem = { kind: string; skuId: bigint | null; quantity: number }

export async function reservePackageStock(tx: Prisma.TransactionClient, items: GoodsItem[]) {
  const quantities = new Map<bigint, number>()
  for (const item of items.filter(item => item.kind === 'goods')) {
    if (!item.skuId) throw new BadRequestException('套餐商品规格配置异常')
    quantities.set(item.skuId, (quantities.get(item.skuId) || 0) + item.quantity)
  }
  for (const [id, quantity] of [...quantities.entries()].sort(([a], [b]) => a < b ? -1 : 1)) {
    await tx.$queryRaw`SELECT id FROM "ShopProductSku" WHERE id = ${id} FOR UPDATE`
    const sku = await tx.shopProductSku.findUnique({ where: { id }, include: { product: true } })
    if (!sku || !sku.enabled || sku.product.status !== 1 || sku.product.deletedAt || sku.totalStock - sku.reservedStock - sku.soldStock < quantity) throw new BadRequestException('套餐包含的商品已下架或库存不足，请刷新选择其他方案')
    await tx.shopProductSku.update({ where: { id }, data: { reservedStock: { increment: quantity } } })
  }
}

export async function movePackageStock(tx: Prisma.TransactionClient, items: GoodsItem[], event: 'paid' | 'closed' | 'refunded') {
  for (const item of [...items].filter(item => item.kind === 'goods').sort((a, b) => a.skuId! < b.skuId! ? -1 : 1)) {
    if (!item.skuId) throw new BadRequestException('套餐商品库存关联异常')
    const changed = await tx.shopProductSku.updateMany({
      where: { id: item.skuId, ...(event === 'refunded' ? { soldStock: { gte: item.quantity } } : { reservedStock: { gte: item.quantity } }) },
      data: event === 'paid' ? { reservedStock: { decrement: item.quantity }, soldStock: { increment: item.quantity } } : event === 'closed' ? { reservedStock: { decrement: item.quantity } } : { soldStock: { decrement: item.quantity } },
    })
    if (!changed.count) throw new BadRequestException('套餐商品库存结转异常，请联系平台核查')
  }
}

export async function closePackageOrder(tx: Prisma.TransactionClient, id: bigint, reason: string, channelClosed = false) {
  await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${id} FOR UPDATE`
  const order = await tx.serviceOrder.findUnique({ where: { id }, include: { items: true } })
  if (!channelClosed && await tx.servicePayment.count({ where: { orderId: id, status: 'pending' } })) return false
  if (!order || order.status !== 'pending_payment' || order.paymentStatus !== 'unpaid') return false
  await tx.serviceOrder.update({ where: { id }, data: { status: 'closed', closedAt: new Date(), closeReason: reason } })
  await movePackageStock(tx, order.items, 'closed')
  await tx.servicePayment.updateMany({ where: { orderId: id, status: 'pending' }, data: { status: 'closed' } })
  return true
}
