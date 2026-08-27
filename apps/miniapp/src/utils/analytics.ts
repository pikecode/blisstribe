import { productApi, type Product, type RecommendationEventPayload, type RecommendationForm } from '@/api/modules/product'
import { storage } from '@/utils/storage'

const ANONYMOUS_ID_KEY = 'analytics_anonymous_id'

function randomPart() {
  return Math.random().toString(36).slice(2, 10)
}

export function getAnonymousId() {
  const existing = storage.get<string>(ANONYMOUS_ID_KEY)
  if (existing) return existing
  const id = `anon_${Date.now().toString(36)}_${randomPart()}`
  storage.set(ANONYMOUS_ID_KEY, id)
  return id
}

export function reportProductEvent(payload: RecommendationEventPayload) {
  const data: RecommendationEventPayload = {
    ...payload,
    anonymousId: payload.anonymousId || getAnonymousId(),
  }
  return productApi.reportEvent(data).catch(() => null)
}

export function reportProductImpressions(products: Product[], options: {
  recommendationForm: RecommendationForm
  sourceScene: string
  moduleCode?: string
  limit?: number
}) {
  products.slice(0, options.limit ?? 20).forEach((product, index) => {
    reportProductEvent({
      eventType: 'impression',
      productId: product.id,
      moduleId: product.module?.id,
      moduleCode: options.moduleCode || product.module?.code,
      productType: product.productType,
      recommendationForm: options.recommendationForm,
      sourceScene: options.sourceScene,
      tags: product.matchedTags?.length ? product.matchedTags : product.tags,
      tagIds: product.matchedTagIds || product.tagIds || [],
      score: product.score,
      reason: product.recommendReason,
      metadata: { position: index + 1 },
    })
  })
}
