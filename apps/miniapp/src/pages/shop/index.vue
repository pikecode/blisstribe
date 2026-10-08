<template>
  <view class="shop-index">
    <view class="shop-hero">
      <text class="shop-hero__eyebrow">BLISS TRIBE STORE</text>
      <text class="shop-hero__title">把喜欢的生活带回家</text>
      <text class="shop-hero__desc">精选好物，陪你照顾身体与日常</text>
      <view class="search-bar" @click="navigateToSearch">
        <view class="search-icon"></view>
        <text class="search-placeholder">搜索商品</text>
        <text class="search-action">搜索</text>
      </view>
    </view>

    <!-- Categories Navigation -->
    <view class="categories-section">
      <scroll-view scroll-x class="categories-scroll">
        <view
          class="category-item"
          :class="{ active: selectedCategoryId === null }"
          @click="selectCategory(null)"
        >
          <text>全部</text>
        </view>
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
        <view>
          <text class="section-title">精选商品</text>
          <text class="section-desc">认真挑选每一件日常好物</text>
        </view>
        <text class="section-count">{{ hotProducts.length }} 件</text>
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

function selectCategory(categoryId: string | null) {
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
  background: var(--color-bg);
  min-height: 100vh;
  padding-bottom: 120rpx;
}

.shop-hero {
  padding: 46rpx 28rpx 32rpx;
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

.search-bar {
  display: flex;
  align-items: center;
  height: 84rpx;
  margin-top: 30rpx;
  padding: 0 12rpx 0 26rpx;
  gap: 18rpx;
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

.categories-section {
  background: #fff;
  padding: 20rpx 0 22rpx;
}

.categories-scroll {
  white-space: nowrap;
  width: 100%;
}

.category-item {
  display: inline-flex;
  align-items: center;
  min-height: 60rpx;
  padding: 0 26rpx;
  margin-left: 14rpx;
  border-radius: var(--radius-round);
  background: var(--color-bg-gray);
  color: var(--color-text-secondary);
  font-size: 24rpx;
  font-weight: 600;
  white-space: nowrap;
  transition: all var(--duration-fast) ease;

  &.active {
    background: var(--color-primary);
    color: #fff;
    box-shadow: var(--shadow-action);
  }
}

.hot-products-section {
  margin-top: 16rpx;
  padding: 0 20rpx;
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

.section-desc {
  display: block;
  margin-top: 4rpx;
  color: var(--color-text-secondary);
  font-size: 22rpx;
}

.section-count {
  color: var(--color-text-tertiary);
  font-size: 22rpx;
}

.products-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
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

.tab-bar-placeholder {
  height: 40rpx;
}
</style>
