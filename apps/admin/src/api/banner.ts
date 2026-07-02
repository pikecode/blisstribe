import request from '@/utils/request'

export interface Banner {
  id: number
  title: string
  description: string
  imageUrl: string
  gradient: string
  linkUrl: string
  sort: number
  status: number
  createdAt: string
}

export interface BannerListResult {
  list: Banner[]
  total: number
  page: number
  pageSize: number
}

export const bannerApi = {
  list(page = 1, pageSize = 20): Promise<BannerListResult> {
    return request.get('/banners/admin', { params: { page, pageSize } })
  },
  create(data: Omit<Banner, 'id' | 'status' | 'createdAt'>): Promise<Banner> {
    return request.post('/banners/admin', data)
  },
  update(id: number, data: Partial<Omit<Banner, 'id' | 'createdAt'>>): Promise<Banner> {
    return request.put(`/banners/admin/${id}`, data)
  },
  remove(id: number): Promise<void> {
    return request.delete(`/banners/admin/${id}`)
  },
}
