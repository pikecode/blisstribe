import { request } from '@/api/request'
import type {
  ApplyPartnerParams,
  Partner,
  PartnerCustomerListResult,
  UpdatePartnerParams,
} from '@blisstribe/shared'

export const partnerApi = {
  apply(params: ApplyPartnerParams): Promise<Partner> {
    return request<Partner>({ url: '/partner/apply', method: 'POST', data: params })
  },

  getMine(): Promise<Partner | null> {
    return request<Partner | null>({ url: '/partner/me', method: 'GET' })
  },

  updateMine(params: UpdatePartnerParams): Promise<Partner> {
    return request<Partner>({ url: '/partner/me', method: 'PUT', data: params })
  },

  getInvitationCode(): Promise<{ inviteCode: string }> {
    return request<{ inviteCode: string }>({ url: '/partner/invitation-code', method: 'GET' })
  },

  getCustomers(params?: { page?: number; pageSize?: number }): Promise<PartnerCustomerListResult> {
    return request<PartnerCustomerListResult>({
      url: '/partner/customers',
      method: 'GET',
      data: params,
    })
  },
}
