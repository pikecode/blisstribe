<template>
  <view class="shop-index">
    <view class="shop-hero">
      <text class="shop-hero__eyebrow">BLISS TRIBE STORE</text>
      <text class="shop-hero__title">把喜欢的生活带回家</text>
      <text class="shop-hero__desc">精选好物，陪你照顾身体与日常</text>
    </view>

    <view class="shop-search">
      <view class="search-bar" @click="navigateToSearch">
        <view class="search-icon"></view>
        <text class="search-placeholder">搜索商品</text>
        <text class="search-action">搜索</text>
      </view>
    </view>

    <view class="shop-layout">
      <scroll-view scroll-y class="category-sidebar">
        <view class="sidebar-item" :class="{ active: !selectedRootId }" @tap="selectRoot(null)">全部商品</view>
        <view v-for="category in rootCategories" :key="category.id" class="sidebar-item" :class="{ active: selectedRootId === category.id }" @tap="selectRoot(category.id)">{{ category.name }}</view>
        <view v-if="categoryError" class="category-retry" @tap="loadCategories">分类加载失败，点击重试</view>
      </scroll-view>
      <view class="shop-catalog">
        <view v-if="childCategories.length" class="subcategory-list">
          <view class="subcategory-item" :class="{ active: selectedCategoryId === selectedRootId }" @tap="selectCategory(selectedRootId)">全部</view>
          <view v-for="category in childCategories" :key="category.id" class="subcategory-item" :class="{ active: selectedCategoryId === category.id }" @tap="selectCategory(category.id)">{{ category.name }}</view>
        </view>
    <!-- Product List -->
    <view class="hot-products-section" :class="{ 'is-loading': loadingHot }">
      <view class="section-header">
        <view>
          <text class="section-title">{{ categories.find(category => category.id === selectedCategoryId)?.name || '全部商品' }}</text>
        </view>
        <text class="section-count">{{ loadingHot ? '加载中…' : `${total} 件` }}</text>
      </view>

      <view v-if="loadingHot" class="loading-container" :class="{ 'loading-overlay': hotProducts.length > 0 }">
        <text>加载中...</text>
      </view>

      <view v-if="errorHot" class="error-container">
        <text>{{ errorHot }}</text>
        <button class="retry-btn" @click="loadHotProducts(1)">重试</button>
      </view>

      <view v-if="!loadingHot && !errorHot && hotProducts.length === 0" class="empty-container">
        <text>该分类暂无商品</text>
        <button class="empty-action" @tap="selectRoot(null)">查看全部商品</button>
      </view>

      <view v-if="hotProducts.length > 0 && !errorHot" class="products-grid">
        <product-card v-for="product in hotProducts" :key="product.id" :product="product" compact />
      </view>

      <view v-if="!errorHot && hasMore && hotProducts.length > 0" class="load-more-container">
        <button :loading="loadingMore" class="load-more-btn" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </view>

      <view v-if="!errorHot && !hasMore && hotProducts.length > 0" class="no-more">
        <text>已加载全部商品</text>
      </view>
    </view>

      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { shopApi, type ShopCategory, type ShopProduct } from '@/api/modules/shop'
import ProductCard from '@/components/shop/ProductCard.vue'

const categories = ref<ShopCategory[]>([])
const hotProducts = ref<ShopProduct[]>([])
const selectedCategoryId = ref<string | null>(null)
const selectedRootId = ref<string | null>(null)
const total = ref(0)
const categoryError = ref(false)
const rootCategories = computed(() => categories.value.filter(category => !category.parentId))
const childCategories = computed(() => categories.value.filter(category => category.parentId === selectedRootId.value && category.parentId))
let requestVersion = 0

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
    categoryError.value = false
    const res = await shopApi.categories()
    categories.value = res || []
  } catch (err) {
    categoryError.value = true
    console.error('Failed to load categories:', err)
  }
}

async function loadHotProducts(page = 1) {
  const version = ++requestVersion
  loadingHot.value = page === 1
  loadingMore.value = page > 1
  errorHot.value = ''
  try {
    const res = await shopApi.products({ page, pageSize: 10, categoryId: selectedCategoryId.value || undefined })
    if (version !== requestVersion) return
    hotProducts.value = page === 1 ? res.list : [...hotProducts.value, ...res.list]
    currentPage.value = page
    total.value = res.total
    hasMore.value = res.hasMore
  } catch {
    if (version !== requestVersion) return
    if (page === 1) errorHot.value = '商品加载失败，请点击重试'
    else uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  } finally {
    if (version === requestVersion) {
      loadingHot.value = false
      loadingMore.value = false
    }
  }
}

function loadMore() {
  if (!loadingHot.value && !loadingMore.value && hasMore.value) loadHotProducts(currentPage.value + 1)
}

function selectRoot(categoryId: string | null) {
  selectedRootId.value = categoryId
  selectCategory(categoryId)
}

