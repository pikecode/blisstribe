<template>
  <view class="shop-list">
    <!-- Header with search and sort -->
    <view class="shop-list__header">
      <view class="shop-list__search-bar">
        <view class="shop-list__search" @tap="goSearch">
          <text class="shop-list__search-icon">🔍</text>
          <input
            v-model="searchInput"
            type="text"
            class="shop-list__search-input"
            placeholder="搜索商品"
            confirm-type="search"
            @confirm="handleSearch"
          />
        </view>
      </view>

      <!-- Category tabs -->
      <view class="shop-list__categories">
        <scroll-view scroll-x class="shop-list__category-scroll">
          <view
            class="shop-list__category-item"
            :class="{ active: !selectedCategory }"
            @tap="selectCategory()"
          >
            全部
          </view>
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="shop-list__category-item"
            :class="{ active: selectedCategory === cat.code }"
            @tap="selectCategory(cat.code)"
          >
            {{ cat.name }}
          </view>
        </scroll-view>
      </view>

      <!-- Sort options -->
      <view class="shop-list__sort-bar">
        <view
          class="shop-list__sort-item"
          :class="{ active: sortBy === 'default' }"
          @tap="changeSortBy('default')"
        >
          综合排序
        </view>
        <view
          class="shop-list__sort-item"
          :class="{ active: sortBy === 'price-asc' }"
          @tap="changeSortBy('price-asc')"
        >
          价格低到高
        </view>
        <view
          class="shop-list__sort-item"
          :class="{ active: sortBy === 'price-desc' }"
          @tap="changeSortBy('price-desc')"
        >
          价格高到低
        </view>
      </view>
    </view>

    <!-- Products list with pull-to-refresh and load-more -->
    <scroll-view
      scroll-y
      class="shop-list__scroll"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="handleRefresh"
      @scrolltolower="handleLoadMore"
    >
      <!-- Loading state -->
      <view v-if="loading && products.length === 0" class="shop-list__state shop-list__state--loading">
        <view class="shop-list__skeleton">
          <view v-for="i in 4" :key="i" class="shop-list__skeleton-item"></view>
        </view>
        <text>加载中...</text>
      </view>

      <!-- Error state -->
      <view v-else-if="loadError && products.length === 0" class="shop-list__state shop-list__state--error">
        <text class="shop-list__error-title">加载失败</text>
        <text class="shop-list__error-text">网络连接出现问题，请重试</text>
        <view class="shop-list__retry" @tap="loadProducts">重新加载</view>
      </view>

      <!-- Empty state -->
      <view v-else-if="products.length === 0" class="shop-list__state shop-list__state--empty">
        <text class="shop-list__empty-title">暂无商品</text>
        <text class="shop-list__empty-text">暂时没有符合条件的商品</text>
      </view>

      <!-- Products grid -->
      <view v-else class="shop-list__grid">
        <view
          v-for="product in sortedProducts"
          :key="product.id"
          class="shop-list__product-card"
          @tap="goDetail(product.id)"
        >
          <view class="product-card__image-wrapper">
            <image
              v-if="product.coverUrl"
              :src="product.coverUrl"
              class="product-card__image"
              mode="aspectFill"
            />
            <view v-else class="product-card__image product-card__image--empty">
              <text>{{ product.module.name }}</text>
            </view>
            <text v-if="product.stockStatus === 'sold_out'" class="product-card__sold-out">已售罄</text>
          </view>

          <view class="product-card__info">
            <text class="product-card__title">{{ product.title }}</text>
            <text v-if="product.priceText" class="product-card__price">{{ product.priceText }}</text>
            <text class="product-card__type">{{ productTypeText(product.productType) }}</text>
          </view>
        </view>
      </view>

      <!-- Load more indicator -->
      <view v-if="products.length > 0" class="shop-list__load-more">
        <text v-if="loadingMore" class="shop-list__load-more-text">加载中...</text>
        <text v-else-if="!hasMore" class="shop-list__load-more-text">没有更多商品了</text>
        <text v-else class="shop-list__load-more-text">上拉加载更多</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onLoad, onShow, useRoute } from '@dcloudio/uni-app'
import { productApi, type Product, productTypeText, type ProductModule } from '@/api/modules/product'
import { reportProductEvent } from '@/utils/analytics'

const route = useRoute()

// State
const products = ref<Product[]>([])
const loading = ref(false)
const loadError = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)

const selectedCategory = ref<string>('')
const searchInput = ref<string>('')
const sortBy = ref<'default' | 'price-asc' | 'price-desc'>('default')

const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const categories = ref<ProductModule[]>([])

const hasMore = computed(() => products.value.length < total.value)
const sortedProducts = computed(() => {
  if (sortBy.value === 'default') return products.value
  return [...products.value].sort((a, b) => {
    const priceA = parsePrice(a.priceText)
    const priceB = parsePrice(b.priceText)
    return sortBy.value === 'price-asc' ? priceA - priceB : priceB - priceA
  })
})

watch(sortBy, () => {
  // Sorting is done in computed, UI updates automatically
})

