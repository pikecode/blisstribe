import { request } from '@/api/request'

export interface ProductModule {
  id: number
  code: string
  name: string
  description: string
  icon: string
  coverUrl: string
  showOnHome: boolean
  assessmentEnabled: boolean
  assessmentType: string
  sortOrder: number
  status: number
}

export interface TagDictionary {
  id: number
  code: string
  name: string
  group: string
  moduleId: number | null
  module: ProductModule | null
  description: string
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  module: ProductModule
  productType: ProductType
  title: string
  subtitle: string
  coverUrl: string
  priceText: string
  summary: string
  detail?: string
  targetUserText: string
  painPointText: string
  serviceProcess: string
  serviceMode: ProductServiceMode | ''
  serviceDuration: string
  appointmentRequired: boolean
  specText: string
  deliveryText: string
  afterSaleText: string
  stockStatus: ProductStockStatus
  tags: string[]
  tagIds?: number[]
  matchedTagIds?: number[]
  matchedTags: string[]
  recommendReason: string
  score: number
  publishedAt: string | null
}

export type ProductType = 'service' | 'physical' | 'package'
export type ProductServiceMode = 'online' | 'offline' | 'mixed'
export type ProductStockStatus = 'available' | 'limited' | 'sold_out'
export type RecommendationEventType = 'impression' | 'click' | 'lead_submit' | 'assessment_submit' | 'filter_click'
export type RecommendationForm =
  | 'module_featured'
  | 'assessment_result'
  | 'profile_suggestion'
  | 'consultant_recommendation'
  | 'campaign_recommendation'
  | 'bundle_solution'

export interface RecommendationEventPayload {
  eventType: RecommendationEventType
  anonymousId?: string
  moduleId?: number
  moduleCode?: string
  productId?: number
  productType?: ProductType
  recommendationForm?: RecommendationForm
  sourceScene?: string
  tags?: string[]
  tagIds?: number[]
  score?: number
  reason?: string
  metadata?: Record<string, unknown>
}

export function productTypeText(type?: string) {
  if (type === 'physical') return '实物产品'
  if (type === 'package') return '组合方案'
  return '服务产品'
}

export function serviceModeText(mode?: string) {
  if (mode === 'online') return '线上服务'
  if (mode === 'offline') return '到店服务'
  if (mode === 'mixed') return '线上 + 到店'
  return ''
}

export function stockStatusText(status?: string) {
  if (status === 'limited') return '库存紧张'
  if (status === 'sold_out') return '暂不可售'
  return '正常供应'
}

export function productLeadActionText(type?: string) {
  if (type === 'physical') return '咨询购买'
  if (type === 'package') return '咨询方案'
  return '我想了解'
}

export interface ProductListResult {
  list: Product[]
  total: number
  page: number
  pageSize: number
}

export interface ProductLead {
  id: number
  productId: number
  product: { id: number; title: string; coverUrl: string; priceText: string }
  partnerId: number | null
  partner: { id: number; displayName: string; partnerNo: string } | null
  needTags: string[]
  needTagIds?: number[]
  message: string
  status: string
  followUpNote: string
  nextFollowAt: string | null
  followUps: ProductLeadFollowUp[]
  createdAt: string
  updatedAt: string
}

export interface ProductLeadFollowUp {
  id: number
  leadId: number
  operatorId: number | null
  operatorType: string
  fromStatus: string
  toStatus: string
  note: string
  nextFollowAt: string | null
  createdAt: string
}

