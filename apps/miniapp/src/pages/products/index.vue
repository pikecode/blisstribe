<template>
  <view class="products">
    <view class="products__head" :class="{ expanded: headExpanded }">
      <view class="products__head-top">
        <view>
          <text class="products__eyebrow">产品推荐</text>
          <text class="products__title">专属{{ currentModule?.name || '产品' }}推荐</text>
          <text class="products__subtitle">{{ canUseAssessment && assessment ? '已根据需求评估优先匹配产品' : '按你的标签优先展示更匹配的产品' }}</text>
        </view>
      </view>

      <view v-if="headExpanded" class="products__head-content">
        <view v-if="canUseAssessment && assessment" class="products__assessment">
          <view class="products__assessment-header">
            <text class="products__assessment-title">需求评估</text>
            <view class="products__assessment-actions">
              <text class="products__assessment-link" @tap="goAssessment">重新评估</text>
              <text class="products__assessment-link" @tap="clearAssessmentResult">清除</text>
            </view>
          </view>
          <text class="products__assessment-summary">{{ assessment.summary }}</text>
        </view>

        <view v-if="userTags.length" class="products__tags-group">
          <text class="products__tags-label">用户标签</text>
          <view class="products__tags">
            <text v-for="tag in userTags" :key="tag" class="products__tag">{{ tag }}</text>
          </view>
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

        <view class="products__filters">
          <view class="products__filter-group">
            <text class="products__filter-label">产品类型</text>
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
          </view>

          <view v-if="moduleCode === 'health'" class="products__filter-group">
            <text class="products__filter-label">使用场景</text>
            <view class="products__scenes">
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
        </view>
      </view>
    </view>

    <view v-if="loading" class="products__state products__state--loading">
      <view class="products__skeleton">
        <view class="products__skeleton-item"></view>
        <view class="products__skeleton-item"></view>
        <view class="products__skeleton-item"></view>
      </view>
      <text>正在匹配适合你的产品</text>
    </view>

    <view v-else-if="loadError" class="products__state products__state--error">
      <text class="products__error-title">加载失败</text>
      <text class="products__error-text">网络连接出现问题，请重试</text>
      <view class="products__retry" @tap="loadProducts">重新加载</view>
    </view>

    <view v-else-if="products.length === 0" class="products__state products__state--empty">
      <text class="products__empty-title">暂无推荐产品</text>
      <text class="products__empty-text">完善标签或做一次评估可以获得更精准的推荐</text>
      <view class="products__empty-actions">
        <view v-if="!userTags.length" class="products__empty-action" @tap="goEditProfile">完善标签</view>
        <view v-if="canUseAssessment && !assessment" class="products__empty-action" @tap="goAssessment">做评估</view>
      </view>
    </view>

    <view v-else class="products__list">
      <view v-for="(item, index) in products" :key="item.id" class="product-card" :style="{ '--animation-delay': index * 50 + 'ms' }" @tap="goDetail(item.id)">
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
import { reportProductEvent, reportProductImpressions } from '@/utils/analytics'

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
const fromAssessment = ref(false)
const headExpanded = ref(true)
const userTags = computed(() => userStore.userInfo?.tags || [])
const canUseAssessment = computed(() => !!currentModule.value?.assessmentEnabled && !!currentModule.value.assessmentType)
const effectiveTags = computed(() => [
  ...new Set([
    ...userTags.value,
    ...(canUseAssessment.value ? assessment.value?.tags || [] : []),
    ...selectedSceneTags.value,
  ]),
])
const effectiveTagIds = computed(() => [
  ...new Set([
    ...(userStore.userInfo?.tagIds || []),
    ...(canUseAssessment.value ? assessment.value?.tagIds || [] : []),
  ]),
])
const recommendationForm = computed(() => {
  if (fromAssessment.value && assessment.value) return 'assessment_result'
  if (userTags.value.length || effectiveTagIds.value.length) return 'profile_suggestion'
  return 'module_featured'
})
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
      tagIds: effectiveTagIds.value,
      limit: 20,
    })
    reportProductImpressions(products.value, {
      recommendationForm: recommendationForm.value,
      sourceScene: 'miniapp_product_list',
      moduleCode: moduleCode.value,
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
  reportProductEvent({
    eventType: 'filter_click',
    moduleId: currentModule.value?.id,
    moduleCode: moduleCode.value,
    productType: selectedProductType.value || undefined,
    recommendationForm: recommendationForm.value,
    sourceScene: 'miniapp_product_scene_filter',
    tags: selectedSceneTags.value,
    tagIds: effectiveTagIds.value,
    metadata: { selectedTag: tag },
  })
  loadProducts()
}

function changeProductType(type: ProductType | '') {
  selectedProductType.value = type
  reportProductEvent({
    eventType: 'filter_click',
    moduleId: currentModule.value?.id,
    moduleCode: moduleCode.value,
    productType: type || undefined,
    recommendationForm: recommendationForm.value,
    sourceScene: 'miniapp_product_type_filter',
    tags: effectiveTags.value,
    tagIds: effectiveTagIds.value,
  })
  loadProducts()
}

function goDetail(id: number) {
  const product = products.value.find((item) => item.id === id)
  if (product) {
    reportProductEvent({
      eventType: 'click',
      productId: product.id,
      moduleId: product.module?.id,
      moduleCode: product.module?.code,
      productType: product.productType,
      recommendationForm: recommendationForm.value,
      sourceScene: 'miniapp_product_list',
      tags: product.matchedTags?.length ? product.matchedTags : effectiveTags.value,
      tagIds: product.matchedTagIds || effectiveTagIds.value,
      score: product.score,
      reason: product.recommendReason,
    })
  }
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
  fromAssessment.value = options?.fromAssessment === '1'
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
    transition: all var(--duration-normal) var(--easing-ease-in-out);

    &.expanded {
      // 已展开状态
    }
  }

  &__head-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  &__head-content {
    margin-top: 28rpx;
    animation: fadeIn var(--duration-normal) var(--easing-ease-in-out);
  }

  &__eyebrow {
    display: block;
    color: var(--color-primary);
    font-size: 23rpx;
    font-weight: 700;
    line-height: 32rpx;
    margin-bottom: 8rpx;
    text-transform: uppercase;
    letter-spacing: 0.5px;
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

  &__tags-group {
    margin-top: 24rpx;

    .products__tags-label {
      display: block;
      font-size: 22rpx;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: 12rpx;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  &__tag {
    padding: 10rpx 20rpx;
    border-radius: 28rpx;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 24rpx;
    font-weight: 600;
    animation: slideUp var(--duration-normal) var(--easing-ease-out);
  }

  &__profile {
    display: inline-flex;
    margin-top: 24rpx;
    padding: 14rpx 24rpx;
    border-radius: 30rpx;
    background: var(--color-info);
    color: #fff;
    font-size: 24rpx;
    font-weight: 600;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      opacity: 0.9;
      transform: scale(0.98);
    }
  }

  &__assessment {
    margin-top: 24rpx;
    padding: 22rpx;
    border-radius: var(--radius-lg);
    background: var(--color-bg-white);
    box-shadow: var(--shadow-sm);
    animation: slideUp var(--duration-normal) var(--easing-ease-out);

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12rpx;
    }

    &-title {
      display: block;
      color: var(--color-text);
      font-size: 26rpx;
      font-weight: 600;
    }

    &-summary {
      display: block;
      color: var(--color-text-secondary);
      font-size: 24rpx;
      line-height: 1.55;
    }

    &-actions {
      display: flex;
      gap: 16rpx;
    }

    &-link {
      color: var(--color-primary);
      font-size: 22rpx;
      font-weight: 600;
      padding: 6rpx 12rpx;
      border-radius: 16rpx;
      transition: all var(--duration-fast) ease-in-out;

      &:active {
        background: var(--color-primary-light);
      }
    }
  }

  &__assessment-entry {
    display: inline-flex;
    margin-top: 24rpx;
    padding: 14rpx 28rpx;
    border-radius: 30rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 24rpx;
    font-weight: 700;
    transition: all var(--duration-fast) ease-in-out;
    animation: slideUp var(--duration-normal) var(--easing-ease-out);

    &:active {
      transform: scale(0.98);
      box-shadow: var(--shadow-action);
    }
  }

  &__meta {
    display: flex;
    gap: 18rpx;
    margin-top: 20rpx;
    padding: 16rpx 0;
    border-top: 1rpx solid var(--color-border);
    border-bottom: 1rpx solid var(--color-border);
    color: var(--color-text-tertiary);
    font-size: 23rpx;
  }

  &__filters {
    margin-top: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__filter-group {
    animation: slideUp var(--duration-normal) var(--easing-ease-out);
  }

  &__filter-label {
    display: block;
    font-size: 22rpx;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 12rpx;
  }

  &__type-tabs {
    display: flex;
    gap: 12rpx;
    overflow-x: auto;
    padding-bottom: 8rpx;
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
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.96);
    }

    &.active {
      color: #fff;
      background: var(--color-primary);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-action);
    }
  }

  &__scenes {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  &__scene {
    padding: 10rpx 20rpx;
    border-radius: 28rpx;
    background: var(--color-bg-gray);
    color: var(--color-text-secondary);
    font-size: 24rpx;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.96);
    }

    &.active {
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-weight: 700;
    }
  }

  &__list {
    padding: 24rpx 28rpx 0;
    animation: fadeIn var(--duration-normal) var(--easing-ease-in-out);
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    padding: 120rpx 32rpx;
    text-align: center;

    &--loading {
      color: var(--color-text-tertiary);
      font-size: 28rpx;
    }

    &--error {
      color: var(--color-text-tertiary);
    }

    &--empty {
      color: var(--color-text-tertiary);
    }
  }

  &__skeleton {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  &__skeleton-item {
    height: 240rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    border-radius: var(--radius-xl);
    animation: loading 1.5s infinite;
  }

  &__error-title {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--color-text);
  }

  &__error-text {
    font-size: 24rpx;
    color: var(--color-text-secondary);
  }

  &__retry {
    padding: 14rpx 32rpx;
    border-radius: 32rpx;
    color: #fff;
    background: var(--color-primary);
    font-size: 26rpx;
    font-weight: 600;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.98);
      box-shadow: var(--shadow-action);
    }
  }

  &__empty-title {
    font-size: 32rpx;
    font-weight: 700;
    color: var(--color-text);
  }

  &__empty-text {
    font-size: 24rpx;
    color: var(--color-text-secondary);
  }

  &__empty-actions {
    display: flex;
    gap: 16rpx;
    margin-top: 16rpx;
  }

  &__empty-action {
    padding: 12rpx 28rpx;
    border-radius: 28rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 24rpx;
    font-weight: 600;
    transition: all var(--duration-fast) ease-in-out;

    &:active {
      transform: scale(0.96);
    }
  }
}

.product-card {
  margin-bottom: 22rpx;
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all var(--duration-fast) ease-in-out;
  animation: slideUp var(--duration-normal) var(--easing-ease-out);
  animation-delay: var(--animation-delay, 0ms);
  transform-origin: bottom center;

  &:active {
    transform: translateY(-4rpx);
    box-shadow: var(--shadow-lg);
  }

  &__cover {
    width: 100%;
    height: 292rpx;
    background: #e9eef3;
    overflow: hidden;

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
    font-weight: 700;
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
    transition: all var(--duration-fast) ease-in-out;

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
    color: var(--color-primary);
    font-size: 23rpx;
    line-height: 1.45;
    font-weight: 600;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
