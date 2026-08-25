import { storage } from '@/utils/storage'

export interface HealthAssessment {
  moduleCode?: string
  assessmentType?: string
  tags: string[]
  tagIds?: number[]
  tagWeights?: Record<string, number>
  summary: string
  answers: Record<string, string>
  createdAt: string
}

const STORAGE_KEY = 'healthAssessment'
const STORAGE_PREFIX = 'moduleAssessment:'

export function useHealthAssessment() {
  function storageKey(moduleCode = 'health') {
    return `${STORAGE_PREFIX}${moduleCode}`
  }

  function getAssessment(moduleCode = 'health'): HealthAssessment | null {
    const assessment = storage.get<HealthAssessment>(storageKey(moduleCode))
    if (assessment) return assessment
    return moduleCode === 'health' ? storage.get<HealthAssessment>(STORAGE_KEY) : null
  }

  function saveAssessment(assessment: HealthAssessment, moduleCode = assessment.moduleCode || 'health'): void {
    storage.set(storageKey(moduleCode), { ...assessment, moduleCode }, { expireSeconds: 30 * 24 * 3600 })
    if (moduleCode === 'health') storage.set(STORAGE_KEY, { ...assessment, moduleCode }, { expireSeconds: 30 * 24 * 3600 })
  }

  function clearAssessment(moduleCode = 'health'): void {
    storage.remove(storageKey(moduleCode))
    if (moduleCode === 'health') storage.remove(STORAGE_KEY)
  }

  function listAssessments(moduleCodes: string[] = []): HealthAssessment[] {
    return moduleCodes
      .map((moduleCode) => getAssessment(moduleCode))
      .filter((item): item is HealthAssessment => !!item)
  }

  return { getAssessment, saveAssessment, clearAssessment, listAssessments }
}
