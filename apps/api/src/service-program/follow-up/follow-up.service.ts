import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { type ServiceFollowUp } from '@prisma/client'
import { PrismaService } from '../../common/prisma.service'
import { CreateServiceFollowUpDto, ResolveServiceFollowUpDto } from '../dto/follow-up.dto'
import { recordServiceNotice } from '../notice'

@Injectable()
export class ServiceFollowUpService {
  constructor(private readonly prisma: PrismaService) {}

  async list(planId: bigint, userId?: bigint) {
    await this.requirePlan(planId, userId)
    const rows = await this.prisma.serviceFollowUp.findMany({ where: { planId }, orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }] })
    return rows.map(row => this.toVO(row))
  }

  async create(planId: bigint, adminId: bigint, dto: CreateServiceFollowUpDto) {
    const plan = await this.requirePlan(planId)
    const scheduledAt = new Date(dto.scheduledAt)
    if (scheduledAt <= new Date() || !dto.contactName.trim() || !dto.purpose.trim() || !dto.clientRequestId.trim()) {
      throw new BadRequestException('请填写未来的联系时间、负责人和随访目的')
    }
    const row = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ServicePlan" WHERE id = ${planId} FOR UPDATE`
      const existing = await tx.serviceFollowUp.findUnique({ where: { planId_clientRequestId: { planId, clientRequestId: dto.clientRequestId.trim() } } })
      if (existing) return existing
      const record = await tx.serviceFollowUp.create({ data: { planId, scheduledAt, contactName: dto.contactName.trim(), purpose: dto.purpose.trim(), clientRequestId: dto.clientRequestId.trim(), createdByAdminId: adminId } })
      await tx.auditLog.create({ data: { actorType: 'admin', actorId: adminId, action: 'service_followup.create', targetType: 'service_followup', targetId: record.id, reason: record.purpose } })
      await recordServiceNotice(tx, { eventKey: `followup:${record.id}:scheduled`, userId: plan.userId, title: '机构已安排服务随访', detail: `${record.contactName} 将于 ${scheduledAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）联系您。请查看服务详情。`, path: `/pages/services/detail?id=${planId}` })
      return record
    })
    return this.toVO(row)
  }

  async resolve(id: bigint, adminId: bigint, dto: ResolveServiceFollowUpDto) {
    if (!dto.outcome.trim()) throw new BadRequestException('请填写联系结果或取消原因')
    const row = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ServiceFollowUp" WHERE id = ${id} FOR UPDATE`
      const current = await tx.serviceFollowUp.findUnique({ where: { id }, include: { plan: true } })
      if (!current) throw new NotFoundException('随访记录不存在')
      if (current.status === dto.status && current.outcome === dto.outcome.trim()) return current
      if (current.status !== 'scheduled') throw new ConflictException('随访已处理，请刷新查看结果')
      const record = await tx.serviceFollowUp.update({ where: { id }, data: { status: dto.status, outcome: dto.outcome.trim(), completedAt: dto.status === 'completed' ? new Date() : null, completedByAdminId: adminId } })
      await tx.auditLog.create({ data: { actorType: 'admin', actorId: adminId, action: `service_followup.${dto.status}`, targetType: 'service_followup', targetId: id, reason: record.outcome } })
      await recordServiceNotice(tx, { eventKey: `followup:${id}:${dto.status}`, userId: current.plan.userId, title: dto.status === 'completed' ? '服务随访已登记' : '服务随访已取消', detail: record.outcome, path: `/pages/services/detail?id=${current.planId}` })
      return record
    })
    return this.toVO(row)
  }

  async feedback(id: bigint, userId: bigint, feedback: string) {
    if (!feedback.trim()) throw new BadRequestException('请填写服务体验反馈')
    const changed = await this.prisma.serviceFollowUp.updateMany({ where: { id, status: 'completed', plan: { userId }, feedbackAt: null }, data: { patientFeedback: feedback.trim(), feedbackAt: new Date() } })
    if (!changed.count) throw new BadRequestException('随访未完成、反馈已提交或记录不存在')
    return { success: true }
  }

  private async requirePlan(id: bigint, userId?: bigint) {
    const plan = await this.prisma.servicePlan.findFirst({ where: { id, userId } })
    if (!plan) throw new NotFoundException('服务计划不存在')
    return plan
  }

  private toVO(row: ServiceFollowUp) {
    return { id: Number(row.id), planId: Number(row.planId), scheduledAt: row.scheduledAt, contactName: row.contactName, purpose: row.purpose, status: row.status, outcome: row.outcome, patientFeedback: row.patientFeedback, feedbackAt: row.feedbackAt, completedAt: row.completedAt, createdAt: row.createdAt }
  }
}