// Helper to parse price from string like "¥100-200" or "¥100"
function parsePrice(priceText: string): number {
  if (!priceText) return 0
  const match = priceText.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

// Load categories
async function loadCategories() {
  try {
    const modules = await productApi.modules()
    categories.value = modules.filter((m) => m.showOnHome || m.code === 'health')
  } catch (err) {
    console.error('Failed to load categories:', err)
  }
}

// Load products
async function loadProducts(page = 1, isRefresh = false) {
  try {
    if (page === 1) {
      loading.value = true
    } else {
      loadingMore.value = true
    }
    loadError.value = false

    const params: Record<string, any> = {
      page,
      pageSize,
    }

    if (selectedCategory.value) {
      params.moduleCode = selectedCategory.value
    }

    if (searchInput.value) {
      // Note: The API doesn't have direct search param, so we filter client-side
      params.search = searchInput.value
    }

    const result = await productApi.list(params)

    // Client-side search filtering if needed
    let filtered = result.list
    if (searchInput.value) {
      const query = searchInput.value.toLowerCase()
      filtered = result.list.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.summary.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    if (isRefresh || page === 1) {
      products.value = filtered
    } else {
      products.value.push(...filtered)
    }

    total.value = result.total
    currentPage.value = page

    reportProductEvent({
      eventType: 'impression',
      sourceScene: 'shop_list',
      tags: searchInput.value ? [searchInput.value] : undefined,
    })
  } catch (err) {
    console.error('Failed to load products:', err)
    loadError.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

// Event handlers
function handleRefresh() {
  refreshing.value = true
  currentPage.value = 1
  loadProducts(1, true)
}

function handleLoadMore() {
  if (hasMore.value && !loadingMore.value && !loading.value) {
    loadProducts(currentPage.value + 1)
  }
}

function selectCategory(code?: string) {
  selectedCategory.value = code || ''
  currentPage.value = 1
  products.value = []
  loadProducts(1)
}

function changeSortBy(sort: typeof sortBy.value) {
  sortBy.value = sort
}

function handleSearch() {
  currentPage.value = 1
  products.value = []
  loadProducts(1)
}

function goSearch() {
  uni.navigateTo({ url: '/pages/index/index?search=1' })
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })

  reportProductEvent({
    eventType: 'click',
    productId: id,
    sourceScene: 'shop_list',
  })
}

// Route query handling (from home page search)
onLoad((options: any) => {
  if (options.search) {
    searchInput.value = decodeURIComponent(options.search)
  }
  if (options.category) {
    selectedCategory.value = decodeURIComponent(options.category)
  }
})

onShow(() => {
  loadCategories()
  if (products.value.length === 0) {
    loadProducts(1)
  }
})
</script>

<style scoped lang="scss">
.shop-list {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f7;
}

.shop-list__header {
  background-color: #fff;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.shop-list__search-bar {
  margin-bottom: 12px;
}

.shop-list__search {
  display: flex;
  align-items: center;
  background-color: #f5f5f7;
  border-radius: 8px;
  padding: 0 12px;
  height: 40px;
}

.shop-list__search-icon {
  font-size: 16px;
  margin-right: 8px;
  color: #999;
}

.shop-list__search-input {
  flex: 1;
  font-size: 14px;
  color: #333;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
}

.shop-list__search-input::placeholder {
  color: #999;
}

.shop-list__categories {
  margin-bottom: 12px;
}

.shop-list__category-scroll {
  display: flex;
  gap: 8px;
  white-space: nowrap;
  scroll-behavior: smooth;
}

.shop-list__category-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background-color: #f5f5f7;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.3s ease;

  &.active {
    background-color: #333;
    color: #fff;
  }
}

.shop-list__sort-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.shop-list__sort-item {
  flex: 1;
  text-align: center;
  padding: 8px;
  font-size: 13px;
  color: #666;
  border-radius: 6px;
  background-color: #f5f5f7;
  transition: all 0.3s ease;

  &.active {
    background-color: #e8f5e9;
    color: #2e7d32;
    font-weight: 500;
  }
}

.shop-list__scroll {
  flex: 1;
  overflow-y: scroll;
}

.shop-list__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 16px;
  text-align: center;
}

.shop-list__state--loading {
  padding: 40px 16px;
}

.shop-list__skeleton {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 16px;
}

.shop-list__skeleton-item {
  aspect-ratio: 3 / 4;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 8px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.shop-list__error-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.shop-list__error-text {
  font-size: 14px;
  color: #999;
  margin-bottom: 16px;
}

.shop-list__retry {
  padding: 10px 24px;
  background-color: #333;
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.shop-list__empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.shop-list__empty-text {
  font-size: 14px;
  color: #999;
}

.shop-list__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px;
}

.shop-list__product-card {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.product-card__image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background-color: #f5f5f7;
  overflow: hidden;
}

.product-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__image--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  color: #999;
  font-size: 12px;
  text-align: center;
  padding: 12px;
}

.product-card__sold-out {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.product-card__info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-card__title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-card__price {
  font-size: 15px;
  font-weight: 600;
  color: #e74c3c;
}

.product-card__type {
  font-size: 12px;
  color: #999;
}

.shop-list__load-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 40px;
}

.shop-list__load-more-text {
  font-size: 14px;
  color: #999;
}
</style>