function selectCategory(categoryId: string | null) {
  if (selectedCategoryId.value === categoryId) return
  selectedCategoryId.value = categoryId
  loadHotProducts(1)
}

function navigateToSearch() {
  uni.navigateTo({
    url: '/pages/shop/list',
  })
}

</script>

<style scoped lang="scss">
.shop-index {
  background: var(--color-bg);
  min-height: 100vh;
  padding-bottom: 24rpx;
}

.shop-hero {
  padding: 24rpx 28rpx;
  background: linear-gradient(145deg, #effaf3 0%, #f8fcfa 62%, #ffffff 100%);

  &__eyebrow {
    display: block;
    color: #078447;
    font-size: 20rpx;
    font-weight: 700;
    letter-spacing: 3rpx;
  }

  &__title {
    display: block;
    margin-top: 12rpx;
    color: var(--color-text);
    font-size: 42rpx;
    font-weight: 800;
    line-height: 58rpx;
  }

  &__desc {
    display: block;
    margin-top: 6rpx;
    color: var(--color-text-secondary);
    font-size: 24rpx;
    line-height: 36rpx;
  }
}

.shop-search {
  position: sticky;
  top: var(--window-top, 0px);
  z-index: 20;
  padding: 16rpx 28rpx;
  background: #f8fcfa;
  border-bottom: 1rpx solid #edf2ee;
}

.search-bar {
  display: flex;
  align-items: center;
  height: 84rpx;
  margin-top: 0;
  padding: 0 12rpx 0 26rpx;
  gap: 12rpx;
  background: #fff;
  border: 1rpx solid rgba(7, 193, 96, 0.1);
  border-radius: 22rpx;
  box-shadow: var(--shadow-sm);

  &:active { transform: scale(0.99); }
}

.search-icon {
  width: 22rpx;
  height: 22rpx;
  border: 3rpx solid var(--color-text-tertiary);
  border-radius: 50%;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: -8rpx;
    bottom: -5rpx;
    width: 10rpx;
    height: 3rpx;
    background: var(--color-text-tertiary);
    transform: rotate(45deg);
  }
}

.search-placeholder {
  flex: 1;
  color: var(--color-text-tertiary);
  font-size: 26rpx;
}

.search-action {
  padding: 14rpx 22rpx;
  border-radius: 16rpx;
  background: var(--color-primary-light);
  color: #078447;
  font-size: 24rpx;
  font-weight: 700;
}

.hot-products-section {
  position: relative;
  margin-top: 16rpx;
  padding: 0 16rpx;
}

.is-loading .products-grid,
.is-loading .load-more-container,
.is-loading .no-more {
  visibility: hidden;
  pointer-events: none;
}

.loading-overlay {
  position: absolute;
  top: 90rpx;
  left: 0;
  right: 0;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 22rpx 8rpx 20rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: var(--color-text);
}

.section-count {
  color: var(--color-text-tertiary);
  font-size: 22rpx;
}

.products-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.loading-container,
.error-container,
.empty-container {
  padding: 100rpx 28rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}

.error-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.retry-btn {
  margin-top: 24rpx;
  padding: 18rpx 44rpx;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-round);
  font-size: 26rpx;
}

.load-more-container {
  padding: 30rpx 0;
  text-align: center;
}

.load-more-btn {
  width: 280rpx;
  margin: 0 auto;
  background: #fff;
  color: var(--color-primary);
  border: 1rpx solid var(--color-primary-light);
  border-radius: var(--radius-round);
  font-size: 24rpx;
}

.no-more {
  padding: 36rpx 28rpx;
  text-align: center;
  color: #999;
  font-size: 22rpx;
}

.shop-layout { display: flex; align-items: flex-start; min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px) - 118rpx); background: #fff; }
.category-sidebar {
  position: sticky;
  top: calc(var(--window-top, 0px) + 118rpx);
  flex-shrink: 0;
  width: 158rpx;
  height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px) - 118rpx);
  background: #f4f6f5;
}
.sidebar-item { padding: 30rpx 14rpx; color: #66736c; font-size: 24rpx; line-height: 1.5; border-left: 6rpx solid transparent; word-break: break-all; }
.sidebar-item.active { color: #078447; font-weight: 700; background: #fff; border-left-color: #078447; }
.shop-catalog { flex: 1; min-width: 0; padding-bottom: 24rpx; }
.subcategory-list {
  position: sticky;
  top: calc(var(--window-top, 0px) + 118rpx);
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 20rpx 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #edf2ee;
}
.subcategory-item { padding: 14rpx 20rpx; border-radius: 12rpx; background: #f4f6f5; color: #66736c; font-size: 22rpx; }
.subcategory-item.active { color: #078447; background: #e7f6ec; font-weight: 700; }
.category-retry { padding: 24rpx 12rpx; color: #078447; font-size: 22rpx; }
.empty-action { margin-top: 24rpx; background: #e7f6ec; color: #078447; font-size: 24rpx; }
.section-title { font-size: 28rpx; }
</style>
