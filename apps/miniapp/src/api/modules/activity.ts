import { request } from '@/api/request'
import { storage } from '@/utils/storage'
import type { Product, ProductModule } from './product'

export type ActivityType = 'online' | 'offline' | 'mixed'
export type ActivityRegistrationStatus = 'registered' | 'confirmed' | 'attended' | 'cancelled' | 'invalid'

export interface Activity {
  id: number
  moduleId: number
  module: Pick<ProductModule, 'id' | 'code' | 'name' | 'icon' | 'coverUrl'>
  title: string
  subtitle: string
  coverUrl: string
  activityType: ActivityType
  startAt: string
  endAt: string
  registrationStartAt: string | null
  registrationEndAt: string
  locationText: string
  capacity: number | null
  registeredCount: number
  remainingCount: number | null
  registrationStatus: string
  myRegistration: ActivityRegistrationBase | null
  targetUserText: string
  highlights: string[]
  detail: string
  tags: string[]
  tagIds: number[]
  relatedProductIds: number[]
  relatedProducts?: Product[]
  priority: number
  sortOrder: number
  status: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ActivityRegistrationBase {
  id: number
  activityId: number
  userId: number
  partnerId: number | null
  sourceInviteCode: string | null
  sourceScene: string
  name: string
  phoneMasked: string
  message: string
  status: ActivityRegistrationStatus
  followUpNote: string
  cancelReason: string
  createdAt: string
  updatedAt: string
}

export interface ActivityRegistration extends ActivityRegistrationBase {
  activity: Activity
  user: { id: number; nickname: string; avatar: string; phoneMasked: string }
  partner: { id: number; displayName: string; partnerNo: string } | null
}

export interface ActivityListResult {
  list: Activity[]
  total: number
  page: number
  pageSize: number
}

const LOCAL_REGISTERED_ACTIVITY_IDS_KEY = 'registeredActivityIds'
const ACTIVE_ACTIVITY_REGISTRATION_STATUSES = ['registered', 'confirmed', 'attended']

function withQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

export function activityTypeText(value?: string) {
  if (value === 'offline') return '线下活动'
  if (value === 'mixed') return '线上+线下'
  return '线上活动'
}

export function activityRegistrationStatusText(value?: string) {
  const map: Record<string, string> = {
    registered: '已报名',
    confirmed: '已确认',
    attended: '已到场',
    cancelled: '已取消',
    invalid: '无效',
  }
  return value ? map[value] || value : '-'
}

export function activityRegistrationStateText(value?: string) {
  const map: Record<string, string> = {
    registering: '报名中',
    not_started: '未开始',
    full: '已满员',
    closed: '已截止',
    ended: '已结束',
  }
  return value ? map[value] || value : '-'
}

export function isActiveActivityRegistrationStatus(value?: string) {
  return !!value && ACTIVE_ACTIVITY_REGISTRATION_STATUSES.includes(value)
}

export function markLocalActivityRegistered(activityId: number) {
  const ids = storage.get<number[]>(LOCAL_REGISTERED_ACTIVITY_IDS_KEY) || []
  storage.set(LOCAL_REGISTERED_ACTIVITY_IDS_KEY, [...new Set([...ids, activityId])], { expireSeconds: 30 * 24 * 3600 })
}

export function removeLocalActivityRegistered(activityId: number) {
  const ids = storage.get<number[]>(LOCAL_REGISTERED_ACTIVITY_IDS_KEY) || []
  storage.set(LOCAL_REGISTERED_ACTIVITY_IDS_KEY, ids.filter((id) => id !== activityId), { expireSeconds: 30 * 24 * 3600 })
}

export function isLocalActivityRegistered(activityId?: number) {
  if (!activityId) return false
  return (storage.get<number[]>(LOCAL_REGISTERED_ACTIVITY_IDS_KEY) || []).includes(activityId)
}

export function activityDisplayRegistrationText(activity?: Pick<Activity, 'id' | 'registrationStatus' | 'myRegistration'> | null) {
  const myStatus = activity?.myRegistration?.status
  if (isActiveActivityRegistrationStatus(myStatus)) {
    return activityRegistrationStatusText(myStatus)
  }
  if (myStatus) return activityRegistrationStatusText(myStatus)
  if (isLocalActivityRegistered(activity?.id)) return '已报名'
  return activityRegistrationStateText(activity?.registrationStatus)
}

export const activityApi = {
  recommended(params?: { moduleCode?: string; limit?: number }): Promise<Activity[]> {
    return request<Activity[]>({
      url: withQuery('/activities/recommended', {
        moduleCode: params?.moduleCode,
        limit: params?.limit,
      }),
      method: 'GET',
    })
  },
  list(params?: {
    moduleCode?: string
    activityType?: ActivityType
    statusScope?: 'registering' | 'upcoming' | 'ended'
    page?: number
    pageSize?: number
  }): Promise<ActivityListResult> {
    return request<ActivityListResult>({
      url: withQuery('/activities', {
        moduleCode: params?.moduleCode,
        activityType: params?.activityType,
        statusScope: params?.statusScope,
        page: params?.page,
        pageSize: params?.pageSize,
      }),
      method: 'GET',
    })
  },
  detail(id: number): Promise<Activity> {
    return request<Activity>({
      url: `/activities/${id}`,
      method: 'GET',
    })
  },
  myRegistrations(params?: { page?: number; pageSize?: number }): Promise<ActivityListResult & { list: ActivityRegistration[] }> {
    return request<ActivityListResult & { list: ActivityRegistration[] }>({
      url: withQuery('/activities/my-registrations', {
        page: params?.page,
        pageSize: params?.pageSize,
      }),
      method: 'GET',
    })
  },
  register(id: number, data: { name?: string; message?: string; inviteCode?: string; sourceScene?: string }): Promise<ActivityRegistration> {
    return request<ActivityRegistration>({
      url: `/activities/${id}/registrations`,
      method: 'POST',
      data,
    }).then((registration) => {
      if (isActiveActivityRegistrationStatus(registration.status)) markLocalActivityRegistered(id)
      return registration
    })
  },
  cancelRegistration(id: number, data?: { cancelReason?: string }): Promise<ActivityRegistration> {
    return request<ActivityRegistration>({
      url: `/activities/${id}/registrations/cancel`,
      method: 'POST',
      data,
    }).then((registration) => {
      removeLocalActivityRegistered(id)
      return registration
    })
  },
}