export interface UserAssessment {
  id: number
  userId: number
  moduleCode: string
  assessmentType: string
  tags: string[]
  tagIds?: number[]
  tagWeights?: Record<string, number>
  summary: string
  answers: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AssessmentOption {
  id: number
  label: string
  value: string
  tags: string[]
  tagIds?: number[]
  tagWeights?: Record<string, number>
  sortOrder: number
}

export interface AssessmentQuestion {
  id: number
  key: string
  title: string
  type: 'single'
  sortOrder: number
  options: AssessmentOption[]
}

export interface AssessmentTemplate {
  id: number
  moduleId: number
  title: string
  subtitle: string
  version: number
  status: number
  sortOrder: number
  questions: AssessmentQuestion[]
  createdAt: string
  updatedAt: string
}

function withQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${url}?${query}` : url
}

export const productApi = {
  modules(): Promise<ProductModule[]> {
    return request<ProductModule[]>({
      url: '/product-modules',
      method: 'GET',
    })
  },
  assessmentTemplate(moduleCode: string): Promise<AssessmentTemplate | null> {
    return request<AssessmentTemplate | null>({
      url: `/product-modules/${encodeURIComponent(moduleCode)}/assessment-template`,
      method: 'GET',
    })
  },
  recommended(params?: { moduleCode?: string; productType?: ProductType; tags?: string[]; tagIds?: number[]; limit?: number }): Promise<Product[]> {
    return request<Product[]>({
      url: withQuery('/products/recommended', {
        moduleCode: params?.moduleCode,
        productType: params?.productType,
        tags: params?.tags?.join(','),
        tagIds: params?.tagIds?.join(','),
        limit: params?.limit,
      }),
      method: 'GET',
    })
  },
  list(params?: { moduleCode?: string; productType?: ProductType; tags?: string[]; page?: number; pageSize?: number }): Promise<ProductListResult> {
    return request<ProductListResult>({
      url: withQuery('/products', {
        moduleCode: params?.moduleCode,
        productType: params?.productType,
        tags: params?.tags?.join(','),
        page: params?.page,
        pageSize: params?.pageSize,
      }),
      method: 'GET',
    })
  },
  detail(id: number, tags?: string[]): Promise<Product> {
    return request<Product>({
      url: withQuery(`/products/${id}`, { tags: tags?.join(',') }),
      method: 'GET',
    })
  },
  myLeads(params?: { page?: number; pageSize?: number }): Promise<ProductListResult & { list: ProductLead[] }> {
    return request<ProductListResult & { list: ProductLead[] }>({
      url: withQuery('/products/my-leads', {
        page: params?.page,
        pageSize: params?.pageSize,
      }),
      method: 'GET',
    })
  },
  myLeadDetail(id: number): Promise<ProductLead> {
    return request<ProductLead>({
      url: `/products/my-leads/${id}`,
      method: 'GET',
    })
  },
  confirmLeadContact(id: number, data?: { note?: string }): Promise<ProductLead> {
    return request<ProductLead>({
      url: `/products/my-leads/${id}/confirm-contact`,
      method: 'POST',
      data: data || {},
    })
  },
  createLead(id: number, data: { needTags?: string[]; needTagIds?: number[]; message?: string; inviteCode?: string; sourceScene?: string }) {
    return request({
      url: `/products/${id}/leads`,
      method: 'POST',
      data,
    })
  },
  reportEvent(data: RecommendationEventPayload): Promise<{ id: number }> {
    return request<{ id: number }>({
      url: '/products/events',
      method: 'POST',
      data,
    })
  },
  myAssessments(): Promise<UserAssessment[]> {
    return request<UserAssessment[]>({
      url: '/products/my-assessments',
      method: 'GET',
    })
  },
  syncAssessments(items: Array<{
    moduleCode: string
    assessmentType: string
    tags: string[]
    tagIds?: number[]
    tagWeights?: Record<string, number>
    summary: string
    answers: Record<string, unknown>
  }>): Promise<UserAssessment[]> {
    return request<UserAssessment[]>({
      url: '/products/my-assessments/sync',
      method: 'POST',
      data: { items },
    })
  },
  listTags(params?: { moduleId?: number; status?: number; group?: string; keyword?: string }): Promise<TagDictionary[]> {
    return request<TagDictionary[]>({
      url: withQuery('/tags', {
        moduleId: params?.moduleId,
        status: params?.status,
        group: params?.group,
        keyword: params?.keyword,
      }),
      method: 'GET',
    })
  },
}
