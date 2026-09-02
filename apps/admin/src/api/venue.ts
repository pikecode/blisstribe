import request from '@/utils/request'
import type { ListResult } from '@/api/product'

export interface VenueImage {
  id?: number
  imageUrl: string
  sortOrder: number
}

export interface VenueAvailability {
  id?: number
  weekday: number
  startTime: string
  endTime: string
  status: number
}

export interface VenueBlockedSlot {
  id?: number
  startAt: string
  endAt: string
  reason: string
}

export interface Venue {
  id: number
  name: string
  subtitle: string
  coverUrl: string
  address: string
  city: string
  district: string
  latitude: number | null
  longitude: number | null
  capacity: number | null
  facilityIds: number[]
  facilities: string[]
  description: string
  contactName: string
  contactPhoneMasked: string
  status: number
  sortOrder: number
  images: VenueImage[]
  availability: VenueAvailability[]
  blockedSlots: VenueBlockedSlot[]
  createdAt: string
  updatedAt: string
}

export type VenuePayload = Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>

export interface VenueFacility {
  id: number
  name: string
  description: string
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type VenueFacilityPayload = Omit<VenueFacility, 'id' | 'createdAt' | 'updatedAt'>

export interface VenueScheduleDay {
  date: string
  weekday: number
  availability: Array<{ id: number; startTime: string; endTime: string; status: number }>
  blockedSlots: Array<{ id: number; startAt: string; endAt: string; reason: string }>
  activities: Array<{ id: number; title: string; activityType: string; status: number; startAt: string; endAt: string }>
  state: 'free' | 'busy' | 'closed'
}

export interface VenueSchedule {
  venue: Venue
  days: VenueScheduleDay[]
}

export interface VenueAvailabilityCheck {
  available: boolean
  message: string
}

export function weekdayText(value: number) {
  return ['一', '二', '三', '四', '五', '六', '日'][value - 1] ? `周${['一', '二', '三', '四', '五', '六', '日'][value - 1]}` : '-'
}

export const venueApi = {
  list(params?: { page?: number; pageSize?: number; keyword?: string; city?: string; status?: number | '' }): Promise<ListResult<Venue>> {
    return request.get('/admin/venues', { params })
  },
  publicList(params?: { city?: string; keyword?: string }): Promise<Venue[]> {
    return request.get('/venues', { params })
  },
  create(data: VenuePayload): Promise<Venue> {
    return request.post('/admin/venues', data)
  },
  update(id: number, data: Partial<VenuePayload>): Promise<Venue> {
    return request.put(`/admin/venues/${id}`, data)
  },
  schedule(id: number, params?: { startDate?: string; days?: number }): Promise<VenueSchedule> {
    return request.get(`/admin/venues/${id}/schedule`, { params })
  },
  availabilityCheck(
    id: number,
    params: { startAt?: string; endAt?: string; activityId?: number; capacity?: number }
  ): Promise<VenueAvailabilityCheck> {
    return request.get(`/admin/venues/${id}/availability-check`, { params })
  },
  listFacilities(params?: { status?: number | ''; keyword?: string }): Promise<VenueFacility[]> {
    return request.get('/admin/venue-facilities', { params })
  },
  createFacility(data: VenueFacilityPayload): Promise<VenueFacility> {
    return request.post('/admin/venue-facilities', data)
  },
  updateFacility(id: number, data: Partial<VenueFacilityPayload>): Promise<VenueFacility> {
    return request.put(`/admin/venue-facilities/${id}`, data)
  },
}
