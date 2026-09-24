<template>
  <view class="shop-index">
    <!-- Search Bar -->
    <view class="search-container">
      <view class="search-bar" @click="navigateToSearch">
        <text class="search-icon">🔍</text>
        <input class="search-input" type="text" placeholder="搜索商品" disabled />
      </view>
    </view>

    <!-- Categories Navigation -->
    <view class="categories-section">
      <scroll-view scroll-x class="categories-scroll">
        <view
          v-for="category in categories"
          :key="category.id"
          class="category-item"
          :class="{ active: selectedCategoryId === category.id }"
          @click="selectCategory(category.id)"
        >
          <text>{{ category.name }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- Product List -->
    <view class="hot-products-section">
      <view class="section-header">
        <text class="section-title">全部商品</text>
      </view>

      <view v-if="loadingHot && hotProducts.length === 0" class="loading-container">
        <text>加载中...</text>
      </view>

      <view v-if="errorHot && hotProducts.length === 0" class="error-container">
        <text>{{ errorHot }}</text>
        <button class="retry-btn" @click="loadHotProducts">重试</button>
      </view>

      <view v-if="!loadingHot && !errorHot && hotProducts.length === 0" class="empty-container">
        <text>暂无商品</text>
      </view>

      <view v-if="hotProducts.length > 0" class="products-grid">
        <product-card v-for="product in hotProducts" :key="product.id" :product="product" />
      </view>

      <view v-if="hasMore && hotProducts.length > 0" class="load-more-container">
        <button :loading="loadingMore" class="load-more-btn" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </view>

      <view v-if="!hasMore && hotProducts.length > 0" class="no-more">
        <text>已加载全部商品</text>
      </view>
    </view>

    <!-- Tab Bar Placeholder -->
    <view class="tab-bar-placeholder" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { shopApi, type ShopCategory, type ShopProduct } from '@/api/modules/shop'
import ProductCard from '@/components/shop/ProductCard.vue'

const categories = ref<ShopCategory[]>([])
const hotProducts = ref<ShopProduct[]>([])
const selectedCategoryId = ref<string | null>(null)

const currentPage = ref(1)
const hasMore = ref(true)
const loadingHot = ref(false)
const loadingMore = ref(false)
const errorHot = ref('')

onMounted(async () => {
  await loadCategories()
  await loadHotProducts()
})

async function loadCategories() {
  try {
    const res = await shopApi.categories()
    categories.value = res || []
  } catch (err) {
    console.error('Failed to load categories:', err)
  }
}

async function loadHotProducts() {
  if (loadingHot.value) return

  loadingHot.value = true
  errorHot.value = ''

  try {
    const res = await shopApi.products({
      page: currentPage.value,
      pageSize: 10,
      categoryId: selectedCategoryId.value || undefined,
    })

    if (currentPage.value === 1) {
      hotProducts.value = res.list || []
    } else {
      hotProducts.value.push(...(res.list || []))
    }

    hasMore.value = res.hasMore
  } catch (err: any) {
    errorHot.value = '加载失败，请检查网络'
    console.error('Failed to load hot products:', err)
  } finally {
    loadingHot.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  currentPage.value++

  try {
    const res = await shopApi.products({
      page: currentPage.value,
      pageSize: 10,
      categoryId: selectedCategoryId.value || undefined,
    })

    hotProducts.value.push(...(res.list || []))
    hasMore.value = res.hasMore
  } catch (err) {
    console.error('Failed to load more products:', err)
    uni.showToast({
      title: '加载失败',
      icon: 'none',
    })
  } finally {
    loadingMore.value = false
  }
}

function selectCategory(categoryId: string) {
  selectedCategoryId.value = categoryId
  currentPage.value = 1
  hasMore.value = true
  hotProducts.value = []
  loadHotProducts()
}

function navigateToSearch() {
  uni.navigateTo({
    url: '/pages/shop/list',
  })
}

function goToDetail(productId: string) {
  uni.navigateTo({
    url: `/pages/shop/detail?id=${productId}`,
  })
}

</script>

<style scoped lang="scss">
.shop-index {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 60px;
}

.search-container {
  background: #fff;
  padding: 12px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.search-bar {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 20px;
  padding: 10px 16px;
  gap: 8px;
}

.search-icon {
  font-size: 16px;
  color: #999;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #999;
  padding: 0;
  border: none;
  background: transparent;
}

.categories-section {
  background: #fff;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.categories-scroll {
  display: flex;
  padding: 0 8px;
  white-space: nowrap;
  &::-webkit-scrollbar {
    display: none;
  }
}

.category-item {
  padding: 8px 14px;
  margin: 0 4px;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  transition: all 0.2s ease;

  &.active {
    background: #ff6b6b;
    color: #fff;
  }
}

.hot-products-section {
  background: #fff;
  margin-top: 8px;
}

.section-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.products-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px;
}

.loading-container,
.error-container,
.empty-container {
  padding: 40px 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.error-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.retry-btn {
  margin-top: 12px;
  padding: 10px 24px;
  background: #ff6b6b;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
}

.load-more-container {
  padding: 16px;
  text-align: center;
}

.load-more-btn {
  width: 100%;
  padding: 12px;
  background: #ff6b6b;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
}

.no-more {
  padding: 20px 16px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.tab-bar-placeholder {
  height: 50px;
}
</style>
