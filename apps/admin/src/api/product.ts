import request from '@/utils/request'

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
  createdAt: string
  updatedAt: string
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

export interface TagDictionaryPayload {
  code: string
  name: string
  group?: string
  moduleId?: number
  description?: string
  status?: number
  sortOrder?: number
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
  detail: string
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
  primaryTagIds?: number[]
  secondaryTagIds?: number[]
  excludeTagIds?: number[]
  priority: number
  sortOrder: number
  status: number
  createdAt: string
  updatedAt: string
}

export type ProductType = 'service' | 'physical' | 'package'
export type ProductServiceMode = 'online' | 'offline' | 'mixed'
export type ProductStockStatus = 'available' | 'limited' | 'sold_out'

export function productTypeText(type?: string) {
  if (type === 'physical') return '实物产品'
  if (type === 'package') return '组合方案'
  return '服务产品'
}

export interface ProductLead {
  id: number
  product: { id: number; title: string; coverUrl: string; priceText: string }
  user: { id: number; nickname: string; avatar: string; phoneMasked: string; tags: string[] }
  partner: { id: number; displayName: string; partnerNo: string } | null
  sourceInviteCode: string | null
  sourceScene: string
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

export interface ProductLeadSummary {
  total: number
  active: number
  today: number
  overdue: number
  upcoming: number
  converted: number
  invalid: number
}

export interface RecommendationOverview {
  impressions: number
  clicks: number
  leads: number
  assessments: number
  clickRate: number
  leadRate: number
}

export interface RecommendationProductStat extends RecommendationOverview {
  productId: number
  product: Product | null
}

export interface RecommendationTrendItem {
  date: string
  impressions: number
  clicks: number
  leads: number
  assessments: number
}

export interface RecommendationAnalytics {
  overview: RecommendationOverview
  productStats: RecommendationProductStat[]
  trend: RecommendationTrendItem[]
}

export interface AssessmentOption {
  id?: number
  label: string
  value: string
  tags: string[]
  tagIds?: number[]
  tagWeights?: Record<string, number>
  sortOrder: number
}

export interface AssessmentQuestion {
  id?: number
  key: string
  title: string
  type: 'single'
  sortOrder: number
  options: AssessmentOption[]
}

export interface AssessmentTemplate {
  id: number
  moduleId: number
  module?: ProductModule
  title: string
  subtitle: string
  version: number
  status: number
  sortOrder: number
  questions: AssessmentQuestion[]
  createdAt: string
  updatedAt: string
}

export interface AssessmentTemplatePayload {
  moduleId: number
  title: string
  subtitle?: string
  version?: number
  status?: number
  sortOrder?: number
  questions: AssessmentQuestion[]
}

export interface RecommendationRule {
  id: number
  moduleId: number
  module: ProductModule
  productId: number
  product: Product
  name: string
  conditionTags: string[]
  conditionTagIds?: number[]
  scoreBoost: number
  reason: string
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface RecommendationRulePayload {
  moduleId: number
  productId: number
  name: string
  conditionTags?: string[]
  conditionTagIds?: number[]
  scoreBoost?: number
  reason?: string
  status?: number
  sortOrder?: number
}

export interface ListResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface ProductPayload {
  moduleId: number
  productType?: ProductType
  title: string
  subtitle?: string
  coverUrl?: string
  priceText?: string
  summary?: string
  detail?: string
  targetUserText?: string
  painPointText?: string
  serviceProcess?: string
  serviceMode?: ProductServiceMode | ''
  serviceDuration?: string
  appointmentRequired?: boolean
  specText?: string
  deliveryText?: string
  afterSaleText?: string
  stockStatus?: ProductStockStatus
  tags?: string[]
  tagIds?: number[]
  primaryTagIds?: number[]
  secondaryTagIds?: number[]
  excludeTagIds?: number[]
  priority?: number
  sortOrder?: number
}

export interface ProductModulePayload {
  code: string
  name: string
  description?: string
  icon?: string
  coverUrl?: string
  showOnHome?: boolean
  assessmentEnabled?: boolean
  assessmentType?: string
  sortOrder?: number
  status?: number
}

export const productApi = {
  listModules(): Promise<ProductModule[]> {
    return request.get('/admin/product-modules')
  },
  createModule(data: ProductModulePayload): Promise<ProductModule> {
    return request.post('/admin/product-modules', data)
  },
  updateModule(id: number, data: Partial<ProductModulePayload>): Promise<ProductModule> {
    return request.put(`/admin/product-modules/${id}`, data)
  },
  listAssessmentTemplates(): Promise<AssessmentTemplate[]> {
    return request.get('/admin/assessment-templates')
  },
  createAssessmentTemplate(data: AssessmentTemplatePayload): Promise<AssessmentTemplate> {
    return request.post('/admin/assessment-templates', data)
  },
  updateAssessmentTemplate(id: number, data: Partial<AssessmentTemplatePayload>): Promise<AssessmentTemplate> {
    return request.put(`/admin/assessment-templates/${id}`, data)
  },
  listRecommendationRules(params?: { moduleId?: number | ''; productId?: number | ''; status?: number | '' }): Promise<RecommendationRule[]> {
    return request.get('/admin/recommendation-rules', { params })
  },
  createRecommendationRule(data: RecommendationRulePayload): Promise<RecommendationRule> {
    return request.post('/admin/recommendation-rules', data)
  },
  updateRecommendationRule(id: number, data: Partial<RecommendationRulePayload>): Promise<RecommendationRule> {
    return request.put(`/admin/recommendation-rules/${id}`, data)
  },
  listTags(params?: { moduleId?: number | ''; status?: number | ''; group?: string; keyword?: string }): Promise<TagDictionary[]> {
    return request.get('/admin/tags', { params })
  },
  createTag(data: TagDictionaryPayload): Promise<TagDictionary> {
    return request.post('/admin/tags', data)
  },
  updateTag(id: number, data: Partial<TagDictionaryPayload>): Promise<TagDictionary> {
    return request.put(`/admin/tags/${id}`, data)
  },
  listProducts(params: { page?: number; pageSize?: number; status?: number | ''; moduleId?: number | ''; productType?: ProductType | ''; keyword?: string }): Promise<ListResult<Product>> {
    return request.get('/admin/products', { params })
  },
  analytics(params?: {
    moduleId?: number | ''
    moduleCode?: string
    productType?: ProductType | ''
    recommendationForm?: string
    startDate?: string
    endDate?: string
  }): Promise<RecommendationAnalytics> {
    return request.get('/admin/products/analytics', { params })
  },
  createProduct(data: ProductPayload): Promise<Product> {
    return request.post('/admin/products', data)
  },
  updateProduct(id: number, data: Partial<ProductPayload> & { status?: number }): Promise<Product> {
    return request.put(`/admin/products/${id}`, data)
  },
  publishProduct(id: number): Promise<Product> {
    return request.post(`/admin/products/${id}/publish`)
  },
  unpublishProduct(id: number): Promise<Product> {
    return request.post(`/admin/products/${id}/unpublish`)
  },
  listLeads(params: {
    page?: number
    pageSize?: number
    status?: string
    productId?: number | ''
    partnerId?: number | ''
    followScope?: string
    keyword?: string
  }): Promise<ListResult<ProductLead>> {
    return request.get('/admin/product-leads', { params })
  },
  leadSummary(): Promise<ProductLeadSummary> {
    return request.get('/admin/product-leads/summary')
  },
  detailLead(id: number): Promise<ProductLead> {
    return request.get(`/admin/product-leads/${id}`)
  },
  followLead(id: number, data: { status: string; followUpNote?: string; nextFollowAt?: string }): Promise<ProductLead> {
    return request.put(`/admin/product-leads/${id}/follow-up`, data)
  },
}
