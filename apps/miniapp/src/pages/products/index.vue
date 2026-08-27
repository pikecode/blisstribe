<template>
  <view class="products">
    <view class="products__head">
      <text class="products__eyebrow">产品推荐</text>
      <text class="products__title">专属{{ currentModule?.name || '产品' }}推荐</text>
      <text class="products__subtitle">{{ canUseAssessment && assessment ? '已根据需求评估优先匹配产品' : '按你的标签优先展示更匹配的产品' }}</text>
      <view v-if="canUseAssessment && assessment" class="products__assessment">
        <text class="products__assessment-title">需求评估</text>
        <text class="products__assessment-summary">{{ assessment.summary }}</text>
        <view class="products__assessment-actions">
          <text class="products__assessment-link" @tap="goAssessment">重新评估</text>
          <text class="products__assessment-link" @tap="clearAssessmentResult">清除评估</text>
        </view>
      </view>
      <view class="products__tags" v-if="userTags.length">
        <text v-for="tag in userTags" :key="tag" class="products__tag">{{ tag }}</text>
      </view>
      <view v-else class="products__profile" @tap="goEditProfile">
        <text>完善标签后推荐会更精准</text>
      </view>
      <view v-if="canUseAssessment && !assessment" class="products__assessment-entry" @tap="goAssessment">
        <text>做一次{{ currentModule?.name || '' }}需求评估</text>
      </view>
      <view class="products__meta">
        <text>{{ products.length }} 个产品</text>
        <text>{{ effectiveTags.length ? `${effectiveTags.length} 个匹配标签` : '暂无匹配标签' }}</text>
      </view>
      <view class="products__type-tabs">
        <text
          v-for="item in productTypeTabs"
          :key="item.value || 'all'"
          class="products__type-tab"
          :class="{ active: selectedProductType === item.value }"
          @tap="changeProductType(item.value)"
        >
          {{ item.label }}
        </text>
      </view>
      <view v-if="moduleCode === 'health'" class="products__scenes">
        <text
          v-for="item in sceneTags"
          :key="item"
          class="products__scene"
          :class="{ active: selectedSceneTags.includes(item) }"
          @tap="toggleSceneTag(item)"
        >
          {{ item }}
        </text>
      </view>
    </view>

    <view v-if="loading" class="products__state">
      <text>正在匹配适合你的产品</text>
    </view>

    <view v-else-if="loadError" class="products__state">
      <text>推荐加载失败</text>
      <view class="products__retry" @tap="loadProducts">重新加载</view>
    </view>

    <view v-else class="products__list">
      <view v-for="item in products" :key="item.id" class="product-card" @tap="goDetail(item.id)">
        <image v-if="item.coverUrl" :src="item.coverUrl" class="product-card__cover" mode="aspectFill" />
        <view v-else class="product-card__cover product-card__cover--empty">
          <text>{{ item.module.name }}</text>
        </view>
        <view class="product-card__body">
          <view class="product-card__top">
            <text class="product-card__title">{{ item.title }}</text>
            <text v-if="item.priceText" class="product-card__price">{{ item.priceText }}</text>
          </view>
          <text class="product-card__type">{{ productTypeText(item.productType) }}</text>
          <text class="product-card__summary">{{ item.summary || item.subtitle }}</text>
          <view class="product-card__tags">
            <text v-for="tag in item.tags.slice(0, 4)" :key="tag" class="product-card__tag" :class="{ matched: item.matchedTags.includes(tag) }">
              {{ tag }}
            </text>
          </view>
          <text class="product-card__reason">{{ item.recommendReason }}</text>
        </view>
      </view>
    </view>

    <view v-if="!loading && !loadError && products.length === 0" class="products__empty">
      <text>暂无可推荐产品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { productApi, productTypeText, type Product, type ProductModule, type ProductType } from '@/api/modules/product'
