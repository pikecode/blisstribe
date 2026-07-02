import request from '@/utils/request'

export const invitationApi = {
  getStats(): Promise<{
    totalInviters: number
    totalInvitees: number
    topInviters: Array<{ id: number; nickname: string; inviteCount: number }>
  }> {
    return request.get('/admin/invitation/stats')
  },

  getRecords(params: {
    page: number
    pageSize: number
    keyword?: string
  }): Promise<{
    list: Array<{
      id: number
      inviterNickname: string
      inviteeNickname: string
      inviteCode: string
      status: number
      createdAt: string
    }>
    total: number
  }> {
    return request.get('/admin/invitation/records', { params })
  },
}
