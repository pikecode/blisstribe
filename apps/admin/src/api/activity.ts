import request from '@/utils/request'
import type { ListResult, Product, ProductModule } from '@/api/product'

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

export interface ActivityPayload {
  moduleId: number
  title: string
  subtitle?: string
  coverUrl?: string
  activityType?: ActivityType
  startAt: string
  endAt: string
  registrationStartAt?: string
  registrationEndAt: string
  locationText?: string
  capacity?: number
  targetUserText?: string
  highlights?: string[]
  detail?: string
  tags?: string[]
  tagIds?: number[]
  relatedProductIds?: number[]
  priority?: number
  sortOrder?: number
  status?: number
}

export interface ActivityRegistration {
  id: number
  activityId: number
  userId: number
  partnerId: number | null
  activity: Activity
  user: { id: number; nickname: string; avatar: string; phoneMasked: string }
  partner: { id: number; displayName: string; partnerNo: string } | null
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

export function activityTypeText(value?: string) {
  if (value === 'offline') return '线下活动'
  if (value === 'mixed') return '线上+线下'
  return '线上活动'
}

export function activityStatusText(value?: number) {
  if (value === 1) return '已发布'
  if (value === 2) return '已下线'
  return '草稿'
}

export function registrationStatusText(value?: string) {
  const map: Record<string, string> = {
    registered: '已报名',
    confirmed: '已确认',
    attended: '已到场',
    cancelled: '已取消',
    invalid: '无效',
  }
  return value ? map[value] ?? value : '-'
}

export const activityApi = {
  listActivities(params: {
    page?: number
    pageSize?: number
    keyword?: string
    moduleId?: number | ''
    activityType?: ActivityType | ''
    status?: number | ''
  }): Promise<ListResult<Activity>> {
    return request.get('/admin/activities', { params })
  },
  createActivity(data: ActivityPayload): Promise<Activity> {
    return request.post('/admin/activities', data)
  },
  updateActivity(id: number, data: Partial<ActivityPayload>): Promise<Activity> {
    return request.put(`/admin/activities/${id}`, data)
  },
  publishActivity(id: number): Promise<Activity> {
    return request.post(`/admin/activities/${id}/publish`)
  },
  unpublishActivity(id: number): Promise<Activity> {
    return request.post(`/admin/activities/${id}/unpublish`)
  },
  listRegistrations(params: {
    page?: number
    pageSize?: number
    activityId?: number | ''
    status?: ActivityRegistrationStatus | ''
    keyword?: string
  }): Promise<ListResult<ActivityRegistration>> {
    return request.get('/admin/activity-registrations', { params })
  },
  detailRegistration(id: number): Promise<ActivityRegistration> {
    return request.get(`/admin/activity-registrations/${id}`)
  },
  updateRegistrationStatus(
    id: number,
    data: { status: ActivityRegistrationStatus; followUpNote?: string }
  ): Promise<ActivityRegistration> {
    return request.put(`/admin/activity-registrations/${id}/status`, data)
  },
}
