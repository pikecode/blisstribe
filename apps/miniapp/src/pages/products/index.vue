<template>
  <view class="products">
    <view class="products__head">
      <text class="products__title">专属{{ currentModule?.name || '服务' }}推荐</text>
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
import { productApi, type Product, type ProductModule } from '@/api/modules/product'
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
  background: #f6f7f8;
  padding-bottom: 48rpx;

  &__head {
    padding: 40rpx 32rpx 28rpx;
    background: #fff;
  }
  &__title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8rpx;
  }
  &__subtitle {
    display: block;
    font-size: 26rpx;
    color: #667085;
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
    background: rgba(7, 193, 96, 0.08);
    color: var(--color-primary);
    font-size: 24rpx;
  }
  &__profile {
    display: inline-flex;
    margin-top: 24rpx;
  }
  &__assessment {
    margin-top: 24rpx;
    padding: 22rpx;
    border-radius: 16rpx;
    background: #f9fafb;
    &-title {
      display: block;
      color: #1f2937;
      font-size: 26rpx;
      font-weight: 600;
      margin-bottom: 8rpx;
    }
    &-summary {
      display: block;
      color: #667085;
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
    background: #f2f4f7;
    color: #667085;
    font-size: 24rpx;
    &.active {
      background: rgba(7, 193, 96, 0.12);
      color: var(--color-primary);
    }
  }
  &__list {
    padding: 24rpx 24rpx 0;
  }
  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
    padding: 120rpx 32rpx;
    color: #98a2b3;
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
    color: #98a2b3;
    font-size: 28rpx;
  }
}

.product-card {
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;

  &__cover {
    width: 100%;
    height: 280rpx;
    background: #e9eef3;
    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #667085;
      font-size: 30rpx;
    }
  }
  &__body {
    padding: 24rpx;
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
    color: #1f2937;
    line-height: 1.35;
  }
  &__price {
    flex-shrink: 0;
    color: #f97316;
    font-size: 26rpx;
    font-weight: 600;
  }
  &__summary {
    display: block;
    color: #667085;
    font-size: 26rpx;
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
    background: #f2f4f7;
    color: #667085;
    font-size: 22rpx;
    &.matched {
      background: rgba(7, 193, 96, 0.1);
      color: var(--color-primary);
    }
  }
  &__reason {
    display: block;
    color: #98a2b3;
    font-size: 22rpx;
  }
}
</style>