import { useFreshUserInfo } from '@/composables/useFreshUserInfo'
import { useHealthAssessment, type HealthAssessment } from '@/composables/useHealthAssessment'

const authStore = useAuthStore()
const userStore = useUserStore()
const products = ref<Product[]>([])
const loading = ref(false)
const loadError = ref(false)
const moduleCode = ref('health')
const currentModule = ref<ProductModule | null>(null)
const selectedSceneTags = ref<string[]>([])
const selectedProductType = ref<ProductType | ''>('')
const assessment = ref<HealthAssessment | null>(null)
const userTags = computed(() => userStore.userInfo?.tags || [])
const canUseAssessment = computed(() => !!currentModule.value?.assessmentEnabled && !!currentModule.value.assessmentType)
const effectiveTags = computed(() => [
  ...new Set([
    ...userTags.value,
    ...(canUseAssessment.value ? assessment.value?.tags || [] : []),
    ...selectedSceneTags.value,
  ]),
])
const { refreshUserInfo } = useFreshUserInfo()
const { getAssessment, clearAssessment } = useHealthAssessment()

const sceneTags = ['睡眠改善', '体重管理', '家庭健康', '运动健身', '营养咨询']
const productTypeTabs: Array<{ label: string; value: ProductType | '' }> = [
  { label: '全部', value: '' },
  { label: '服务', value: 'service' },
  { label: '实物', value: 'physical' },
  { label: '组合', value: 'package' },
]

async function loadCurrentModule() {
  try {
    const modules = await productApi.modules()
    currentModule.value = modules.find((item) => item.code === moduleCode.value) || null
  } catch {
    currentModule.value = null
  }
}

