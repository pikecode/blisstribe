import { request } from '@/api/request'
import type { PartnerInvitationResolveResult } from '@blisstribe/shared'

export interface MyInvitationResult {
  inviteCode: string
  totalInvited: number
  invitees: Array<{
    id: number
    nickname: string
    avatar: string
    createdAt: string
  }>
}

export const invitationApi = {
  resolve(code: string): Promise<PartnerInvitationResolveResult> {
    return request({ url: '/invitation/resolve', method: 'POST', data: { code } })
  },

  getMyCode(): Promise<{ inviteCode: string }> {
    return request({ url: '/invitation/my-code', method: 'GET' })
  },

  useCode(code: string): Promise<{ success: boolean }> {
    return request({ url: '/invitation/use-code', method: 'POST', data: { code } })
  },

  getMyInvitations(): Promise<MyInvitationResult> {
    return request({ url: '/invitation/my-invitations', method: 'GET' })
  },
}
