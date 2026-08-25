import { productApi } from '@/api/modules/product'
import { useAuthStore } from '@/stores/modules/auth'
import { useHealthAssessment } from '@/composables/useHealthAssessment'

let syncing = false
let lastSyncAt = 0

export function useAssessmentSync() {
  const authStore = useAuthStore()
  const { listAssessments } = useHealthAssessment()

  async function syncLocalAssessments(force = false): Promise<void> {
    if (!authStore.isLogin || syncing) return
    if (!force && Date.now() - lastSyncAt < 10 * 1000) return

    syncing = true
    try {
      const modules = await productApi.modules()
      const assessments = listAssessments(modules.map((item) => item.code))
      if (!assessments.length) return
      await productApi.syncAssessments(assessments.map((item) => ({
        moduleCode: item.moduleCode || 'health',
        assessmentType: item.assessmentType || item.moduleCode || 'health',
        tags: item.tags,
        tagIds: item.tagIds,
        tagWeights: item.tagWeights,
        summary: item.summary,
        answers: item.answers,
      })))
      lastSyncAt = Date.now()
    } catch {
      // 同步失败不阻断首页、登录和推荐流程。
    } finally {
      syncing = false
    }
  }

  return { syncLocalAssessments }
}
