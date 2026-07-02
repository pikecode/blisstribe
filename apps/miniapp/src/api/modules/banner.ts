import { request } from '../request'

export interface Banner {
  id: number
  title: string
  description: string
  imageUrl: string
  gradient: string
  linkUrl: string
}

export const bannerApi = {
  list(): Promise<Banner[]> {
    return request<Banner[]>({ url: '/banners', method: 'GET' })
  },
}
