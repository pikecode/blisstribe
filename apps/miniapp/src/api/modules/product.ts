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
  title: string
  subtitle: string
  coverUrl: string
  priceText: string
  summary: string
  detail?: string
  targetUserText: string
  painPointText: string
  serviceProcess: string
  tags: string[]
  tagIds?: number[]
  matchedTagIds?: number[]
  matchedTags: string[]
  recommendReason: string
  score: number
  publishedAt: string | null
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
  recommended(params?: { moduleCode?: string; tags?: string[]; tagIds?: number[]; limit?: number }): Promise<Product[]> {
    return request<Product[]>({
      url: withQuery('/products/recommended', {
        moduleCode: params?.moduleCode,
        tags: params?.tags?.join(','),
        tagIds: params?.tagIds?.join(','),
        limit: params?.limit,
      }),
      method: 'GET',
    })
  },
  list(params?: { moduleCode?: string; tags?: string[]; page?: number; pageSize?: number }): Promise<ProductListResult> {
    return request<ProductListResult>({
      url: withQuery('/products', {
        moduleCode: params?.moduleCode,
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
  createLead(id: number, data: { needTags?: string[]; needTagIds?: number[]; message?: string; inviteCode?: string; sourceScene?: string }) {
    return request({
      url: `/products/${id}/leads`,
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
