import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ServiceAppointment } from '@prisma/client'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../common/prisma.service'
import { CancelServiceAppointmentDto, ConfirmServiceAppointmentDto, CreateServiceAppointmentDto, CreateServiceSlotDto } from '../dto/appointment.dto'

import { confirmationDeadline, withinReceptionHours, type ReceptionHours } from './work-hours'

import { recordServiceNotice } from '../notice'

const activeStatuses = ['pending', 'confirmed', 'arrived']
const appointmentInclude = {
  plan: { include: { order: { include: { offering: { select: { id: true, name: true } } } } } },
  entitlement: { include: { orderItem: true } },
  institution: { select: { id: true, name: true, address: true, receptionHours: true } },
  user: { select: { id: true, nickname: true, phoneMasked: true } },
}

@Injectable()
export class ServiceAppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(planId: bigint, userId: bigint, dto: CreateServiceAppointmentDto) {
    const clientRequestId = dto.clientRequestId.trim()
    if (!clientRequestId) throw new BadRequestException('请求标识不能为空')
    const existing = await this.prisma.serviceAppointment.findUnique({
      where: { userId_clientRequestId: { userId, clientRequestId } }, include: appointmentInclude,
    })
    if (existing) return this.toVO(existing)

    const requestedStartAt = new Date(dto.requestedStartAt)
    if (requestedStartAt.getTime() <= Date.now() + 60 * 60 * 1000) throw new BadRequestException('预约开始时间需至少提前 1 小时')

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "ServiceAppointmentSlot" WHERE id = ${BigInt(dto.slotId)} FOR UPDATE`
        const slot = await tx.serviceAppointmentSlot.findUnique({ where: { id: BigInt(dto.slotId) } })
        if (!slot?.enabled || slot.startAt.getTime() !== requestedStartAt.getTime()) throw new BadRequestException('预约时段不存在或已关闭')
        const occupied = await tx.serviceAppointment.count({ where: { slotId: slot.id, status: { in: activeStatuses } } })
        if (occupied >= slot.capacity) throw new BadRequestException('该时段已约满，请选择其他时段')
        const plan = await tx.servicePlan.findFirst({
          where: { id: planId, userId, status: 'active' },
          include: { institution: true, entitlements: { where: { id: BigInt(dto.entitlementId) }, include: { orderItem: true } } },
        })
        if (!plan) throw new NotFoundException('可预约的服务计划不存在')
        if (plan.institution.status !== 1 || plan.institution.deletedAt) throw new BadRequestException('机构已暂停接待')
        if (slot.institutionId !== plan.institutionId) throw new BadRequestException('时段不属于当前服务机构')
        if (plan.expiresAt <= new Date()) throw new BadRequestException('服务已过期，不能新增预约')
        if (requestedStartAt < plan.startsAt || requestedStartAt > plan.expiresAt) throw new BadRequestException('预约时间需在服务有效期内')
        const entitlement = plan.entitlements[0]
        if (!entitlement || entitlement.orderItem.kind !== 'service') throw new BadRequestException('请选择当前计划中的服务项目，实物不可预约')
        if (entitlement.bookingBlocked) throw new BadRequestException('当前项目预约资格暂停，请联系机构确认后恢复')
        const available = entitlement.totalQuantity - entitlement.reservedQuantity - entitlement.usedQuantity
          - entitlement.refundFrozen - entitlement.refundedQuantity - entitlement.expiredQuantity
        if (available <= 0) throw new BadRequestException('该服务项目暂无可预约次数')

        const slotDuration = Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60000)
        await this.assertNoOverlap(tx, userId, requestedStartAt, slotDuration)
        const claimed = await tx.serviceEntitlement.updateMany({
          where: {
            id: entitlement.id,
            reservedQuantity: entitlement.reservedQuantity,
            usedQuantity: entitlement.usedQuantity,
            refundFrozen: entitlement.refundFrozen,
            refundedQuantity: entitlement.refundedQuantity,
            expiredQuantity: entitlement.expiredQuantity,
          },
          data: { reservedQuantity: { increment: 1 } },
        })
        if (claimed.count !== 1) throw new BadRequestException('服务次数已发生变化，请刷新后重试')
        const created = await tx.serviceAppointment.create({
          data: {
            clientRequestId, planId, entitlementId: entitlement.id, userId, institutionId: plan.institutionId,
            confirmationDeadline: confirmationDeadline(new Date(), slot.startAt, plan.institution.receptionHours as unknown as ReceptionHours),
            slotId: slot.id, requestedStartAt, durationMinutes: slotDuration, patientNote: dto.patientNote?.trim() || '',
          },
          include: appointmentInclude,
        })
        await this.recordEvent(tx, created, 'pending', '预约申请已提交，等待机构确认')
        return created
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      return this.toVO(created)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicated = await this.prisma.serviceAppointment.findUnique({
          where: { userId_clientRequestId: { userId, clientRequestId } }, include: appointmentInclude,
        })
        if (duplicated) return this.toVO(duplicated)
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new BadRequestException('该时段或权益刚刚发生变化，请刷新后重试')
      throw error
    }
  }

  async slots(institutionId: bigint, admin = false) {
    const rows = await this.prisma.serviceAppointmentSlot.findMany({
      where: { institutionId, ...(admin ? {} : { enabled: true, startAt: { gt: new Date(Date.now() + 3600000) } }) },
      include: { _count: { select: { appointments: { where: { status: { in: activeStatuses } } } } } },
      orderBy: { startAt: 'asc' }, take: 300,
    })
    return rows.map((row) => ({ id: Number(row.id), institutionId: Number(row.institutionId), startAt: row.startAt, endAt: row.endAt, capacity: row.capacity, enabled: row.enabled, available: Math.max(0, row.capacity - row._count.appointments) }))
  }

  async createSlot(dto: CreateServiceSlotDto) {
    const startAt = new Date(dto.startAt)
    const endAt = new Date(dto.endAt)
    const duration = (endAt.getTime() - startAt.getTime()) / 60000
    if (startAt <= new Date() || duration < 15 || duration > 480) throw new BadRequestException('时段需晚于当前时间，时长为 15 至 480 分钟')
    const institution = await this.prisma.serviceInstitution.findFirst({ where: { id: BigInt(dto.institutionId), status: 1, deletedAt: null } })
    if (!institution) throw new BadRequestException('履约机构不存在或已停用')
    if (!withinReceptionHours(startAt, endAt, institution.receptionHours as unknown as ReceptionHours)) throw new BadRequestException('时段必须位于机构公布的接待时间内')
    const row = await this.prisma.serviceAppointmentSlot.create({ data: { institutionId: institution.id, startAt, endAt, capacity: dto.capacity } })
    return { ...row, id: Number(row.id), institutionId: Number(row.institutionId) }
  }

  async closeSlot(id: bigint) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceAppointmentSlot" WHERE id = ${id} FOR UPDATE`
      const occupied = await tx.serviceAppointment.count({ where: { slotId: id, status: { in: activeStatuses } } })
      if (occupied) throw new BadRequestException('该时段仍有预约，请先协调现有预约')
      await tx.serviceAppointmentSlot.update({ where: { id }, data: { enabled: false } })
    })
    return { closed: true }
  }

  async listMine(userId: bigint, planId?: bigint) {
    const rows = await this.prisma.serviceAppointment.findMany({
      where: { userId, planId }, include: appointmentInclude, orderBy: { requestedStartAt: 'desc' },
    })
    return rows.map((row) => this.toVO(row))
  }

  async detailMine(id: bigint, userId: bigint) {
    const row = await this.prisma.serviceAppointment.findFirst({ where: { id, userId }, include: appointmentInclude })
    if (!row) throw new NotFoundException('预约不存在')
    const proposedSlot = row.proposedSlotId ? await this.prisma.serviceAppointmentSlot.findUnique({ where: { id: row.proposedSlotId } }) : null
    return { ...this.toVO(row), proposedStartAt: proposedSlot?.startAt || null }
  }

  async cancelMine(id: bigint, userId: bigint, dto: CancelServiceAppointmentDto) {
    const row = await this.prisma.serviceAppointment.findFirst({ where: { id, userId }, include: appointmentInclude })
    if (!row) throw new NotFoundException('预约不存在')
    if (row.status === 'cancelled') return this.toVO(row)
    if (!['pending', 'confirmed'].includes(row.status)) throw new BadRequestException('当前预约状态不能取消')
    const startAt = row.confirmedStartAt || row.requestedStartAt
    if (row.status === 'confirmed' && startAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000) {
      throw new BadRequestException('距预约开始不足 24 小时，请联系客服协调')
    }
    return this.releaseReservation(row, dto.reason?.trim() || '患者取消')
  }

  async listAdmin(params: { status?: string; institutionId?: bigint; date?: string }) {
    const dayStart = params.date ? new Date(`${params.date}T00:00:00+08:00`) : undefined
    const dayEnd = dayStart ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : undefined
    const rows = await this.prisma.serviceAppointment.findMany({
      where: {
        status: params.status || undefined,
        institutionId: params.institutionId,
        ...(dayStart && dayEnd ? { requestedStartAt: { gte: dayStart, lt: dayEnd } } : {}),
      },
      include: appointmentInclude,
      orderBy: { requestedStartAt: 'asc' },
      take: 200,
    })
    return rows.map((row) => this.toVO(row))
  }

  async confirm(id: bigint, adminId: bigint, dto: ConfirmServiceAppointmentDto) {
    const row = await this.getAdminRow(id)
    if (row.status === 'confirmed') return this.toVO(row)
    if (row.status !== 'pending') throw new BadRequestException('仅待确认预约可以确认')
    if (row.confirmationDeadline && row.confirmationDeadline <= new Date()) throw new BadRequestException('确认期限已过，请重新协调预约')
    const confirmedStartAt = dto.confirmedStartAt ? new Date(dto.confirmedStartAt) : row.requestedStartAt
    if (confirmedStartAt.getTime() !== row.requestedStartAt.getTime()) {
      throw new BadRequestException('更换预约时间需要患者确认，请按原申请时间确认')
    }
    if (dto.durationMinutes && dto.durationMinutes !== row.durationMinutes) throw new BadRequestException('服务时长须与预约时段一致')
    const durationMinutes = row.durationMinutes
    if (confirmedStartAt.getTime() <= Date.now()) throw new BadRequestException('确认时间必须晚于当前时间')
    if (confirmedStartAt < row.plan.startsAt || confirmedStartAt > row.plan.expiresAt) throw new BadRequestException('确认时间需在服务有效期内')
    await this.assertNoOverlap(this.prisma, row.userId, confirmedStartAt, durationMinutes, row.id)
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceAppointment.updateMany({ where: { id, status: 'pending' }, data: {
        status: 'confirmed', confirmedStartAt, durationMinutes, assignedStaffName: dto.assignedStaffName?.trim() || '', confirmedByAdminId: adminId, confirmedAt: new Date(),
      } })
      if (!changed.count) throw new BadRequestException('预约状态已变化')
      await this.recordEvent(tx, row, 'confirmed', '机构已确认预约，请按时到场', adminId)
    })
    return this.getAdminVO(id)
  }

  async arrive(id: bigint) {
    const row = await this.getAdminRow(id)
    if (['arrived', 'completed'].includes(row.status)) return this.toVO(row)
    if (row.status !== 'confirmed') throw new BadRequestException('仅已确认预约可以登记到场')
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceAppointment.updateMany({ where: { id, status: 'confirmed' }, data: { status: 'arrived', arrivedAt: new Date() } })
      if (!changed.count) throw new BadRequestException('预约状态已变化，请刷新后重试')
      await this.recordEvent(tx, row, 'arrived', '机构已登记到场')
    })
    return this.getAdminVO(id)
  }

  async complete(id: bigint, adminId?: bigint, performedByName?: string) {
    const row = await this.getAdminRow(id)
    if (row.status === 'completed') return this.toVO(row)
    if (row.status !== 'arrived') throw new BadRequestException('请先登记患者到场')
    if (!performedByName?.trim()) throw new BadRequestException('请填写实际执行人员')
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceAppointment.updateMany({ where: { id, status: 'arrived' }, data: { status: 'completed', completedAt: new Date(), performedByName: performedByName.trim(), completedByAdminId: adminId } })
      if (!changed.count) return
      const entitlement = await tx.serviceEntitlement.findUniqueOrThrow({ where: { id: row.entitlementId } })
      if (entitlement.reservedQuantity < 1) throw new BadRequestException('预约占用数量异常，无法核销')
      await tx.serviceEntitlement.update({
        where: { id: entitlement.id }, data: { reservedQuantity: { decrement: 1 }, usedQuantity: { increment: 1 } },
      })
      const rights = await tx.serviceEntitlement.findMany({ where: { planId: row.planId } })
      const allFinished = rights.every((item) => item.reservedQuantity === 0
        && item.refundFrozen === 0
        && item.totalQuantity === item.usedQuantity + item.refundedQuantity + item.expiredQuantity)
      await this.recordEvent(tx, row, 'completed', `本次服务已完成，执行人员：${performedByName.trim()}，核销 1 次权益`, adminId)
      if (allFinished) await tx.servicePlan.update({ where: { id: row.planId }, data: { status: 'completed' } })
    })
    return this.getAdminVO(id)
  }

  async cancelAdmin(id: bigint, reason: string) {
    if (!reason.trim()) throw new BadRequestException('机构取消必须填写原因')
    const row = await this.getAdminRow(id)
    if (!['pending', 'confirmed'].includes(row.status)) throw new BadRequestException('当前预约不能取消')
    return this.releaseReservation(row, `机构取消：${reason.trim()}`, ['pending', 'confirmed'], true)
  }

  async noShow(id: bigint, reason: string) {
    const row = await this.getAdminRow(id)
    if (row.status === 'no_show') return this.toVO(row)
    if (row.status !== 'confirmed') throw new BadRequestException('仅已确认预约可以登记未到场')
    if ((row.confirmedStartAt || row.requestedStartAt).getTime() > Date.now()) throw new BadRequestException('预约尚未开始，不能登记未到场')
    if (!reason.trim()) throw new BadRequestException('请填写未到场说明')
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceAppointment.updateMany({
        where: { id, status: 'confirmed' },
        data: { status: 'no_show', cancelReason: reason.trim(), cancelledAt: new Date() },
      })
      if (!changed.count) throw new BadRequestException('预约状态已变化')
      const released = await tx.serviceEntitlement.updateMany({
        where: { id: row.entitlementId, reservedQuantity: { gte: 1 } },
        data: { reservedQuantity: { decrement: 1 }, bookingBlocked: true, bookingBlockReason: reason.trim() },
      })
      if (!released.count) throw new BadRequestException('预约占用数量异常')
      await this.recordEvent(tx, row, 'no_show', '机构登记未到场，后续预约需确认恢复资格')
    })
    return this.getAdminVO(id)
  }

  async restoreBooking(id: bigint, adminId: bigint, reason: string) {
    if (!reason.trim()) throw new BadRequestException('恢复预约资格必须填写说明')
    const row = await this.getAdminRow(id)
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceEntitlement.update({ where: { id: row.entitlementId }, data: { bookingBlocked: false, bookingBlockReason: '' } })
      await tx.auditLog.create({ data: { actorType: 'admin', actorId: adminId, action: 'service_booking.restored', targetType: 'service_entitlement', targetId: row.entitlementId, reason: reason.trim() } })
    })
    return this.getAdminVO(id)
  }

  async proposeReschedule(id: bigint, slotId: bigint, reason: string) {
    if (!reason.trim()) throw new BadRequestException('请填写改约原因')
    const row = await this.getAdminRow(id)
    const slot = await this.prisma.serviceAppointmentSlot.findUnique({ where: { id: slotId } })
    if (!['pending', 'confirmed'].includes(row.status)) throw new BadRequestException('当前预约不能改约')
    if (!slot?.enabled || slot.institutionId !== row.institutionId || slot.startAt.getTime() <= Date.now() + 3600000 || slot.startAt > row.plan.expiresAt) throw new BadRequestException('候选时段不可用')
    const changed = await this.prisma.serviceAppointment.updateMany({ where: { id, status: row.status }, data: { proposedSlotId: slotId, proposalReason: reason.trim(), proposalExpiresAt: new Date(slot.startAt.getTime() - 3600000) } })
    if (!changed.count) throw new BadRequestException('预约状态已变化')
    await this.prisma.$transaction(async (tx) => { await recordServiceNotice(tx, { eventKey: `appointment:${id}:proposal:${slotId}`, userId: row.userId, title: '机构提出改约建议', detail: reason.trim(), path: `/pages/services/appointment-detail?id=${id}` }) })
    return this.getAdminVO(id)
  }

  async acceptReschedule(id: bigint, userId: bigint) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ServiceAppointment" WHERE id = ${id} FOR UPDATE`
      const row = await tx.serviceAppointment.findFirst({ where: { id, userId }, include: { plan: true, entitlement: true } })
      if (!row || !['pending', 'confirmed', 'cancelled'].includes(row.status) || !row.proposedSlotId || !row.proposalExpiresAt || row.proposalExpiresAt <= new Date()) throw new BadRequestException('改约建议不存在或已过期')
      await tx.$queryRaw`SELECT id FROM "ServiceAppointmentSlot" WHERE id = ${row.proposedSlotId} FOR UPDATE`
      const slot = await tx.serviceAppointmentSlot.findUnique({ where: { id: row.proposedSlotId } })
      if (!slot?.enabled || slot.startAt.getTime() <= Date.now() + 3600000 || slot.institutionId !== row.institutionId || slot.startAt > row.plan.expiresAt || row.entitlement.bookingBlocked) throw new BadRequestException('候选时段或预约资格已变化')
      const occupied = await tx.serviceAppointment.count({ where: { slotId: slot.id, id: { not: id }, status: { in: activeStatuses } } })
      if (occupied >= slot.capacity) throw new BadRequestException('候选时段已满，请联系机构重新协调')
      if (row.status === 'cancelled') {
        const right = row.entitlement
        const available = right.totalQuantity - right.reservedQuantity - right.usedQuantity - right.refundFrozen - right.refundedQuantity - right.expiredQuantity
        if (available < 1) throw new BadRequestException('原预约权益已进入其他预约或售后，不能接受改约')
        const claimed = await tx.serviceEntitlement.updateMany({ where: { id: right.id, reservedQuantity: right.reservedQuantity, usedQuantity: right.usedQuantity, refundFrozen: right.refundFrozen, refundedQuantity: right.refundedQuantity }, data: { reservedQuantity: { increment: 1 } } })
        if (!claimed.count) throw new BadRequestException('权益数量已变化')
      }
      const durationMinutes = Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60000)
      await this.assertNoOverlap(tx, userId, slot.startAt, durationMinutes, id)
      await tx.serviceAppointment.update({ where: { id }, data: { slotId: slot.id, requestedStartAt: slot.startAt, confirmedStartAt: slot.startAt, durationMinutes, status: 'confirmed', confirmedAt: new Date(), proposedSlotId: null, proposalExpiresAt: null, proposalReason: '' } })
      await recordServiceNotice(tx, { eventKey: `appointment:${id}:rescheduled:${slot.id}`, userId, title: '预约时间已调整', detail: '已按您确认的新时段安排到场。', path: `/pages/services/appointment-detail?id=${id}` })
      await tx.auditLog.create({ data: { actorType: 'user', actorId: userId, action: 'service_appointment.rescheduled', targetType: 'service_appointment', targetId: id, reason: row.proposalReason, metadata: { previousStartAt: (row.confirmedStartAt || row.requestedStartAt).toISOString(), startAt: slot.startAt.toISOString() } } })
    })
    return this.detailMine(id, userId)
  }

  @Cron('0 9 * * *', { timeZone: 'Asia/Shanghai' })
  async remindTomorrow() {
    const local = new Date(Date.now() + 8 * 3600000)
    const tomorrow = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - 8 * 3600000)
    const rows = await this.prisma.serviceAppointment.findMany({ where: { status: 'confirmed', confirmedStartAt: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 86400000) } } })
    for (const row of rows) await this.prisma.$transaction(async (tx) => { await recordServiceNotice(tx, { eventKey: `appointment:${row.id}:reminder:${tomorrow.toISOString()}`, userId: row.userId, title: '明日预约提醒', detail: '您有明日到场预约，请查看时间和机构地址。', path: `/pages/services/appointment-detail?id=${row.id}` }) })
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cancelUnconfirmedBeforeStart() {
    const rows = await this.prisma.serviceAppointment.findMany({
      where: { status: 'pending', OR: [{ confirmationDeadline: { lte: new Date() } }, { requestedStartAt: { lte: new Date(Date.now() + 60 * 60 * 1000) } }] },
      include: { entitlement: true }, take: 200,
    })
    for (const row of rows) {
      await this.releaseReservation(row, '机构未在确认期限内确认，申请自动取消', ['pending'])
    }
  }

  private async releaseReservation(row: ServiceAppointment & { entitlement: any }, reason: string, statuses = ['pending', 'confirmed'], preserveProposal = false) {
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.serviceAppointment.updateMany({
        where: { id: row.id, status: { in: statuses } },
        data: { status: 'cancelled', cancelReason: reason, cancelledAt: new Date(), ...(preserveProposal ? {} : { proposedSlotId: null, proposalExpiresAt: null, proposalReason: '' }) },
      })
      if (!changed.count) return
      const released = await tx.serviceEntitlement.updateMany({
        where: { id: row.entitlementId, reservedQuantity: { gte: 1 } }, data: { reservedQuantity: { decrement: 1 } },
      })
      if (!released.count) throw new BadRequestException('预约占用数量异常，无法取消')
      await this.recordEvent(tx, row, 'cancelled', reason)
    })
    return this.getAdminVO(row.id)
  }

  private async recordEvent(tx: Prisma.TransactionClient, row: ServiceAppointment, status: string, detail: string, adminId?: bigint) {
    await tx.auditLog.create({ data: { actorType: adminId ? 'admin' : 'system', actorId: adminId, action: `service_appointment.${status}`, targetType: 'service_appointment', targetId: row.id, reason: detail } })
    await recordServiceNotice(tx, { eventKey: `appointment:${row.id}:${status}:${row.requestedStartAt.toISOString()}`, userId: row.userId, title: ({ pending: '预约等待确认', confirmed: '预约已确认', arrived: '已登记到场', completed: '服务已完成', cancelled: '预约已取消', no_show: '预约未到场' } as Record<string,string>)[status] || '预约状态更新', detail, path: `/pages/services/appointment-detail?id=${row.id}` })
  }

  private async getAdminRow(id: bigint) {
    const row = await this.prisma.serviceAppointment.findUnique({ where: { id }, include: appointmentInclude })
    if (!row) throw new NotFoundException('预约不存在')
    return row
  }

  private async getAdminVO(id: bigint) { return this.toVO(await this.getAdminRow(id)) }

  private async assertNoOverlap(tx: any, userId: bigint, startAt: Date, durationMinutes: number, excludeId?: bigint) {
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000)
    const candidates = await tx.serviceAppointment.findMany({
      where: { userId, status: { in: activeStatuses }, id: excludeId ? { not: excludeId } : undefined },
      select: { requestedStartAt: true, confirmedStartAt: true, durationMinutes: true },
    })
    const overlap = candidates.some((item: any) => {
      const otherStart = item.confirmedStartAt || item.requestedStartAt
      const otherEnd = new Date(otherStart.getTime() + item.durationMinutes * 60 * 1000)
      return startAt < otherEnd && endAt > otherStart
    })
    if (overlap) throw new BadRequestException('该时间与已有预约冲突')
  }

  private toVO(row: any) {
    return {
      ...row,
      id: Number(row.id), planId: Number(row.planId), entitlementId: Number(row.entitlementId),
      userId: Number(row.userId), institutionId: Number(row.institutionId),
      confirmedByAdminId: row.confirmedByAdminId ? Number(row.confirmedByAdminId) : null,
      plan: row.plan ? { ...row.plan, id: Number(row.plan.id), orderId: Number(row.plan.orderId), userId: Number(row.plan.userId), institutionId: Number(row.plan.institutionId), order: row.plan.order ? { ...row.plan.order, pricingSnapshot: undefined, sourcePartnerId: undefined, id: Number(row.plan.order.id), offering: row.plan.order.offering ? { ...row.plan.order.offering, id: Number(row.plan.order.offering.id) } : undefined } : undefined } : undefined,
      entitlement: row.entitlement ? { ...row.entitlement, id: Number(row.entitlement.id), planId: Number(row.entitlement.planId), orderItemId: Number(row.entitlement.orderItemId), orderItem: row.entitlement.orderItem ? { ...row.entitlement.orderItem, institutionSettlementFen: undefined, id: Number(row.entitlement.orderItem.id), orderId: Number(row.entitlement.orderItem.orderId), offeringItemId: Number(row.entitlement.orderItem.offeringItemId) } : undefined } : undefined,
      institution: row.institution ? { ...row.institution, id: Number(row.institution.id) } : undefined,
      user: row.user ? { ...row.user, id: Number(row.user.id) } : undefined,
    }
  }
}
