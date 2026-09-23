import request from '@/utils/request'

export interface ShopCategory {
  id: number
  name: string
  code: string
  description?: string
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryDto {
  name: string
  code: string
  description?: string
  sortOrder?: number
  status?: number
}

export interface UpdateCategoryDto {
  name?: string
  code?: string
  description?: string
  status?: number
  sortOrder?: number
}

export interface ShopProduct {
  id: number
  categoryId: number
  name: string
  description?: string
  images: string[]
  priceFen: number
  totalStock: number
  reservedStock: number
  soldStock: number
  status: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CreateProductDto {
  categoryId: number
  name: string
  description?: string
  images: string[]
  priceFen: number
  totalStock: number
  sortOrder?: number
}

export interface UpdateProductDto {
  name?: string
  description?: string
  images?: string[]
  priceFen?: number
  totalStock?: number
  status?: number
  sortOrder?: number
}

export interface ProductListResult {
  list: ShopProduct[]
  total: number
  page: number
  pageSize: number
}

export const shopApi = {
  // Categories
  listCategories() {
    return request.get<ShopCategory[]>('/admin/shop/categories')
  },

  createCategory(data: CreateCategoryDto) {
    return request.post<ShopCategory>('/admin/shop/categories', data)
  },

  updateCategory(id: number, data: UpdateCategoryDto) {
    return request.put<ShopCategory>(`/admin/shop/categories/${id}`, data)
  },

  deleteCategory(id: number) {
    return request.delete(`/admin/shop/categories/${id}`)
  },

  // Products
  listProducts(params: {
    page?: number
    pageSize?: number
    categoryId?: number
    keyword?: string
  }) {
    return request.get<ProductListResult>('/admin/shop/products', { params })
  },

  getProduct(id: number) {
    return request.get<ShopProduct>(`/admin/shop/products/${id}`)
  },

  createProduct(data: CreateProductDto) {
    return request.post('/admin/shop/products', data)
  },

  updateProduct(id: number, data: UpdateProductDto) {
    return request.put(`/admin/shop/products/${id}`, data)
  },

  deleteProduct(id: number) {
    return request.delete(`/admin/shop/products/${id}`)
  },

  publishProduct(id: number) {
    return request.post(`/admin/shop/products/${id}/publish`)
  },

  unpublishProduct(id: number) {
    return request.post(`/admin/shop/products/${id}/unpublish`)
  },
}
