import { request } from '@/api/request'

export interface CurrentAgreement {
  id: number
  type: 'user' | 'privacy'
  version: string
  title: string
  content: string
  effectiveAt: string
}

export const agreementApi = {
  current(type: 'user' | 'privacy'): Promise<CurrentAgreement> {
    return request<CurrentAgreement>({ url: `/agreements/current/${type}`, method: 'GET' })
  },
}
