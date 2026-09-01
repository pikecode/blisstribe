import { request } from '@/api/request'

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
  images: Array<{ id: number; imageUrl: string; sortOrder: number }>
  availability: Array<{ id: number; weekday: number; startTime: string; endTime: string; status: number }>
  blockedSlots: Array<{ id: number; startAt: string; endAt: string; reason: string }>
  createdAt: string
  updatedAt: string
}

function withQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

export const venueApi = {
  list(params?: { city?: string; keyword?: string }): Promise<Venue[]> {
    return request<Venue[]>({
      url: withQuery('/venues', {
        city: params?.city,
        keyword: params?.keyword,
      }),
      method: 'GET',
    })
  },
}
