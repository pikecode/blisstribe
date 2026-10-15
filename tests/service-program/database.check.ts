import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../../apps/api/src/common/prisma.service'
import { ServiceOfferingService } from '../../apps/api/src/service-program/offering/offering.service'
import { ServiceOrderService } from '../../apps/api/src/service-program/order/order.service'
import { ServiceAppointmentService } from '../../apps/api/src/service-program/appointment/appointment.service'
import { ServicePaymentService } from '../../apps/api/src/service-program/payment/payment.service'
import { ServiceRefundService } from '../../apps/api/src/service-program/refund/refund.service'

async function main() {
  const url = new URL(process.env.DATABASE_URL || '')
  assert.match(url.pathname, /^\/blisstribe_service_acceptance_/, '只允许独立验收库')
  const prisma = new PrismaService()
  const orders = new ServiceOrderService(prisma)
  const appointments = new ServiceAppointmentService(prisma)
  const mockChannel: any = { isMockPaymentEnabled: () => true, assertCheckoutEnabled: () => undefined }
  const payments = new ServicePaymentService(prisma, mockChannel)
  const refunds = new ServiceRefundService(prisma, mockChannel)
  const suffix = randomUUID().slice(0, 8)
  try {
    const user = await prisma.user.create({ data: { phoneCiphertext: Buffer.from('fixture'), phoneHash: `accept-${suffix}`, phoneMasked: '测试患者', nickname: '验收患者', tags: [] } })
    const other = await prisma.user.create({ data: { phoneCiphertext: Buffer.from('fixture'), phoneHash: `other-${suffix}`, phoneMasked: '测试患者2', nickname: '验收患者2', tags: [] } })
    const partner = await prisma.partner.create({ data: { partnerNo: `ACCEPT-${suffix}`, displayName: '验收机构', type: 'institution', status: 1 } })
    const institution = await prisma.serviceInstitution.create({ data: { partnerId: partner.id, name: '验收机构', receptionHours: { weekdays: [0,1,2,3,4,5,6], startMinute: 0, endMinute: 1439 } } })
    const module = await prisma.productModule.create({ data: { code: `accept-${suffix}`, name: '验收服务' } })
    const product = await prisma.product.create({ data: { moduleId: module.id, title: '验收服务', status: 1 } })
    const offering = await prisma.serviceOffering.create({ data: { institutionId: institution.id, productId: product.id, name: '验收方案', priceFen: 101, validityDays: 30, status: 1, items: { create: { name: '验收项目', quantity: 3, allocatedAmountFen: 101 } } } })
    const start = new Date(Date.now() + 3 * 86400000); start.setHours(10, 0, 0, 0)
    const slot = await prisma.serviceAppointmentSlot.create({ data: { institutionId: institution.id, startAt: start, endAt: new Date(start.getTime() + 3600000), capacity: 1 } })
    const publicOffering = await new ServiceOfferingService(prisma).detailPublic(offering.id)
    assert.equal(publicOffering.defaultPromoterRateBps, undefined)
    assert.equal(publicOffering.items[0].institutionSettlementFen, undefined)
    const order = await orders.create(user.id, { offeringId: Number(offering.id), clientRequestId: suffix })
    await payments.createPayment(BigInt(order.id), user.id, '127.0.0.1', 'mock')
    const paid = await orders.detailMine(BigInt(order.id), user.id)
    assert.ok(paid.plan)
    assert.equal(paid.pricingSnapshot, undefined)
    assert.equal(paid.items[0].institutionSettlementFen, undefined)
    const notify = { out_trade_no: paid.orderNo, transaction_id: `MOCK-${paid.orderNo}`, amount: { total: 101 } }
    await payments.handleWechatNotify(notify)
    assert.equal(await prisma.servicePlan.count({ where: { orderId: BigInt(paid.id) } }), 1)
    const right = paid.plan.entitlements[0]
    const booking = await appointments.create(BigInt(paid.plan.id), user.id, { entitlementId: right.id, slotId: Number(slot.id), requestedStartAt: start.toISOString(), clientRequestId: suffix })
    const duplicate = await appointments.create(BigInt(paid.plan.id), user.id, { entitlementId: right.id, slotId: Number(slot.id), requestedStartAt: start.toISOString(), clientRequestId: suffix })
    assert.equal(booking.id, duplicate.id)
    await appointments.confirm(BigInt(booking.id), 1n, {})
    await appointments.arrive(BigInt(booking.id))
    await appointments.complete(BigInt(booking.id), 1n, '验收执行人员')
    await appointments.complete(BigInt(booking.id), 1n, '验收执行人员')
    let rights = await prisma.serviceEntitlement.findUniqueOrThrow({ where: { id: BigInt(right.id) } })
    assert.equal(rights.usedQuantity, 1); assert.equal(rights.reservedQuantity, 0)
    const refund = await refunds.create(BigInt(paid.id), user.id, { reason: '验收未使用部分退款', items: [{ entitlementId: right.id, quantity: 1 }] })
    assert.equal(refund.requestedAmountFen, 33)
    await refunds.withdraw(BigInt(refund.id), user.id)
    const next = await refunds.create(BigInt(paid.id), user.id, { reason: '验收退款', items: [{ entitlementId: right.id, quantity: 2 }] })
    await refunds.review(BigInt(next.id), 1n, true)
    const successful = await refunds.detailMine(BigInt(next.id), user.id)
    assert.equal(successful.status, 'success')
    await refunds.handleWechatNotify({ out_refund_no: successful.outRefundNo, refund_id: successful.wechatRefundId, refund_status: 'SUCCESS', amount: { refund: successful.requestedAmountFen, total: 101 } })
    rights = await prisma.serviceEntitlement.findUniqueOrThrow({ where: { id: BigInt(right.id) } })
    assert.equal(rights.totalQuantity, rights.usedQuantity + rights.reservedQuantity + rights.refundFrozen + rights.refundedQuantity)
    assert.equal(rights.refundedQuantity, 2)
    await assert.rejects(() => orders.detailMine(BigInt(paid.id), other.id))
    const free = await prisma.serviceOffering.create({ data: { institutionId: institution.id, productId: product.id, name: '免费验收', priceFen: 0, validityDays: 30, status: 1, items: { create: { name: '体验', quantity: 1, allocatedAmountFen: 0 } } } })
    const claims = await Promise.all([orders.create(other.id, { offeringId: Number(free.id), clientRequestId: `${suffix}-a` }), orders.create(other.id, { offeringId: Number(free.id), clientRequestId: `${suffix}-b` })])
    assert.equal(claims[0].id, claims[1].id)
    const secondOrder = await orders.create(user.id, { offeringId: Number(offering.id), clientRequestId: `${suffix}-second` })
    await payments.createPayment(BigInt(secondOrder.id), user.id, '127.0.0.1', 'mock')
    const secondPaid = await orders.detailMine(BigInt(secondOrder.id), user.id)
    const freeRight = claims[0].plan!.entitlements[0]
    const paidRight = secondPaid.plan!.entitlements[0]
    const race = await Promise.allSettled([
      appointments.create(BigInt(secondPaid.plan!.id), user.id, { entitlementId: paidRight.id, slotId: Number(slot.id), requestedStartAt: start.toISOString(), clientRequestId: `${suffix}-race-a` }),
      appointments.create(BigInt(claims[0].plan!.id), other.id, { entitlementId: freeRight.id, slotId: Number(slot.id), requestedStartAt: start.toISOString(), clientRequestId: `${suffix}-race-b` }),
    ])
    assert.equal(race.filter(item => item.status === 'fulfilled').length, 1)
    assert.equal(await prisma.serviceAppointment.count({ where: { slotId: slot.id, status: { in: ['pending', 'confirmed', 'arrived'] } } }), 1)
    const winner = race.find(item => item.status === 'fulfilled') as PromiseFulfilledResult<any>
    await appointments.cancelMine(BigInt(winner.value.id), BigInt(winner.value.userId), { reason: '验收释放名额' })
    const newSlot = await prisma.serviceAppointmentSlot.create({ data: { institutionId: institution.id, startAt: new Date(start.getTime() + 86400000), endAt: new Date(start.getTime() + 90000000), capacity: 1 } })
    const original = await appointments.create(BigInt(secondPaid.plan!.id), user.id, { entitlementId: paidRight.id, slotId: Number(slot.id), requestedStartAt: start.toISOString(), clientRequestId: `${suffix}-reschedule` })
    await appointments.proposeReschedule(BigInt(original.id), newSlot.id, '机构调整')
    assert.equal(await prisma.serviceAppointment.count({ where: { slotId: newSlot.id, status: { in: ['pending', 'confirmed', 'arrived'] } } }), 0)
    const moved = await appointments.acceptReschedule(BigInt(original.id), user.id)
    assert.equal(moved.status, 'confirmed'); assert.equal(moved.slotId, newSlot.id)
    assert.equal((await prisma.serviceEntitlement.findUniqueOrThrow({ where: { id: BigInt(paidRight.id) } })).reservedQuantity, 1)
    const aftercare = await refunds.create(BigInt(secondPaid.id), user.id, { reason: '关联预约退款验收', items: [{ entitlementId: paidRight.id, quantity: 3, appointmentIds: [moved.id] }] })
    assert.equal((await appointments.detailMine(BigInt(moved.id), user.id)).status, 'refund_pending')
    await assert.rejects(() => appointments.arrive(BigInt(moved.id)))
    await refunds.withdraw(BigInt(aftercare.id), user.id)
    assert.equal((await appointments.detailMine(BigInt(moved.id), user.id)).status, 'cancelled')
    const beforeExtension = await prisma.servicePlan.findUniqueOrThrow({ where: { id: BigInt(secondPaid.plan!.id) } })
    const from = new Date(Date.now() - 3600000); const to = new Date()
    await prisma.servicePlan.update({ where: { id: beforeExtension.id }, data: { startsAt: new Date(from.getTime() - 3600000) } })
    await orders.extendPlan(BigInt(secondPaid.id), 1n, { entitlementId: paidRight.id, startAt: from.toISOString(), endAt: to.toISOString(), reason: '机构等待' })
    await orders.extendPlan(BigInt(secondPaid.id), 1n, { entitlementId: paidRight.id, startAt: from.toISOString(), endAt: to.toISOString(), reason: '重复等待验收' })
    assert.equal((await prisma.servicePlan.findUniqueOrThrow({ where: { id: beforeExtension.id } })).expiresAt.getTime() - beforeExtension.expiresAt.getTime(), 86400000)
    assert.ok((await orders.notices(user.id)).length > 0)
    console.log('通过：支付核销幂等、部分退款、权益守恒、跨用户隔离、并发限领、容量抢约、患者确认改约、退款暂停接待、重复等待不重复延期、站内通知')
  } finally { await prisma.$disconnect() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
