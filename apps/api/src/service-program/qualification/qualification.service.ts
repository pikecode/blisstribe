import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma.service'
import { SyncServiceQualificationsDto } from '../dto/qualification.dto'

const qualificationInclude = {
  offering: {
    include: {
      institution: { select: { id: true, name: true, address: true, status: true } },
      items: { where: { retiredAt: null }, orderBy: { sortOrder: 'asc' as const } },
    },
  },
}

@Injectable()
export class ServiceQualificationService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmin(leadId: bigint) {
    await this.requireLead(leadId)
    const rows = await this.prisma.serviceQualification.findMany({
      where: { leadId },
      include: qualificationInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map((row) => this.toVO(row))
  }

  async listMine(leadId: bigint, userId: bigint) {
    const lead = await this.requireLead(leadId)
    if (lead.userId !== userId) throw new ForbiddenException('无权查看该咨询记录')

    const now = new Date()
    const rows = await this.prisma.serviceQualification.findMany({
      where: {
        leadId,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        offering: {
          status: 1,
          deletedAt: null,
          institution: { status: 1, deletedAt: null },
        },
      },
      include: qualificationInclude,
      orderBy: { confirmedAt: 'desc' },
    })
    return rows.map((row) => this.toVO(row, false))
  }

  async syncAdmin(leadId: bigint, adminId: bigint, dto: SyncServiceQualificationsDto) {
    if (dto.offeringIds.length && (!dto.professionalName?.trim() || !dto.note?.trim())) throw new BadRequestException('请填写确认医生和业务确认依据')
    const lead = await this.requireLead(leadId)
    const offeringIds = [...new Set(dto.offeringIds)].map(BigInt)
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null
    if (expiresAt && expiresAt <= new Date()) throw new BadRequestException('资格有效期必须晚于当前时间')

    const offerings = offeringIds.length
      ? await this.prisma.serviceOffering.findMany({
          where: { id: { in: offeringIds }, productId: lead.productId, status: 1, deletedAt: null },
          select: { id: true },
        })
      : []
    if (offerings.length !== offeringIds.length) throw new BadRequestException('所选方案必须属于该服务产品且处于上架状态')

    const existing = await this.prisma.serviceQualification.findMany({
      where: { leadId, status: 'active' },
      select: { offeringId: true },
    })
    const selected = new Set(offeringIds.map(String))
    const nextLeadStatus = offeringIds.length ? 'qualified' : ['converted', 'invalid'].includes(lead.status) ? lead.status : 'contacted'
    const now = new Date()

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceQualification.updateMany({
        where: { leadId, status: 'active', offeringId: { notIn: offeringIds } },
        data: { status: 'revoked', revokedAt: now },
      })
      for (const offeringId of offeringIds) {
        await tx.serviceQualification.upsert({
          where: { leadId_offeringId: { leadId, offeringId } },
          create: {
            leadId,
            offeringId,
            status: 'active',
            note: dto.note?.trim() || '',
            professionalName: dto.professionalName?.trim() || '',
            confirmedByAdminId: adminId,
            confirmedAt: now,
            expiresAt,
          },
          update: {
            status: 'active',
            note: dto.note?.trim() || '',
            professionalName: dto.professionalName?.trim() || '',
            confirmedByAdminId: adminId,
            confirmedAt: now,
            expiresAt,
            revokedAt: null,
          },
        })
      }
      if (nextLeadStatus !== lead.status) {
        await tx.productLead.update({ where: { id: leadId }, data: { status: nextLeadStatus } })
        await tx.productLeadFollowUp.create({
          data: {
            leadId,
            operatorId: adminId,
            operatorType: 'admin',
            fromStatus: lead.status,
            toStatus: nextLeadStatus,
            note: offeringIds.length ? '已确认可购买方案' : '已撤销全部购买资格',
          },
        })
      }
      await tx.auditLog.create({
        data: {
          actorType: 'admin',
          actorId: adminId,
          action: 'service_qualification.sync',
          targetType: 'product_lead',
          targetId: leadId,
          reason: dto.note?.trim() || null,
          metadata: {
            beforeOfferingIds: existing.map((item) => Number(item.offeringId)),
            afterOfferingIds: offeringIds.map(Number),
            expiresAt: expiresAt?.toISOString() || null,
          },
        },
      })
    })

    const rows = await this.prisma.serviceQualification.findMany({
      where: { leadId, offeringId: { in: offeringIds } },
      include: qualificationInclude,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.filter((row) => selected.has(String(row.offeringId)) && row.status === 'active').map((row) => this.toVO(row))
  }

  private async requireLead(id: bigint) {
    const lead = await this.prisma.productLead.findUnique({ where: { id } })
    if (!lead) throw new NotFoundException('咨询线索不存在')
    return lead
  }

  private toVO(row: any, admin = true) {
    return {
      ...row,
      note: admin ? row.note : undefined,
      id: Number(row.id),
      leadId: Number(row.leadId),
      offeringId: Number(row.offeringId),
      confirmedByAdminId: Number(row.confirmedByAdminId),
      offering: {
        ...row.offering,
        defaultPromoterRateBps: admin ? row.offering.defaultPromoterRateBps : undefined,
        id: Number(row.offering.id),
        productId: Number(row.offering.productId),
        institutionId: Number(row.offering.institutionId),
        institution: { ...row.offering.institution, id: Number(row.offering.institution.id) },
        items: row.offering.items.map((item: any) => ({ ...item, id: Number(item.id), skuId: item.skuId ? Number(item.skuId) : null, offeringId: Number(item.offeringId), institutionSettlementFen: admin ? item.institutionSettlementFen : undefined })),
      },
    }
  }
}
