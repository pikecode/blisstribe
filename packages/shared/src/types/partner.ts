export const PartnerStatus = {
  PENDING: 0,
  ACTIVE: 1,
  REJECTED: 2,
  FROZEN: 3,
  DISABLED: 4,
} as const

export type PartnerStatusValue = (typeof PartnerStatus)[keyof typeof PartnerStatus]

export const PartnerAuditStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const

export type PartnerAuditStatusValue = (typeof PartnerAuditStatus)[keyof typeof PartnerAuditStatus]

export const PartnerMemberRole = {
  OWNER: 'owner',
  OPERATOR: 'operator',
  FINANCE: 'finance',
  CUSTOMER_SERVICE: 'customer_service',
} as const

export type PartnerMemberRoleValue = (typeof PartnerMemberRole)[keyof typeof PartnerMemberRole]

export const PartnerMemberStatus = {
  DISABLED: 0,
  ACTIVE: 1,
} as const

export type PartnerMemberStatusValue = (typeof PartnerMemberStatus)[keyof typeof PartnerMemberStatus]

export const AuditLogActionType = {
  // Partner actions
  PARTNER_CREATED: 'partner_created',
  PARTNER_UPDATED: 'partner_updated',
  PARTNER_APPROVED: 'partner_approved',
  PARTNER_REJECTED: 'partner_rejected',
  PARTNER_FROZEN: 'partner_frozen',
  PARTNER_DISABLED: 'partner_disabled',

  // Member actions
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  MEMBER_STATUS_CHANGED: 'member_status_changed',

  // Customer actions
  CUSTOMER_BOUND: 'customer_bound',
  CUSTOMER_TRANSFERRED: 'customer_transferred',

  // Invitation actions
  INVITATION_CODE_CREATED: 'invitation_code_created',
  INVITATION_CODE_EXPIRED: 'invitation_code_expired',
  INVITATION_RECORD_CREATED: 'invitation_record_created',
} as const

export type AuditLogActionTypeValue = (typeof AuditLogActionType)[keyof typeof AuditLogActionType]

export const AuditLogActorType = {
  ADMIN: 'admin',
  USER: 'user',
  SYSTEM: 'system',
} as const

export type AuditLogActorTypeValue = (typeof AuditLogActorType)[keyof typeof AuditLogActorType]

export type PartnerType =
  | 'individual'
  | 'group_leader'
  | 'creator'
  | 'store'
  | 'service_provider'
  | 'agency'

export interface PartnerOwner {
  id: number
  nickname: string
  avatar: string
  phoneMasked: string
}

export interface Partner {
  id: number
  partnerNo: string
  displayName: string
  type: PartnerType
  level: string
  status: PartnerStatusValue
  auditStatus: PartnerAuditStatusValue
  auditReason?: string | null
  contactName?: string | null
  contactPhoneMasked?: string | null
  regionCode?: string | null
  profile: Record<string, unknown>
  approvedAt?: string | null
  createdAt: string
  updatedAt: string
  owner?: PartnerOwner | null
}

export interface ApplyPartnerParams {
  displayName: string
  type: PartnerType
  contactName: string
  contactPhone: string
  regionCode?: string
  profile?: Record<string, unknown>
}

export interface UpdatePartnerParams {
  displayName?: string
  type?: PartnerType
  contactName?: string
  contactPhone?: string
  regionCode?: string
  profile?: Record<string, unknown>
}

export interface PartnerInvitationResolveResult {
  valid: boolean
  code: string
  scene?: string
  partner?: {
    id: number
    partnerNo: string
    displayName: string
    type: string
  }
  reason?: string
}

export interface PartnerCustomer {
  relationId: number
  customerUserId: number
  nickname: string
  avatar: string
  phoneMasked: string
  userCreatedAt: string
  lastActiveAt?: string | null
  boundAt: string
  sourceInvitationCode?: string | null
  relationStatus: number
  lastEventType?: string | null
  lastEventAt?: string | null
}

export interface PartnerCustomerListResult {
  list: PartnerCustomer[]
  total: number
  page: number
  pageSize: number
}

export interface PartnerInvitationCode {
  id: number
  code: string
  scene: string
  maxUses?: number | null
  usedCount: number
  expiresAt?: string | null
  status: number
  createdAt: string
}

export interface PartnerInvitationRecord {
  id: number
  code: string
  scene: string
  status: number
  failureReason?: string | null
  userId?: number | null
  userNickname?: string | null
  userPhoneMasked?: string | null
  createdAt: string
}

export interface PartnerInvitationRecordListResult {
  list: PartnerInvitationRecord[]
  total: number
  page: number
  pageSize: number
}

export interface PartnerInvitationOverview {
  codes: PartnerInvitationCode[]
  records: PartnerInvitationRecordListResult
}

export interface TransferPartnerCustomerParams {
  customerUserId: number
  reason: string
}

export interface TransferPartnerCustomerResult {
  relationId: number
  partnerId: number
  customerUserId: number
  sourceInvitationCode?: string | null
  relationStatus: number
  boundAt: string
}

// Value Objects for API responses
export interface IPartnerVO {
  id: number
  partnerNo: string
  displayName: string
  type: PartnerType
  level: string
  status: PartnerStatusValue
  auditStatus: PartnerAuditStatusValue
  auditReason?: string | null
  contactName?: string | null
  contactPhoneMasked?: string | null
  regionCode?: string | null
  profile: Record<string, unknown>
  approvedAt?: string | null
  createdAt: string
  updatedAt: string
  owner?: PartnerOwner | null
}

export interface IPartnerMemberVO {
  id: number
  partnerId: number
  userId: number
  role: PartnerMemberRoleValue
  status: PartnerMemberStatusValue
  joinedAt: string
  createdAt: string
  updatedAt: string
}

export interface IAuditLogVO {
  id: number
  actorType: AuditLogActorTypeValue
  actorId?: number | null
  action: AuditLogActionTypeValue
  targetType: string
  targetId?: number | null
  reason?: string | null
  metadata: Record<string, unknown>
  ipAddress?: string | null
  createdAt: string
}

// Type exports from Prisma for frontend usage
export type {
  Partner as PrismaPartner,
  PartnerMember as PrismaPartnerMember,
  AuditLog as PrismaAuditLog,
} from '@prisma/client'

