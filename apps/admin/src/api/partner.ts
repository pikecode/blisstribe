import request from '@/utils/request'
import type {
  Partner,
  PartnerCustomerListResult,
  PartnerInvitationOverview,
  TransferPartnerCustomerParams,
  TransferPartnerCustomerResult,
} from '@blisstribe/shared'

export interface PartnerListResult {
  list: Partner[]
  total: number
  page: number
  pageSize: number
}

export const partnerApi = {
  list(params: { page?: number; pageSize?: number; status?: number; keyword?: string }) {
    return request.get<PartnerListResult>('/admin/partners', { params })
  },
  get(id: number | string) {
    return request.get<Partner>(`/admin/partners/${id}`)
  },
  customers(id: number | string, params: { page?: number; pageSize?: number }) {
    return request.get<PartnerCustomerListResult>(`/admin/partners/${id}/customers`, { params })
  },
  invitations(id: number | string, params: { page?: number; pageSize?: number }) {
    return request.get<PartnerInvitationOverview>(`/admin/partners/${id}/invitations`, { params })
  },
  transferCustomer(id: number | string, data: TransferPartnerCustomerParams) {
    return request.post<TransferPartnerCustomerResult>(`/admin/partners/${id}/customers/transfer`, data)
  },
  approve(id: number | string) {
    return request.post<Partner>(`/admin/partners/${id}/approve`)
  },
  reject(id: number | string, reason: string) {
    return request.post<Partner>(`/admin/partners/${id}/reject`, { reason })
  },
  freeze(id: number | string, reason?: string) {
    return request.post<Partner>(`/admin/partners/${id}/freeze`, { reason })
  },
  unfreeze(id: number | string) {
    return request.post<Partner>(`/admin/partners/${id}/unfreeze`)
  },
}
