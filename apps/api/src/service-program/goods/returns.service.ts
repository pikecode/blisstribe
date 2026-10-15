import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { PrismaService } from '../../common/prisma.service'
import { recordServiceNotice } from '../notice'
import { movePackageStock } from './inventory'

@Injectable()
export class ServiceGoodsReturnService {
  constructor(private readonly prisma: PrismaService) {}
  async list(planId: bigint, userId?: bigint) {
    if (!await this.prisma.servicePlan.findFirst({ where: { id: planId, userId } })) throw new NotFoundException('服务计划不存在')
    const rows = await this.prisma.serviceGoodsReturn.findMany({ where: { entitlement: { planId } }, include: { refund: true, entitlement: { include: { orderItem: true } } }, orderBy: { createdAt: 'desc' } })
    return rows.map(row => ({ id: Number(row.id), entitlementId: Number(row.entitlementId), name: row.entitlement.orderItem.itemName, quantity: row.quantity, reason: row.reason, images: row.images, status: row.status, note: row.note, returnAddress: row.returnAddress, deadline: row.deadline, expressCompany: row.expressCompany, trackingNo: row.trackingNo, refundId: row.refundId ? Number(row.refundId) : null, refundStatus: row.refund?.status || null, createdAt: row.createdAt }))
  }
  async request(id: bigint, userId: bigint, data: { quantity: number; reason: string; reasonType: 'personal' | 'quality'; clientRequestId: string; images?: string[] }) {
    if (!data.reason.trim() || !data.clientRequestId.trim()) throw new BadRequestException('请填写退货原因')
    await this.prisma.$transaction(async tx => {
      const initial = await tx.serviceEntitlement.findFirst({ where: { id, plan: { userId } }, include: { plan: true } })
      if (!initial) throw new NotFoundException('商品记录不存在')
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${initial.plan.orderId} FOR UPDATE`
      if (await tx.serviceGoodsReturn.findUnique({ where: { entitlementId_clientRequestId: { entitlementId: id, clientRequestId: data.clientRequestId } } })) return
      const right = await tx.serviceEntitlement.findUniqueOrThrow({ where: { id }, include: { orderItem: true } })
      if (right.orderItem.kind !== 'goods' || right.deliveryStatus !== 'delivered' || data.quantity > right.usedQuantity) throw new BadRequestException('退货数量超过已交付且未退款的商品数量')
      if (data.reasonType === 'personal' && (!right.deliveredAt || Date.now() - right.deliveredAt.getTime() > 7 * 86400000)) throw new BadRequestException('普通退货申请已超过 7 天，质量、错发、缺损问题仍可受理，其他情况请联系客服协调')
      const active = await tx.serviceGoodsReturn.findFirst({ where: { entitlementId: id, status: { notIn: ['rejected', 'withdrawn', 'returned'] }, OR: [{ refundId: null }, { refund: { status: { not: 'success' } } }] }, include: { refund: true } })
      if (active && active.refund?.status !== 'success') throw new BadRequestException('该商品已有进行中的退货，请查看原申请')
      const row = await tx.serviceGoodsReturn.create({ data: { entitlementId: id, clientRequestId: data.clientRequestId, quantity: data.quantity, images: data.images || [], reason: `${data.reasonType === 'quality' ? '质量／错发／缺损' : '个人原因'}：${data.reason.trim()}` } })
      await tx.auditLog.create({ data: { actorType: 'user', actorId: userId, action: 'service_goods.return_requested', targetType: 'service_goods_return', targetId: row.id, reason: row.reason } })
      await recordServiceNotice(tx, { eventKey: `return:${row.id}:requested`, userId, title: '套餐商品退货申请已提交', detail: '请等待客服受理，批准后再按退货信息寄回；商品申请不会改变其他服务的成交价格。', path: `/pages/services/detail?id=${initial.planId}` })
    })
    return { success: true }
  }
  async act(id: bigint, actorId: bigint, admin: boolean, data: { action: 'approve' | 'reject' | 'shipped' | 'withdraw' | 'inspect' | 'dispute'; note?: string; returnAddress?: string; expressCompany?: string; trackingNo?: string; reusable?: boolean }) {
    await this.prisma.$transaction(async tx => {
      const initial = await tx.serviceGoodsReturn.findUnique({ where: { id }, include: { entitlement: { include: { plan: true } } } })
      if (!initial || (!admin && initial.entitlement.plan.userId !== actorId)) throw new NotFoundException('退货记录不存在')
      const plan = initial.entitlement.plan
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${plan.orderId} FOR UPDATE`
      const row = await tx.serviceGoodsReturn.findUniqueOrThrow({ where: { id }, include: { refund: true, entitlement: { include: { orderItem: true } } } })
      const right = row.entitlement
      if (data.action === 'withdraw') {
        if (admin || row.status !== 'requested') throw new BadRequestException('仅未审核退货可撤回')
        await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'withdrawn' } })
      } else if (data.action === 'shipped') {
        if (admin || row.status !== 'approved' || !data.expressCompany?.trim() || !data.trackingNo?.trim()) throw new BadRequestException('退货需批准后填写寄回快递信息')
        if (row.deadline && row.deadline < new Date()) throw new BadRequestException('寄回期限已过，请联系客服协调延期')
        await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'shipped', expressCompany: data.expressCompany.trim(), trackingNo: data.trackingNo.trim() } })
      } else {
        if (!admin || !data.note?.trim()) throw new BadRequestException('请填写审核或核验依据')
        if (data.action === 'approve') {
          if (!['requested', 'approved'].includes(row.status) || !data.returnAddress?.trim()) throw new BadRequestException('请填写退货地址、联系人和电话；仅未寄回申请可审核或延期')
          await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'approved', returnAddress: data.returnAddress.trim(), deadline: new Date(Date.now() + 7 * 86400000), note: data.note.trim() } })
        } else if (data.action === 'reject') {
          if (row.status !== 'requested') throw new BadRequestException('已寄回商品不能直接拒绝，应登记核验异议')
          await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'rejected', note: data.note.trim() } })
        } else if (data.action === 'dispute') {
          if (!['approved', 'shipped', 'disputed'].includes(row.status)) throw new BadRequestException('当前退货不能登记核验异议')
          await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'disputed', note: data.note.trim() } })
        } else {
          const retry = row.status === 'refund_pending' && ['rejected', 'withdrawn'].includes(row.refund?.status || '')
          if ((!['approved', 'shipped', 'disputed'].includes(row.status) && !retry) || data.reusable === undefined || right.usedQuantity < row.quantity) throw new BadRequestException('请确认已收到实物及核验结果，明确是否可重新销售')
          const order = await tx.serviceOrder.findUniqueOrThrow({ where: { id: plan.orderId } })
          if (await tx.serviceRefund.count({ where: { orderId: order.id, status: { in: ['pending', 'processing'] } } })) throw new BadRequestException('订单已有进行中的退款，请先处理后再登记核验通过')
          const amountFen = Math.floor(right.orderItem.allocatedAmountFen * (right.refundedQuantity + row.quantity) / right.totalQuantity) - Math.floor(right.orderItem.allocatedAmountFen * right.refundedQuantity / right.totalQuantity)
          if (amountFen > order.paymentAmountFen - order.refundedAmountFen) throw new BadRequestException('退货金额超过剩余实付金额')
          if (amountFen === 0) {
            await tx.serviceEntitlement.update({ where: { id: right.id }, data: { usedQuantity: { decrement: row.quantity }, refundedQuantity: { increment: row.quantity } } })
            if (data.reusable) await movePackageStock(tx, [{ kind: 'goods', skuId: right.orderItem.skuId, quantity: row.quantity }], 'refunded')
            await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'returned', note: data.note.trim() } })
          } else {
            await tx.serviceEntitlement.update({ where: { id: right.id }, data: { usedQuantity: { decrement: row.quantity }, refundFrozen: { increment: row.quantity } } })
            const token = `${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`
            const refund = await tx.serviceRefund.create({ data: { orderId: plan.orderId, userId: plan.userId, refundNo: `SR-${token}`, outRefundNo: `SROUT-${token}`, requestedAmountFen: amountFen, reason: row.reason, items: { create: { entitlementId: right.id, orderItemId: right.orderItemId, quantity: row.quantity, amountFen, fromGoodsReturn: true, goodsReusable: data.reusable } }, events: { create: { eventType: 'goods_return_verified', actorType: 'admin', actorId, toStatus: 'pending', detail: data.note.trim() } } } })
            await tx.serviceGoodsReturn.update({ where: { id }, data: { status: 'refund_pending', refundId: refund.id, note: data.note.trim() } })
          }
        }
      }
      await tx.auditLog.create({ data: { actorType: admin ? 'admin' : 'user', actorId, action: `service_goods.return_${data.action}`, targetType: 'service_goods_return', targetId: id, reason: data.note?.trim() || '患者更新退货申请' } })
      await recordServiceNotice(tx, { eventKey: `return:${id}:${data.action}:${row.updatedAt.getTime()}`, userId: plan.userId, title: '套餐商品退货进度已更新', detail: data.note?.trim() || '请在我的服务中查看处理进度。', path: `/pages/services/detail?id=${plan.id}` })
    })
    return { success: true }
  }
}
