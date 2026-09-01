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
}
