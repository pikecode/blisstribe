import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../common/prisma.service'
import { recordServiceNotice } from '../notice'

@Injectable()
export class ServiceGoodsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(planId: bigint, userId?: bigint) {
    const plan = await this.prisma.servicePlan.findFirst({ where: { id: planId, userId } })
    if (!plan) throw new NotFoundException('服务计划不存在')
    const rows = await this.prisma.serviceEntitlement.findMany({ where: { planId, orderItem: { kind: 'goods' } }, include: { orderItem: true }, orderBy: { id: 'asc' } })
    return rows.map(row => ({ id: Number(row.id), name: row.orderItem.itemName, quantity: row.totalQuantity, refundedQuantity: row.refundedQuantity, frozenQuantity: row.refundFrozen, deliveredQuantity: row.usedQuantity, status: row.deliveryStatus, method: row.orderItem.deliveryMethod, snapshot: row.orderItem.goodsSnapshot, returnNotice: row.orderItem.returnNotice, allocatedAmountFen: row.orderItem.allocatedAmountFen, address: row.deliveryAddress, expressCompany: row.expressCompany, trackingNo: row.trackingNo, deliveredAt: row.deliveredAt }))
  }
  async act(id: bigint, actorId: bigint, admin: boolean, data: { action: 'address' | 'ready' | 'ship' | 'receive' | 'recover'; addressId?: number; expressCompany?: string; trackingNo?: string; evidence?: string }) {
    await this.prisma.$transaction(async tx => {
      const initial = await tx.serviceEntitlement.findUnique({ where: { id }, include: { plan: true } })
      if (!initial || (!admin && initial.plan.userId !== actorId)) throw new NotFoundException('商品交付记录不存在')
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${initial.plan.orderId} FOR UPDATE`
      const right = await tx.serviceEntitlement.findUniqueOrThrow({ where: { id }, include: { orderItem: true, plan: true } })
      if (right.orderItem.kind !== 'goods') throw new BadRequestException('当前项目不是套餐商品')
      if (data.action === 'receive' && right.deliveryStatus === 'delivered') return
      if (right.refundFrozen > 0) throw new BadRequestException('商品退款处理中，暂不能交付或修改地址')
      const quantity = right.totalQuantity - right.usedQuantity - right.refundedQuantity - right.refundFrozen - right.reservedQuantity
      const method = right.orderItem.deliveryMethod
      let update: Prisma.ServiceEntitlementUpdateInput
      if (data.action === 'address') {
        if (admin || method !== 'shipping' || right.deliveryStatus !== 'pending' || quantity <= 0 || !data.addressId) throw new BadRequestException('当前商品不能修改收货地址')
        const address = await tx.shopAddress.findFirst({ where: { id: BigInt(data.addressId), userId: actorId } })
        if (!address) throw new BadRequestException('请选择本人的有效收货地址')
        update = { deliveryAddress: { receiverName: address.receiverName, receiverPhone: address.receiverPhone, fullAddress: address.fullAddress } }
      } else if (data.action === 'ready') {
        if (!admin || method !== 'pickup' || !['pending', 'ready'].includes(right.deliveryStatus) || quantity <= 0) throw new BadRequestException('当前商品不能登记待领取')
        if (right.deliveryStatus === 'ready') return
        update = { deliveryStatus: 'ready' }
      } else if (data.action === 'recover') {
        if (!admin || right.deliveryStatus !== 'shipped' || !data.evidence?.trim()) throw new BadRequestException('仅已寄送商品可撤回，需记录快递拦截成功且实物已取回的依据')
        update = { deliveryStatus: 'pending', reservedQuantity: { decrement: right.reservedQuantity }, expressCompany: '', trackingNo: '', deliveryEvidence: data.evidence.trim() }
      } else if (data.action === 'ship') {
        if (!admin || method !== 'shipping' || right.deliveryStatus !== 'pending' || quantity <= 0 || !right.deliveryAddress || !data.expressCompany?.trim() || !data.trackingNo?.trim()) throw new BadRequestException('请确认地址并填写快递公司和单号，商品需为待寄送状态')
        update = { deliveryStatus: 'shipped', expressCompany: data.expressCompany.trim(), trackingNo: data.trackingNo.trim(), reservedQuantity: { increment: quantity } }
      } else {
        if (!['ready', 'shipped'].includes(right.deliveryStatus) || (admin && !data.evidence?.trim())) throw new BadRequestException('请先登记可领取或已寄送；运营代确认需填写交付依据')
        const delivered = right.deliveryStatus === 'shipped' ? right.reservedQuantity : quantity
        if (delivered <= 0) throw new BadRequestException('没有待确认的商品数量')
        update = { deliveryStatus: 'delivered', usedQuantity: { increment: delivered }, reservedQuantity: right.deliveryStatus === 'shipped' ? { decrement: delivered } : undefined, deliveredAt: new Date(), deliveryEvidence: admin ? data.evidence!.trim() : '患者本人确认交付' }
      }
      await tx.serviceEntitlement.update({ where: { id }, data: update })
      await tx.auditLog.create({ data: { actorType: admin ? 'admin' : 'user', actorId, action: `service_goods.${data.action}`, targetType: 'service_entitlement', targetId: id, reason: data.evidence?.trim() || '套餐商品交付状态更新' } })
      if (data.action !== 'address') await recordServiceNotice(tx, { eventKey: `goods:${id}:${data.action}`, userId: right.plan.userId, title: data.action === 'recover' ? '套餐商品寄送已撤回' : data.action === 'ready' ? '套餐商品可以领取' : data.action === 'ship' ? '套餐商品已寄送' : '套餐商品交付已确认', detail: `${right.orderItem.itemName}，请在我的服务中查看交付记录。`, path: `/pages/services/detail?id=${right.planId}` })
    })
    return { success: true }
  }
}
