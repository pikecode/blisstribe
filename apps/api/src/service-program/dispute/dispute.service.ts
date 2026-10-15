import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'
import { randomBytes } from 'crypto'
import { PrismaService } from '../../common/prisma.service'
import { CreateServiceDisputeDto, DisputeAdminActionDto, DisputeUserActionDto } from '../dto/dispute.dto'
import { recordServiceNotice } from '../notice'
import { businessDeadline } from './business-days'

const include = {
  correctedEntitlement: { include: { orderItem: true } },
  plan: { include: { order: { select: { id: true, orderNo: true, paymentAmountFen: true, refundedAmountFen: true } }, institution: { select: { id: true, name: true } }, user: { select: { id: true, nickname: true, phoneMasked: true } } } },
  appointment: { include: { entitlement: { include: { orderItem: true } } } },
  refund: { select: { id: true, status: true, requestedAmountFen: true } },
  events: { orderBy: { createdAt: 'asc' as const } },
}
type DisputeRow = Prisma.ServiceDisputeGetPayload<{ include: typeof include }>

@Injectable()
export class ServiceDisputeService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  private deadline(days: number) {
    const dates = (key: string) => String(this.config.get(key) || '').split(',').map(value => value.trim()).filter(Boolean)
    return businessDeadline(new Date(), days, dates('SERVICE_SUPPORT_NON_WORKING_DATES'), dates('SERVICE_SUPPORT_WORKING_DATES'))
  }
  async create(appointmentId: bigint, userId: bigint, dto: CreateServiceDisputeDto) {
    if (!dto.description.trim() || !dto.clientRequestId.trim()) throw new BadRequestException('请填写异议说明')
    const id = await this.prisma.$transaction(async tx => {
      const initial = await tx.serviceAppointment.findFirst({ where: { id: appointmentId, userId } })
      if (!initial) throw new NotFoundException('服务记录不存在')
      await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = (SELECT "orderId" FROM "ServicePlan" WHERE id = ${initial.planId}) FOR UPDATE`
      const existing = await tx.serviceDispute.findUnique({ where: { appointmentId } })
      if (existing) {
        if (existing.status === 'resolved' && existing.clientRequestId !== dto.clientRequestId) throw new BadRequestException('该服务记录已有结案异议，请联系平台继续协调')
        return existing.id
      }
      const appointment = await tx.serviceAppointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { entitlement: { include: { orderItem: true } } } })
      if (appointment.status !== 'completed' || appointment.entitlement.orderItem.kind !== 'service' || appointment.correctionStatus !== 'none') throw new BadRequestException('请选择未修正的已完成服务记录；未执行内容请走预约取消或客服协调')
      const row = await tx.serviceDispute.create({ data: { appointmentId, planId: appointment.planId, clientRequestId: dto.clientRequestId, reasonType: dto.reasonType, description: dto.description.trim(), deadline: this.deadline(1) } })
      await this.event(tx, row.id, userId, 'user', 'submitted', dto.description.trim(), appointment.planId)
      return row.id
    })
    return this.detail(id, userId)
  }
  async forAppointment(appointmentId: bigint, userId: bigint) {
    if (!await this.prisma.serviceAppointment.findFirst({ where: { id: appointmentId, userId } })) throw new NotFoundException('服务记录不存在')
    const row = await this.prisma.serviceDispute.findFirst({ where: { appointmentId, plan: { userId } }, include })
    return row ? this.toVO(row, false) : null
  }
  async detail(id: bigint, userId?: bigint) {
    const row = await this.prisma.serviceDispute.findFirst({ where: { id, ...(userId ? { plan: { userId } } : {}) }, include })
    if (!row) throw new NotFoundException('异议记录不存在')
    return this.toVO(row, userId === undefined)
  }
  async list(params: { userId?: bigint; planId?: bigint; status?: string; overdue?: boolean; keyword?: string; page?: number }) {
    const where: Prisma.ServiceDisputeWhereInput = { planId: params.planId, status: params.status || undefined, ...(params.userId ? { plan: { userId: params.userId } } : {}), ...(params.overdue ? { deadline: { lt: new Date() }, resolvedAt: null } : {}), ...(params.keyword?.trim() ? { OR: [{ plan: { order: { orderNo: { contains: params.keyword.trim() } } } }, { description: { contains: params.keyword.trim() } }] } : {}) }
    const page = Math.max(1, Math.min(1000000, Math.floor(Number.isFinite(params.page) ? params.page! : 1)))
    const [rows, total] = await Promise.all([this.prisma.serviceDispute.findMany({ where, include, orderBy: [{ createdAt: 'desc' }], skip: (page - 1) * 20, take: 20 }), this.prisma.serviceDispute.count({ where })])
    return { list: rows.map(row => this.toVO(row, params.userId === undefined)), total, page, pageSize: 20 }
  }
  async adminAct(id: bigint, adminId: bigint, dto: DisputeAdminActionDto) {
    if (!dto.note.trim()) throw new BadRequestException('请填写处理依据或说明')
    await this.prisma.$transaction(async tx => {
      const row = await this.lock(tx, id)
      this.checkVersion(row, dto.expectedUpdatedAt)
      if (row.status === 'resolved') throw new BadRequestException('异议已结案，不能覆盖原处理记录')
      const update: Prisma.ServiceDisputeUncheckedUpdateInput = { overdueNotifiedAt: null }
      if (dto.action === 'contact') {
        if (row.status !== 'submitted' || !dto.ownerName?.trim()) throw new BadRequestException('请填写客服负责人并登记首次联系情况')
        Object.assign(update, { status: 'evidence_pending', ownerAdminId: adminId, ownerName: dto.ownerName.trim(), deadline: this.deadline(2) })
      } else if (dto.action === 'evidence') {
        if (row.status !== 'evidence_pending') throw new BadRequestException('当前不处于机构依据收集阶段')
        Object.assign(update, { evidence: dto.note.trim(), status: 'processing', deadline: this.deadline(2) })
      } else if (dto.action === 'extend') {
        const deadline = dto.deadline ? new Date(dto.deadline) : null
        if (!row.deadline || row.deadline <= new Date() || !deadline || deadline <= row.deadline || deadline > new Date(Date.now() + 90 * 86400000)) throw new BadRequestException('需在原期限内说明延期原因，并填写更晚的下一次反馈时间（90 天以内）；已逾期请立即推进处理')
        Object.assign(update, { deadline })
      } else if (dto.action === 'finish_rearrange') {
        this.requireIndependent(row, adminId)
        if (row.status !== 'awaiting_rebooking' || !row.acceptedAt || !dto.replacementAppointmentId) throw new BadRequestException('请先取得患者接受方案并确认新的预约')
        const appointmentId = BigInt(dto.replacementAppointmentId)
        const replacement = await tx.serviceAppointment.findFirst({ where: { id: appointmentId, planId: row.planId, entitlementId: row.appointment.entitlementId, status: { in: ['confirmed', 'arrived', 'completed'] }, createdAt: { gte: row.acceptedAt } } })
        if (!replacement || await tx.serviceDispute.findFirst({ where: { replacementAppointmentId: appointmentId } })) throw new BadRequestException('请选择方案接受后建立的同一项目已确认预约，且不得重复关联其他异议')
        Object.assign(update, { status: 'resolved', resolvedAt: new Date(), settlementHeld: false, deadline: null, replacementAppointmentId: appointmentId })
      } else if (dto.action === 'retry_refund') {
        this.requireIndependent(row, adminId)
        if (row.status !== 'executing' || !row.acceptedAt || !['rejected', 'withdrawn'].includes(row.refund?.status || '')) throw new BadRequestException('仅患者已接受且退款失败的方案可重新生成退款申请')
        const refundId = await this.createCompensation(tx, row, adminId)
        Object.assign(update, { refundId })
      } else {
        this.requireIndependent(row, adminId)
        const reviewing = dto.action === 'review'
        if (reviewing) {
          if (!['review_requested', 'disputed', 'review_proposed'].includes(row.status) || row.proposedByAdminId === adminId) throw new ForbiddenException('复核须由原方案提出人以外的管理账号处理')
        } else if (!['processing', 'disputed', 'proposed'].includes(row.status) && !(row.status === 'executing' && ['rejected', 'withdrawn'].includes(row.refund?.status || ''))) throw new BadRequestException('请先完成机构依据收集，或继续处理争议协调')
        if (!dto.outcome) throw new BadRequestException('请选择处理方案')
        const right = row.appointment.entitlement
        const expiry = dto.restoredExpiresAt ? new Date(dto.restoredExpiresAt) : null
        if (['restore', 'rearrange', 'correct_item'].includes(dto.outcome) && (row.appointment.correctionStatus !== 'none' || right.usedQuantity < 1)) throw new BadRequestException('该记录已修正或没有可恢复的已使用次数')
        if (['restore', 'rearrange', 'correct_item'].includes(dto.outcome) && row.plan.expiresAt <= new Date() && (!expiry || expiry <= new Date())) throw new BadRequestException('服务已到期，恢复权益时需明确新的有效期')
        if (expiry && (expiry <= new Date() || expiry > new Date(Date.now() + 3650 * 86400000))) throw new BadRequestException('恢复后的有效期需在未来且不超过 10 年')
        if (dto.outcome === 'correct_item') {
          const target = dto.correctedEntitlementId ? await tx.serviceEntitlement.findFirst({ where: { id: BigInt(dto.correctedEntitlementId), planId: row.planId, orderItem: { kind: 'service' } } }) : null
          if (!target || target.id === right.id || target.totalQuantity <= target.usedQuantity + target.reservedQuantity + target.refundFrozen + target.refundedQuantity + target.expiredQuantity) throw new BadRequestException('请选择同一计划中其他有未使用次数的实际服务项目')
        }
        const amount = dto.outcome === 'refund'  ? dto.refundAmountFen || 0 : 0
        if (dto.outcome === 'refund' && (amount <= 0 || amount > Math.ceil(right.orderItem.allocatedAmountFen / right.totalQuantity) || amount > row.plan.order.paymentAmountFen - row.plan.order.refundedAmountFen || !dto.costBearer || !dto.clawbackNote?.trim())) throw new BadRequestException('请填写有效退费金额、承担方及机构／主理人冲回说明，金额不能超过本次分摊与订单剩余实付')
        Object.assign(update, { status: reviewing ? 'review_proposed' : 'proposed', outcome: dto.outcome, proposal: dto.note.trim(), refundAmountFen: amount, costBearer: dto.outcome === 'refund' ? dto.costBearer : '', clawbackNote: dto.outcome === 'refund' ? dto.clawbackNote!.trim() : '', restoredExpiresAt: expiry, correctedEntitlementId: dto.outcome === 'correct_item' ? BigInt(dto.correctedEntitlementId!) : null, deadline: null, acceptedAt: null, refundId: null, ...(reviewing ? { reviewedByAdminId: adminId } : { proposedByAdminId: adminId }) })
      }
      await tx.serviceDispute.update({ where: { id }, data: update })
      await this.event(tx, id, adminId, 'admin', dto.action, dto.note.trim(), row.planId)
    })
    return this.detail(id)
  }
  async userAct(id: bigint, userId: bigint, dto: DisputeUserActionDto) {
    await this.prisma.$transaction(async tx => {
      const row = await this.lock(tx, id)
      if (row.plan.userId !== userId) throw new NotFoundException('异议记录不存在')
      if (dto.action === 'accept' && ['resolved', 'executing', 'awaiting_rebooking'].includes(row.status) && row.acceptedAt) return
      this.checkVersion(row, dto.expectedUpdatedAt)
      if (!['proposed', 'review_proposed'].includes(row.status)) throw new BadRequestException('当前没有可确认的处理方案')
      if (dto.action !== 'accept') {
        if (!dto.note?.trim()) throw new BadRequestException('请填写不接受结果的原因')
        const status = row.status === 'review_proposed' ? 'disputed' : 'review_requested'
        await tx.serviceDispute.update({ where: { id }, data: { status, overdueNotifiedAt: null, deadline: this.deadline(status === 'review_requested' ? 3 : 2) } })
        await this.event(tx, id, userId, 'user', status, dto.note.trim(), row.planId)
        return
      }
      if (row.outcome === 'refund') {
        const refundId = await this.createCompensation(tx, row, userId)
        await tx.serviceDispute.update({ where: { id }, data: { status: 'executing', acceptedAt: new Date(), refundId, deadline: null } })
      } else {
        if (row.outcome === 'correct_item') {
          const target = row.correctedEntitlementId ? await tx.serviceEntitlement.findFirst({ where: { id: row.correctedEntitlementId, planId: row.planId }, include: { orderItem: true } }) : null
          if (!target || target.orderItem.kind !== 'service' || target.totalQuantity <= target.usedQuantity + target.reservedQuantity + target.refundFrozen + target.refundedQuantity + target.expiredQuantity) throw new BadRequestException('实际项目的可用次数已变化，请联系平台重新确认方案')
          const changed = await tx.serviceAppointment.updateMany({ where: { id: row.appointmentId, status: 'completed', correctionStatus: 'none' }, data: { correctionStatus: 'item_corrected', correctionReason: `${row.proposal}；实际项目纠正为 ${target.orderItem.itemName}，原项目恢复 1 次，实际项目扣减 1 次。` } })
          if (!changed.count) throw new ConflictException('服务记录已修正，请刷新')
          const source = await tx.serviceEntitlement.updateMany({ where: { id: row.appointment.entitlementId, usedQuantity: { gte: 1 } }, data: { usedQuantity: { decrement: 1 } } })
          if (!source.count) throw new BadRequestException('原项目已使用次数异常')
          const moved = await tx.serviceEntitlement.updateMany({ where: { id: target.id, usedQuantity: target.usedQuantity, reservedQuantity: target.reservedQuantity, refundFrozen: target.refundFrozen, refundedQuantity: target.refundedQuantity, expiredQuantity: target.expiredQuantity, totalQuantity: target.totalQuantity }, data: { usedQuantity: { increment: 1 } } })
          if (!moved.count) throw new ConflictException('实际项目次数已变化，请刷新')
          const expiry = row.restoredExpiresAt
          if (row.plan.expiresAt <= new Date() && (!expiry || expiry <= new Date())) throw new BadRequestException('方案确认时有效期已变化，请联系平台更新方案')
          await tx.servicePlan.update({ where: { id: row.planId }, data: { status: 'active', expiresAt: expiry && expiry > row.plan.expiresAt ? expiry : undefined } })
        }
        if (['restore', 'rearrange'].includes(row.outcome)) {
          const changed = await tx.serviceAppointment.updateMany({ where: { id: row.appointmentId, correctionStatus: 'none', status: 'completed' }, data: { correctionStatus: 'restored', correctionReason: row.proposal } })
          if (!changed.count) throw new ConflictException('服务记录已修正，请刷新')
          const restored = await tx.serviceEntitlement.updateMany({ where: { id: row.appointment.entitlementId, usedQuantity: { gte: 1 } }, data: { usedQuantity: { decrement: 1 } } })
          if (!restored.count) throw new BadRequestException('已使用次数异常，无法恢复')
          const expiry = row.restoredExpiresAt
          if (row.plan.expiresAt <= new Date() && (!expiry || expiry <= new Date())) throw new BadRequestException('方案确认时有效期已变化，请联系平台更新方案')
          await tx.servicePlan.update({ where: { id: row.planId }, data: { status: 'active', expiresAt: expiry && expiry > row.plan.expiresAt ? expiry : undefined } })
        }
        await tx.serviceDispute.update({ where: { id }, data: row.outcome === 'rearrange' ? { status: 'awaiting_rebooking', acceptedAt: new Date(), deadline: this.deadline(2), overdueNotifiedAt: null } : { status: 'resolved', acceptedAt: new Date(), resolvedAt: new Date(), settlementHeld: false, deadline: null } })
      }
      await this.event(tx, id, userId, 'user', 'accepted', `患者明确接受处理方案：${row.proposal}`, row.planId)
    })
    return this.detail(id, userId)
  }
  private async lock(tx: Prisma.TransactionClient, id: bigint): Promise<DisputeRow> {
    const initial = await tx.serviceDispute.findUnique({ where: { id }, include: { plan: true } })
    if (!initial) throw new NotFoundException('异议记录不存在')
    await tx.$queryRaw`SELECT id FROM "ServiceOrder" WHERE id = ${initial.plan.orderId} FOR UPDATE`
    return tx.serviceDispute.findUniqueOrThrow({ where: { id }, include })
  }
  private checkVersion(row: DisputeRow, expected: string) { if (row.updatedAt.toISOString() !== new Date(expected).toISOString()) throw new ConflictException('异议进度已变化，请刷新后操作') }
  private requireIndependent(row: DisputeRow, adminId: bigint) { if (row.appointment.completedByAdminId === adminId) throw new ForbiddenException('原服务登记人不能自行提出终结方案或处理复核') }
  private async createCompensation(tx: Prisma.TransactionClient, row: DisputeRow, actorId: bigint) {
    const order = await tx.serviceOrder.findUniqueOrThrow({ where: { id: row.plan.orderId } })
    if (row.refundAmountFen <= 0 || row.refundAmountFen > order.paymentAmountFen - order.refundedAmountFen) throw new BadRequestException('例外退费金额超过剩余实付，请联系平台调整方案')
    if (await tx.serviceRefund.count({ where: { orderId: order.id, status: { in: ['pending', 'processing'] } } })) throw new BadRequestException('订单已有进行中的退款，请处理后再确认退费方案')
    const token = `${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`
    const right = row.appointment.entitlement
    const refund = await tx.serviceRefund.create({ data: { orderId: order.id, userId: row.plan.userId, refundNo: `SR-${token}`, outRefundNo: `SROUT-${token}`, requestedAmountFen: row.refundAmountFen, reason: `服务异议 #${row.id} 例外退费：${row.proposal}`, items: { create: { entitlementId: right.id, orderItemId: right.orderItemId, quantity: 0, amountFen: row.refundAmountFen, compensation: true } }, events: { create: { eventType: 'dispute_compensation', actorType: 'system', actorId, toStatus: 'pending', detail: `患者已接受方案，承担方：${row.costBearer}；冲回口径：${row.clawbackNote}。仅资金补偿，不改写已完成服务事实。` } } } })
    await this.event(tx, row.id, actorId, 'system', 'compensation_created', `生成例外退费申请 #${refund.id}，金额 ¥${(row.refundAmountFen / 100).toFixed(2)}，等待独立财务审核与微信确认。`, row.planId)
    return refund.id
  }
  private async event(tx: Prisma.TransactionClient, id: bigint, actorId: bigint, actorType: string, eventType: string, detail: string, planId: bigint) {
    const event = await tx.serviceDisputeEvent.create({ data: { disputeId: id, actorId, actorType, eventType, detail } })
    await tx.auditLog.create({ data: { actorType, actorId, action: `service_dispute.${eventType}`, targetType: 'service_dispute', targetId: id, reason: detail } })
    const plan = await tx.servicePlan.findUniqueOrThrow({ where: { id: planId } })
    await recordServiceNotice(tx, { eventKey: `dispute:${id}:event:${event.id}`, userId: plan.userId, title: '服务异议进度已更新', detail, path: `/pages/services/dispute-detail?id=${id}` })
  }
  @Cron('0 */15 * * * *')
  async remindOverdue() {
    const rows = await this.prisma.serviceDispute.findMany({ where: { deadline: { lt: new Date() }, resolvedAt: null, overdueNotifiedAt: null }, include: { plan: true }, orderBy: { deadline: 'asc' }, take: 200 })
    for (const row of rows) await this.prisma.$transaction(async tx => {
      const claimed = await tx.serviceDispute.updateMany({ where: { id: row.id, deadline: row.deadline, resolvedAt: null, overdueNotifiedAt: null }, data: { overdueNotifiedAt: new Date() } })
      if (claimed.count) await recordServiceNotice(tx, { eventKey: `dispute:${row.id}:overdue:${row.deadline!.getTime()}`, userId: row.plan.userId, title: '服务异议处理已超期', detail: '当前反馈期限已过，平台需继续协调并明确下一步。不会因您未回复而自动结案。', path: `/pages/services/dispute-detail?id=${row.id}` })
    })
  }
  private toVO(row: DisputeRow, admin: boolean) {
    const unitCap = Math.ceil(row.appointment.entitlement.orderItem.allocatedAmountFen / row.appointment.entitlement.totalQuantity)
    return { id: Number(row.id), orderId: Number(row.plan.orderId), planId: Number(row.planId), appointmentId: Number(row.appointmentId), replacementAppointmentId: row.replacementAppointmentId ? Number(row.replacementAppointmentId) : null, entitlementId: Number(row.appointment.entitlementId), correctedEntitlementId: row.correctedEntitlementId ? Number(row.correctedEntitlementId) : null, correctedItemName: row.correctedEntitlement?.orderItem.itemName || null, reasonType: row.reasonType, description: row.description, status: row.status, ownerName: row.ownerName, evidence: row.evidence, outcome: row.outcome, proposal: row.proposal, refundAmountFen: row.refundAmountFen, restoredExpiresAt: row.restoredExpiresAt, refundId: row.refundId ? Number(row.refundId) : null, refundStatus: row.refund?.status || null, deadline: row.deadline, acceptedAt: row.acceptedAt, resolvedAt: row.resolvedAt, settlementHeld: row.settlementHeld, createdAt: row.createdAt, updatedAt: row.updatedAt, orderNo: row.plan.order.orderNo, institutionName: row.plan.institution.name, itemName: row.appointment.entitlement.orderItem.itemName, performedByName: row.appointment.performedByName, completedAt: row.appointment.completedAt, events: row.events.map(event => ({ id: Number(event.id), actorType: event.actorType, eventType: event.eventType, detail: event.detail, createdAt: event.createdAt })), ...(admin ? { costBearer: row.costBearer, clawbackNote: row.clawbackNote, refundLimitFen: Math.max(0, Math.min(unitCap, row.plan.order.paymentAmountFen - row.plan.order.refundedAmountFen)), user: { nickname: row.plan.user.nickname, phoneMasked: row.plan.user.phoneMasked }, originalRecorderId: row.appointment.completedByAdminId ? Number(row.appointment.completedByAdminId) : null } : {}) }
  }
}
