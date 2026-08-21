import { Injectable } from '@nestjs/common'
import { Prisma, type Partner } from '@prisma/client'
import { createHmac, randomBytes } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { ErrorCode } from '@blisstribe/shared'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import type { ApplyPartnerDto, UpdatePartnerDto } from './dto'

const PARTNER_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  REJECTED: 2,
  FROZEN: 3,
  DISABLED: 4,
} as const

const AUDIT_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async apply(userId: bigint, dto: ApplyPartnerDto) {
    const existing = await this.prisma.partnerMember.findFirst({
      where: {
        userId,
        role: 'owner',
        status: 1,
        partner: {
          status: { in: [PARTNER_STATUS.PENDING, PARTNER_STATUS.ACTIVE, PARTNER_STATUS.FROZEN] },
          deletedAt: null,
        },
      },
      include: { partner: true },
    })
    if (existing) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '已有入驻主体，不能重复申请')
    }

    const phoneData = this.buildPhoneData(dto.contactPhone)
    const partnerNo = await this.generatePartnerNo()

    const partner = await this.prisma.$transaction(async (tx) => {
      const created = await tx.partner.create({
        data: {
          partnerNo,
          displayName: dto.displayName,
          type: dto.type,
          status: PARTNER_STATUS.PENDING,
          auditStatus: AUDIT_STATUS.PENDING,
          contactName: dto.contactName,
          contactPhoneCiphertext: phoneData.ciphertext,
          contactPhoneHash: phoneData.hash,
          contactPhoneMasked: phoneData.masked,
          regionCode: dto.regionCode,
          profile: (dto.profile ?? {}) as Prisma.InputJsonValue,
          members: {
            create: {
              userId,
              role: 'owner',
              status: 1,
            },
          },
        },
      })

      await tx.auditLog.create({
        data: {
          actorType: 'user',
          actorId: userId,
          action: 'partner_applied',
          targetType: 'partner',
          targetId: created.id,
          metadata: {
            partnerNo,
            displayName: dto.displayName,
            type: dto.type,
          },
        },
      })

      return created
    })

    return this.toPartnerVO(partner)
  }

  async getMine(userId: bigint) {
    const member = await this.prisma.partnerMember.findFirst({
      where: {
        userId,
        role: 'owner',
        status: 1,
        partner: { deletedAt: null },
      },
      include: { partner: true },
      orderBy: { createdAt: 'desc' },
    })
    return member ? this.toPartnerVO(member.partner) : null
  }

  async updateMine(userId: bigint, dto: UpdatePartnerDto) {
    const member = await this.prisma.partnerMember.findFirst({
      where: {
        userId,
        role: 'owner',
        status: 1,
        partner: { deletedAt: null },
      },
      include: { partner: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!member) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到入驻主体')
    if (![PARTNER_STATUS.PENDING, PARTNER_STATUS.REJECTED].includes(member.partner.status as 0 | 2)) {
      throw new BusinessException(ErrorCode.PARAMS_INVALID, '当前状态不可修改资料')
    }

    const phoneData = dto.contactPhone ? this.buildPhoneData(dto.contactPhone) : null
    const partner = await this.prisma.partner.update({
      where: { id: member.partnerId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(phoneData && {
          contactPhoneCiphertext: phoneData.ciphertext,
          contactPhoneHash: phoneData.hash,
          contactPhoneMasked: phoneData.masked,
        }),
        ...(dto.regionCode !== undefined && { regionCode: dto.regionCode }),
        ...(dto.profile !== undefined && { profile: dto.profile as Prisma.InputJsonValue }),
        status: PARTNER_STATUS.PENDING,
        auditStatus: AUDIT_STATUS.PENDING,
        auditReason: null,
      },
    })

    await this.prisma.auditLog.create({
      data: {
        actorType: 'user',
        actorId: userId,
        action: 'partner_updated',
        targetType: 'partner',
        targetId: partner.id,
      },
    })

    return this.toPartnerVO(partner)
  }

  async listAdmin(params: {
    page: number
    pageSize: number
    status?: number
    keyword?: string
  }) {
    const where: Prisma.PartnerWhereInput = {
      deletedAt: null,
      ...(params.status !== undefined && !Number.isNaN(params.status) && { status: params.status }),
      ...(params.keyword && {
        OR: [
          { displayName: { contains: params.keyword } },
          { partnerNo: { contains: params.keyword } },
          { contactName: { contains: params.keyword } },
        ],
      }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        include: {
          members: {
            where: { role: 'owner', status: 1 },
            include: { user: { select: { id: true, nickname: true, avatar: true, phoneMasked: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.partner.count({ where }),
    ])

    return {
      list: rows.map((p) => this.toPartnerVO(p)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async getAdminDetail(id: bigint) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
      include: {
        members: {
          include: { user: { select: { id: true, nickname: true, avatar: true, phoneMasked: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!partner) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到入驻主体')
    return this.toPartnerVO(partner)
  }

  async getAdminCustomers(id: bigint, params: { page: number; pageSize: number }) {
    await this.ensurePartnerExists(id)

    const where: Prisma.CustomerRelationWhereInput = { partnerId: id }
    const [rows, total] = await Promise.all([
      this.prisma.customerRelation.findMany({
        where,
        include: {
          customerUser: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
              phoneMasked: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          events: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { boundAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.customerRelation.count({ where }),
    ])

    return {
      list: rows.map((r) => {
        const lastEvent = r.events[0]
        return {
          relationId: Number(r.id),
          customerUserId: Number(r.customerUserId),
          nickname: r.customerUser.nickname,
          avatar: r.customerUser.avatar,
          phoneMasked: r.customerUser.phoneMasked,
          userCreatedAt: r.customerUser.createdAt.toISOString(),
          lastActiveAt: r.customerUser.lastLoginAt?.toISOString() ?? null,
          boundAt: r.boundAt.toISOString(),
          sourceInvitationCode: r.sourceInvitationCode,
          relationStatus: r.status,
          lastEventType: lastEvent?.eventType ?? null,
          lastEventAt: lastEvent?.createdAt.toISOString() ?? null,
        }
      }),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  async getAdminInvitations(id: bigint, params: { page: number; pageSize: number }) {
    await this.ensurePartnerExists(id)

    const codes = await this.prisma.invitationCode.findMany({
      where: {
        ownerType: 'partner',
        ownerId: id,
      },
      orderBy: { createdAt: 'desc' },
    })
    const codeValues = codes.map((c) => c.code)
    const where: Prisma.InvitationRecordWhereInput = {
      OR: [
        { partnerId: id },
        ...(codeValues.length > 0 ? [{ code: { in: codeValues } }] : []),
      ],
    }
    const [records, total] = await Promise.all([
      this.prisma.invitationRecord.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              phoneMasked: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.invitationRecord.count({ where }),
    ])

    return {
      codes: codes.map((c) => ({
        id: Number(c.id),
        code: c.code,
        scene: c.scene,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
      records: {
        list: records.map((r) => ({
          id: Number(r.id),
          code: r.code,
          scene: r.scene,
          status: r.status,
          failureReason: r.failureReason,
          userId: r.userId ? Number(r.userId) : null,
          userNickname: r.user?.nickname ?? null,
          userPhoneMasked: r.user?.phoneMasked ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
        page: params.page,
        pageSize: params.pageSize,
      },
    }
  }

  async transferCustomerToPartner(
    partnerId: bigint,
    adminId: bigint,
    dto: { customerUserId: bigint; reason: string }
  ) {
    const relation = await this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findFirst({
        where: { id: partnerId, deletedAt: null },
      })
      if (!partner) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到入驻主体')
      if (partner.status !== PARTNER_STATUS.ACTIVE) {
        throw new BusinessException(ErrorCode.PARAMS_INVALID, '只能转移到正常状态的 B 主体')
      }

      const customer = await tx.user.findFirst({
        where: { id: dto.customerUserId, deletedAt: null },
        select: { id: true },
      })
      if (!customer) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到客户用户')

      const activeRelations = await tx.customerRelation.findMany({
        where: {
          customerUserId: dto.customerUserId,
          status: 1,
        },
        orderBy: { boundAt: 'desc' },
      })

      const currentTargetRelation = activeRelations.find((r) => r.partnerId === partnerId)
      if (currentTargetRelation) {
        await tx.relationEvent.create({
          data: {
            relationId: currentTargetRelation.id,
            partnerId,
            customerUserId: dto.customerUserId,
            eventType: 'resolved',
            sourceType: 'admin',
            operatorType: 'admin',
            operatorId: adminId,
            reason: dto.reason,
            snapshot: { action: 'already_bound' },
          },
        })
        return currentTargetRelation
      }

      for (const oldRelation of activeRelations) {
        await tx.customerRelation.update({
          where: { id: oldRelation.id },
          data: {
            status: 0,
            unboundAt: new Date(),
          },
        })
        await tx.relationEvent.create({
          data: {
            relationId: oldRelation.id,
            partnerId: oldRelation.partnerId,
            customerUserId: dto.customerUserId,
            eventType: 'transferred',
            sourceType: 'admin',
            operatorType: 'admin',
            operatorId: adminId,
            reason: dto.reason,
            snapshot: {
              fromPartnerId: Number(oldRelation.partnerId),
              toPartnerId: Number(partnerId),
            },
          },
        })
      }

      const existingTargetRelation = await tx.customerRelation.findUnique({
        where: {
          partnerId_customerUserId: {
            partnerId,
            customerUserId: dto.customerUserId,
          },
        },
      })

      const targetRelation = existingTargetRelation
        ? await tx.customerRelation.update({
            where: { id: existingTargetRelation.id },
            data: {
              status: 1,
              boundAt: new Date(),
              unboundAt: null,
              sourceInvitationCode: null,
            },
          })
        : await tx.customerRelation.create({
            data: {
              partnerId,
              customerUserId: dto.customerUserId,
              status: 1,
            },
          })

      await tx.relationEvent.create({
        data: {
          relationId: targetRelation.id,
          partnerId,
          customerUserId: dto.customerUserId,
          eventType: 'bound',
          sourceType: 'admin',
          operatorType: 'admin',
          operatorId: adminId,
          reason: dto.reason,
          snapshot: {
            fromPartnerIds: activeRelations.map((r) => Number(r.partnerId)),
            toPartnerId: Number(partnerId),
          },
        },
      })

      await tx.auditLog.create({
        data: {
          actorType: 'admin',
          actorId: adminId,
          action: 'customer_relation_transferred',
          targetType: 'customer_relation',
          targetId: targetRelation.id,
          reason: dto.reason,
          metadata: {
            partnerId: Number(partnerId),
            customerUserId: Number(dto.customerUserId),
            oldPartnerIds: activeRelations.map((r) => Number(r.partnerId)),
          },
        },
      })

      return targetRelation
    })

    return {
      relationId: Number(relation.id),
      partnerId: Number(relation.partnerId),
      customerUserId: Number(relation.customerUserId),
      sourceInvitationCode: relation.sourceInvitationCode,
      relationStatus: relation.status,
      boundAt: relation.boundAt.toISOString(),
    }
  }

  async approve(id: bigint, adminId: bigint) {
    const partner = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.partner.update({
        where: { id },
        data: {
          status: PARTNER_STATUS.ACTIVE,
          auditStatus: AUDIT_STATUS.APPROVED,
          auditReason: null,
          approvedAt: new Date(),
        },
      })

      const existingCode = await tx.invitationCode.findFirst({
        where: {
          ownerType: 'partner',
          ownerId: id,
          scene: 'register',
          status: 1,
        },
      })
      if (!existingCode) {
        await tx.invitationCode.create({
          data: {
            ownerType: 'partner',
            ownerId: id,
            scene: 'register',
            code: await this.generateInvitationCode(tx),
            status: 1,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          actorType: 'admin',
          actorId: adminId,
          action: 'partner_approved',
          targetType: 'partner',
          targetId: id,
        },
      })

      return updated
    })
    return this.toPartnerVO(partner)
  }

  async reject(id: bigint, adminId: bigint, reason: string) {
    const partner = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.partner.update({
        where: { id },
        data: {
          status: PARTNER_STATUS.REJECTED,
          auditStatus: AUDIT_STATUS.REJECTED,
          auditReason: reason,
        },
      })

      await tx.auditLog.create({
        data: {
          actorType: 'admin',
          actorId: adminId,
          action: 'partner_rejected',
          targetType: 'partner',
          targetId: id,
          reason,
        },
      })

      return updated
    })
    return this.toPartnerVO(partner)
  }

  async freeze(id: bigint, adminId: bigint, reason?: string) {
    const partner = await this.updateStatusByAdmin(id, adminId, PARTNER_STATUS.FROZEN, 'partner_frozen', reason)
    return this.toPartnerVO(partner)
  }

  async unfreeze(id: bigint, adminId: bigint) {
    const partner = await this.updateStatusByAdmin(id, adminId, PARTNER_STATUS.ACTIVE, 'partner_unfrozen')
    return this.toPartnerVO(partner)
  }

  async getInvitationCode(userId: bigint): Promise<{ inviteCode: string }> {
    const member = await this.prisma.partnerMember.findFirst({
      where: {
        userId,
        role: 'owner',
        status: 1,
        partner: { status: PARTNER_STATUS.ACTIVE, deletedAt: null },
      },
      include: { partner: true },
    })
    if (!member) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到可用入驻主体')

    const code = await this.prisma.invitationCode.findFirst({
      where: {
        ownerType: 'partner',
        ownerId: member.partnerId,
        scene: 'register',
        status: 1,
      },
    })
    if (code) return { inviteCode: code.code }

    const created = await this.prisma.invitationCode.create({
      data: {
        ownerType: 'partner',
        ownerId: member.partnerId,
        scene: 'register',
        code: await this.generateInvitationCode(this.prisma),
        status: 1,
        createdByUserId: userId,
      },
    })
    return { inviteCode: created.code }
  }

  async getCustomers(userId: bigint, params: { page: number; pageSize: number }) {
    const member = await this.prisma.partnerMember.findFirst({
      where: {
        userId,
        role: 'owner',
        status: 1,
        partner: { status: PARTNER_STATUS.ACTIVE, deletedAt: null },
      },
    })
    if (!member) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到可用入驻主体')

    const where: Prisma.CustomerRelationWhereInput = {
      partnerId: member.partnerId,
      status: 1,
    }
    const [rows, total] = await Promise.all([
      this.prisma.customerRelation.findMany({
        where,
        include: {
          customerUser: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
              phoneMasked: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: { boundAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.customerRelation.count({ where }),
    ])

    return {
      list: rows.map((r) => ({
        relationId: Number(r.id),
        customerUserId: Number(r.customerUserId),
        nickname: r.customerUser.nickname,
        avatar: r.customerUser.avatar,
        phoneMasked: r.customerUser.phoneMasked,
        userCreatedAt: r.customerUser.createdAt.toISOString(),
        lastActiveAt: r.customerUser.lastLoginAt?.toISOString() ?? null,
        boundAt: r.boundAt.toISOString(),
        sourceInvitationCode: r.sourceInvitationCode,
        relationStatus: r.status,
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    }
  }

  private async updateStatusByAdmin(
    id: bigint,
    adminId: bigint,
    status: number,
    action: string,
    reason?: string
  ): Promise<Partner> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.partner.update({
        where: { id },
        data: { status },
      })

      await tx.auditLog.create({
        data: {
          actorType: 'admin',
          actorId: adminId,
          action,
          targetType: 'partner',
          targetId: id,
          reason,
        },
      })

      return updated
    })
  }

  private async ensurePartnerExists(id: bigint): Promise<void> {
    const count = await this.prisma.partner.count({ where: { id, deletedAt: null } })
    if (count === 0) throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '未找到入驻主体')
  }

  private toPartnerVO(partner: Partner & { members?: Array<{ user?: { id: bigint; nickname: string; avatar: string; phoneMasked: string } }> }) {
    const owner = partner.members?.[0]?.user
    return {
      id: Number(partner.id),
      partnerNo: partner.partnerNo,
      displayName: partner.displayName,
      type: partner.type,
      level: partner.level,
      status: partner.status,
      auditStatus: partner.auditStatus,
      auditReason: partner.auditReason,
      contactName: partner.contactName,
      contactPhoneMasked: partner.contactPhoneMasked,
      regionCode: partner.regionCode,
      profile: partner.profile,
      approvedAt: partner.approvedAt?.toISOString() ?? null,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
      owner: owner
        ? {
            id: Number(owner.id),
            nickname: owner.nickname,
            avatar: owner.avatar,
            phoneMasked: owner.phoneMasked,
          }
        : null,
    }
  }

  private async generatePartnerNo(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const no = `P${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`
      const existing = await this.prisma.partner.findUnique({ where: { partnerNo: no } })
      if (!existing) return no
    }
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, '生成主体编号失败')
  }

  private async generateInvitationCode(
    client: Pick<PrismaService, 'invitationCode'> | Prisma.TransactionClient
  ): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase()
      const existing = await client.invitationCode.findUnique({ where: { code } })
      if (!existing) return code
    }
    throw new BusinessException(ErrorCode.INTERNAL_ERROR, '生成邀请码失败')
  }

  private buildPhoneData(phone: string): { ciphertext: Buffer; hash: string; masked: string } {
    return {
      ciphertext: Buffer.from(phone),
      hash: this.hmac(phone),
      masked: this.maskPhone(phone),
    }
  }

  private hmac(input: string): string {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET')!
    return createHmac('sha256', secret).update(input).digest('hex')
  }

  private maskPhone(phone: string): string {
    if (phone.length < 7) return phone
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  }
}