async function loadProducts() {
  loading.value = true
  loadError.value = false
  try {
    await refreshUserInfo()
    await loadCurrentModule()
    assessment.value = canUseAssessment.value ? getAssessment(moduleCode.value) : null
    products.value = await productApi.recommended({
      moduleCode: moduleCode.value,
      productType: selectedProductType.value || undefined,
      tags: effectiveTags.value,
      limit: 20,
    })
  } catch {
    products.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function clearAssessmentResult() {
  clearAssessment(moduleCode.value)
  assessment.value = null
  loadProducts()
}

function toggleSceneTag(tag: string) {
  const index = selectedSceneTags.value.indexOf(tag)
  if (index >= 0) selectedSceneTags.value.splice(index, 1)
  else selectedSceneTags.value = [tag]
  loadProducts()
}

function changeProductType(type: ProductType | '') {
  selectedProductType.value = type
  loadProducts()
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

function goEditProfile() {
  if (!authStore.isLogin) {
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }
  uni.navigateTo({ url: '/pages/profile/edit' })
}

function goAssessment() {
  uni.navigateTo({ url: `/pages/products/assessment?moduleCode=${moduleCode.value}` })
}

onLoad((options) => {
  if (options?.moduleCode) moduleCode.value = String(options.moduleCode)
})

onShow(loadProducts)
</script>

<style lang="scss" scoped>
.products {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 56rpx;

  &__head {
    padding: 42rpx 32rpx 30rpx;
    background: linear-gradient(180deg, #ffffff 0%, #f6faf7 100%);
    border-bottom: 1rpx solid var(--color-border);
  }
  &__eyebrow {
    display: block;
    color: var(--color-primary);
    font-size: 23rpx;
    font-weight: 700;
    line-height: 32rpx;
    margin-bottom: 8rpx;
  }
  &__title {
    display: block;
    font-size: 42rpx;
    font-weight: 800;
    color: var(--color-text);
    line-height: 1.24;
    margin-bottom: 8rpx;
  }
  &__subtitle {
    display: block;
    font-size: 25rpx;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 24rpx;
  }
  &__tag,
  &__profile {
    padding: 10rpx 20rpx;
    border-radius: 28rpx;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 24rpx;
    font-weight: 600;
  }
  &__profile {
    display: inline-flex;
    margin-top: 24rpx;
  }
  &__assessment {
    margin-top: 24rpx;
    padding: 22rpx;
    border-radius: var(--radius-lg);
    background: var(--color-bg-white);
    box-shadow: var(--shadow-sm);
    &-title {
      display: block;
      color: var(--color-text);
      font-size: 26rpx;
      font-weight: 600;
      margin-bottom: 8rpx;
    }
    &-summary {
      display: block;
      color: var(--color-text-secondary);
      font-size: 24rpx;
      line-height: 1.55;
    }
    &-actions {
      display: flex;
      gap: 24rpx;
      margin-top: 14rpx;
    }
    &-link {
      color: var(--color-primary);
      font-size: 24rpx;
    }
  }
  &__assessment-entry {
    display: inline-flex;
    margin-top: 24rpx;
    padding: 12rpx 24rpx;
    border-radius: 30rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 24rpx;
    font-weight: 700;
  }
  &__meta {
    display: flex;
    gap: 18rpx;
    margin-top: 24rpx;
    color: var(--color-text-tertiary);
    font-size: 23rpx;
  }
  &__type-tabs {
    display: flex;
    gap: 12rpx;
    margin-top: 24rpx;
    overflow-x: auto;
  }
  &__type-tab {
    flex-shrink: 0;
    padding: 12rpx 22rpx;
    border-radius: 30rpx;
    background: var(--color-bg-white);
    color: var(--color-text-secondary);
    font-size: 24rpx;
    font-weight: 600;
    border: 1rpx solid var(--color-border);
    &.active {
      color: #fff;
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
  }
  &__scenes {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 24rpx;
  }
  &__scene {
    padding: 10rpx 20rpx;
    border-radius: 28rpx;
    background: var(--color-bg-gray);
    color: var(--color-text-secondary);
    font-size: 24rpx;
    &.active {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 700;
    }
  }
  &__list {
    padding: 24rpx 28rpx 0;
  }
  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    padding: 120rpx 32rpx;
    color: var(--color-text-tertiary);
    font-size: 28rpx;
  }
  &__retry {
    padding: 14rpx 32rpx;
    border-radius: 32rpx;
    color: #fff;
    background: var(--color-primary);
    font-size: 26rpx;
  }
  &__empty {
    padding: 120rpx 32rpx;
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: 28rpx;
  }
}

.product-card {
  margin-bottom: 22rpx;
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;

  &__cover {
    width: 100%;
    height: 292rpx;
    background: #e9eef3;
    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      font-size: 30rpx;
    }
  }
  &__body {
    padding: 26rpx;
  }
  &__top {
    display: flex;
    gap: 16rpx;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12rpx;
  }
  &__title {
    flex: 1;
    font-size: 32rpx;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.35;
  }
  &__price {
    flex-shrink: 0;
    color: #f97316;
    font-size: 26rpx;
    font-weight: 600;
  }
  &__type {
    display: inline-flex;
    margin-bottom: 10rpx;
    padding: 5rpx 12rpx;
    border-radius: 18rpx;
    background: var(--color-bg-subtle);
    color: var(--color-text-secondary);
    font-size: 21rpx;
    line-height: 28rpx;
  }
  &__summary {
    display: block;
    color: var(--color-text-secondary);
    font-size: 25rpx;
    line-height: 1.5;
    margin-bottom: 16rpx;
  }
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-bottom: 14rpx;
  }
  &__tag {
    padding: 6rpx 14rpx;
    border-radius: 20rpx;
    background: var(--color-bg-gray);
    color: var(--color-text-secondary);
    font-size: 22rpx;
    &.matched {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 700;
    }
  }
  &__reason {
    display: block;
    padding-top: 14rpx;
    border-top: 1rpx solid var(--color-border);
    color: var(--color-text-tertiary);
    font-size: 22rpx;
    line-height: 1.45;
  }
}
</style>
