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

export type PartnerType =
  | 'individual'
  | 'group_leader'
  | 'creator'
  | 'store'
  | 'service_provider'
  | 'agency'

export type PartnerMemberRole = 'owner' | 'operator' | 'finance' | 'customer_service'

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
