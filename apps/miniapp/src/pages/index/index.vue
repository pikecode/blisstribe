<template>
  <view class="index">
    <view class="index__hero">
      <swiper v-if="banners.length" class="index__banner" :indicator-dots="false" autoplay circular interval="4500">
        <swiper-item v-for="(item, i) in banners" :key="i">
          <view class="index__banner-item" :style="{ background: item.gradient || '#f5f5f7' }">
            <image v-if="item.imageUrl" :src="item.imageUrl" class="index__banner-bg" mode="aspectFill" />
          </view>
        </swiper-item>
      </swiper>
      <view v-else class="index__banner index__banner--fallback" />

      <view class="index__hero-content">
        <view class="index__hero-kicker">{{ isLogin ? '你的服务推荐' : 'BlissTribe 心悦部落' }}</view>
        <text class="index__hero-title">{{ isLogin ? userStore.displayName : '先了解需求，再推荐合适服务' }}</text>
        <text class="index__hero-desc">{{ heroDesc }}</text>
        <view class="index__hero-actions">
          <view class="index__hero-btn" @tap="chooseAssessment">先做评估</view>
          <view class="index__hero-btn index__hero-btn--ghost" @tap="isLogin ? goLeadList() : showAuthPopup = true">
            {{ isLogin ? '咨询进展' : '登录同步' }}
          </view>
        </view>
      </view>
    </view>

    <view class="index__section">
      <view class="app-section-head">
        <view>
          <text class="app-section-title">需求评估</text>
          <text class="app-section-desc">按模块梳理需求，再生成推荐</text>
        </view>
        <text class="app-link-text">{{ assessmentCount }}/{{ productModules.length }} 已完成</text>
      </view>
      <ModuleAssessmentList :items="moduleAssessmentItems" @module-tap="handleModuleTap" />
    </view>

    <view v-if="isLogin && recentLead" class="index__section">
      <view class="app-section-head">
        <view>
          <text class="app-section-title">咨询进展</text>
          <text class="app-section-desc">最近一次服务跟进</text>
        </view>
        <text class="app-link-text" @tap="goLeadList">全部</text>
      </view>
      <view class="index__lead" @tap="goLeadList">
        <view>
          <text class="index__lead-title">{{ recentLead.product.title }}</text>
          <text class="index__lead-desc">{{ recentLead.followUpNote || '需求已提交，等待服务跟进' }}</text>
          <text v-if="recentLead.nextFollowAt" class="index__lead-time">下次跟进：{{ formatDate(recentLead.nextFollowAt) }}</text>
        </view>
        <text class="index__lead-status">{{ leadStatusText(recentLead.status) }}</text>
      </view>
    </view>

    <view class="index__section">
      <view class="app-section-head">
        <view>
          <text class="app-section-title">为你推荐</text>
          <text class="app-section-desc">优先展示和你标签匹配的服务</text>
        </view>
        <text v-if="recommendedProducts.length" class="app-link-text" @tap="goProducts">查看全部</text>
      </view>
      <ProductRecommendList
        :products="recommendedProducts"
        :loading="recommendLoading"
        :error="recommendError"
        @retry="loadRecommendedProducts"
        @product-tap="goProductDetail"
      />
    </view>

    <view class="index__section">
      <view class="app-section-head">
        <view>
          <text class="app-section-title">近期活动</text>
          <text class="app-section-desc">先参与活动，再了解合适服务</text>
        </view>
        <text class="app-link-text" @tap="goActivities">全部活动</text>
      </view>
      <view v-if="activityLoading" class="index__activity-state">活动加载中</view>
      <view v-else-if="recommendedActivities.length" class="index__activity-list">
        <view v-for="item in recommendedActivities" :key="item.id" class="index__activity" @tap="goActivityDetail(item.id)">
          <image v-if="item.coverUrl" :src="item.coverUrl" class="index__activity-cover" mode="aspectFill" />
          <view class="index__activity-main">
            <view class="index__activity-top">
              <text>{{ item.module.name }}</text>
              <text>{{ activityDisplayRegistrationText(item) }}</text>
            </view>
            <text class="index__activity-title">{{ item.title }}</text>
            <text class="index__activity-desc">{{ formatDate(item.startAt) }} · {{ item.locationText || '线上参与' }}</text>
          </view>
        </view>
      </view>
      <view v-else class="index__activity-state">暂无可报名活动</view>
    </view>

  </view>

  <AuthPopup :visible="showAuthPopup" @close="showAuthPopup = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { bannerApi, type Banner } from '@/api/modules/banner'
import { productApi, type Product, type ProductLead, type ProductModule } from '@/api/modules/product'
import { activityApi, activityDisplayRegistrationText, type Activity } from '@/api/modules/activity'
import { useFreshUserInfo } from '@/composables/useFreshUserInfo'
import { useHealthAssessment } from '@/composables/useHealthAssessment'
import { useAssessmentSync } from '@/composables/useAssessmentSync'
import { storage } from '@/utils/storage'
import { reportProductEvent, reportProductImpressions } from '@/utils/analytics'
import AuthPopup from '@/components/business/AuthPopup.vue'
import ModuleAssessmentList from '@/components/business/ModuleAssessmentList.vue'
import ProductRecommendList from '@/components/business/ProductRecommendList.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const isLogin = computed(() => authStore.isLogin)
const banners = ref<Banner[]>([])
const productModules = ref<ProductModule[]>([])
const recommendedProducts = ref<Product[]>([])
const recommendedActivities = ref<Activity[]>([])
const recentLead = ref<ProductLead | null>(null)
const assessmentMap = ref<Record<string, boolean>>({})
const recommendLoading = ref(false)
const recommendError = ref(false)
const activityLoading = ref(false)
const showAuthPopup = ref(false)
const homeRecommendationForm = ref<'module_featured' | 'assessment_result' | 'profile_suggestion'>('module_featured')
const { refreshUserInfo } = useFreshUserInfo()
const { getAssessment } = useHealthAssessment()
const { syncLocalAssessments } = useAssessmentSync()

const assessmentCount = computed(() => Object.values(assessmentMap.value).filter(Boolean).length)
const moduleAssessmentItems = computed(() => productModules.value.map((item) => ({
  code: item.code,
  name: item.name,
  description: item.description,
  coverUrl: item.coverUrl,
  icon: item.icon,
  done: hasAssessment(item.code),
})))
const overviewText = computed(() => {
  if (recentLead.value) return `${leadStatusText(recentLead.value.status)}：${recentLead.value.product.title}`
  if (assessmentCount.value > 0) return `已完成 ${assessmentCount.value} 个需求评估`
  return '先完成评估，推荐会更精准'
})
const heroDesc = computed(() => {
  if (recentLead.value) return overviewText.value
  if (assessmentCount.value > 0) return `已完成 ${assessmentCount.value} 个评估，继续查看更匹配的服务。`
  return '用几个问题缩小选择范围，减少无效浏览和反复沟通。'
})

async function loadBanners() {
  try {
    banners.value = await bannerApi.list()
  } catch {
    // 接口失败保持空列表
  }
}

async function loadProductModules() {
  try {
    productModules.value = await productApi.modules()
    refreshAssessmentMap()
  } catch {
    productModules.value = []
    assessmentMap.value = {}
  }
}

async function loadRecentLead() {
  if (!isLogin.value) {
    recentLead.value = null
    return
  }
  try {
    const res = await productApi.myLeads({ page: 1, pageSize: 1 })
    recentLead.value = res.list[0] || null
  } catch {
    recentLead.value = null
  }
}

async function loadRecommendedProducts() {
  recommendLoading.value = true
  recommendError.value = false
  try {
    const user = await refreshUserInfo()
    const moduleCode = productModules.value[0]?.code || 'health'
    const module = productModules.value.find((item) => item.code === moduleCode)
    const assessment = module?.assessmentEnabled ? getAssessment(moduleCode) : null
    homeRecommendationForm.value = assessment
      ? 'assessment_result'
      : user?.tags?.length || user?.tagIds?.length
        ? 'profile_suggestion'
        : 'module_featured'
    recommendedProducts.value = await productApi.recommended({
      moduleCode,
      tags: [...new Set([...(user?.tags || []), ...(assessment?.tags || [])])],
      tagIds: [...new Set([...(user?.tagIds || []), ...(assessment?.tagIds || [])])],
      limit: 3,
    })
    reportProductImpressions(recommendedProducts.value, {
      recommendationForm: homeRecommendationForm.value,
      sourceScene: 'miniapp_home_recommend',
      moduleCode,
      limit: 3,
    })
  } catch {
    recommendedProducts.value = []
    recommendError.value = true
  } finally {
    recommendLoading.value = false
  }
}

async function loadRecommendedActivities() {
  activityLoading.value = true
  try {
    const moduleCode = productModules.value[0]?.code || undefined
    recommendedActivities.value = await activityApi.recommended({ moduleCode, limit: 3 })
  } catch {
    recommendedActivities.value = []
  } finally {
    activityLoading.value = false
  }
}

const goProducts = () => {
  const moduleCode = productModules.value[0]?.code || 'health'
  uni.navigateTo({ url: `/pages/products/index?moduleCode=${moduleCode}` })
}
const goProductDetail = (id: number) => {
  const product = recommendedProducts.value.find((item) => item.id === id)
  if (product) {
    reportProductEvent({
      eventType: 'click',
      productId: product.id,
      moduleId: product.module?.id,
      moduleCode: product.module?.code,
      productType: product.productType,
      recommendationForm: homeRecommendationForm.value,
      sourceScene: 'miniapp_home_recommend',
      tags: product.matchedTags?.length ? product.matchedTags : product.tags,
      tagIds: product.matchedTagIds || product.tagIds || [],
      score: product.score,
      reason: product.recommendReason,
    })
  }
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}
const goLeadList = () => uni.navigateTo({ url: '/pages/profile/product-leads' })
const goActivities = () => {
  const moduleCode = productModules.value[0]?.code
  uni.navigateTo({ url: `/pages/activities/index${moduleCode ? `?moduleCode=${moduleCode}` : ''}` })
}
const goActivityDetail = (id: number) => uni.navigateTo({ url: `/pages/activities/detail?id=${id}` })
const chooseAssessment = () => {
  const modules = productModules.value.filter((item) => item.assessmentEnabled && item.assessmentType)
  if (modules.length === 0) {
    uni.showToast({ title: '暂无可用评估', icon: 'none' })
    return
  }
  if (modules.length === 1) {
    goProductModule(modules[0])
    return
  }
  uni.showActionSheet({
    itemList: modules.map((item) => `${item.name}需求评估`),
    success: (res) => {
      const module = modules[res.tapIndex]
      if (module) goProductModule(module)
    },
  })
}
const goProductModule = (item: ProductModule) => {
  if (item.assessmentEnabled && item.assessmentType) {
    uni.navigateTo({ url: `/pages/products/assessment?moduleCode=${item.code}` })
    return
  }
  uni.navigateTo({ url: `/pages/products/index?moduleCode=${item.code}` })
}
const handleModuleTap = (code: string) => {
  const module = productModules.value.find((item) => item.code === code)
  if (module) goProductModule(module)
}
const goEditProfile = () => {
  if (!isLogin.value) {
    showAuthPopup.value = true
    return
  }
  uni.navigateTo({ url: '/pages/profile/edit' })
}

function refreshAssessmentMap() {
  assessmentMap.value = productModules.value.reduce<Record<string, boolean>>((map, item) => {
    map[item.code] = !!getAssessment(item.code)
    return map
  }, {})
}

function hasAssessment(moduleCode: string) {
  return !!assessmentMap.value[moduleCode]
}

function leadStatusText(status: string) {
  const map: Record<string, string> = {
    new: '已提交',
    contacted: '已联系',
    qualified: '有效线索',
    converted: '已转化',
    invalid: '已关闭',
  }
  return map[status] || status
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onLoad((options) => {
  const code = options?.inviteCode || options?.code
  if (code) storage.set('pendingInviteCode', String(code).toUpperCase(), { expireSeconds: 24 * 3600 })
})

onShow(async () => {
  loadBanners()
  await loadProductModules()
  syncLocalAssessments()
  loadRecommendedProducts()
  loadRecommendedActivities()
  loadRecentLead()
})
</script>

<style lang="scss" scoped>
.index {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 84rpx;

  &__hero {
    position: relative;
    min-height: 430rpx;
    margin-bottom: 34rpx;
    overflow: hidden;
    background: #122017;
  }

  &__banner {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    &--fallback {
      background: linear-gradient(135deg, #173824 0%, #335f43 58%, #8aa174 100%);
    }

    &-item {
      position: relative;
      height: 100%;
    }

    &-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: .62;
    }
  }

  &__hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(12, 26, 18, .16) 0%, rgba(12, 26, 18, .76) 100%);
  }

  &__hero-content {
    position: relative;
    z-index: 1;
    padding: 150rpx 32rpx 34rpx;
  }

  &__hero-kicker {
    display: inline-flex;
    padding: 8rpx 16rpx;
    border-radius: var(--radius-round);
    background: rgba(255, 255, 255, .16);
    color: rgba(255, 255, 255, .88);
    font-size: 22rpx;
    line-height: 30rpx;
  }

  &__hero-title {
    display: block;
    max-width: 620rpx;
    margin-top: 18rpx;
    color: #fff;
    font-size: var(--font-size-hero);
    font-weight: 800;
    line-height: 1.18;
  }

  &__hero-desc {
    display: block;
    max-width: 610rpx;
    margin-top: 14rpx;
    color: rgba(255, 255, 255, .86);
    font-size: 25rpx;
    line-height: 1.52;
  }

  &__hero-actions {
    display: flex;
    gap: 16rpx;
    margin-top: 28rpx;
  }

  &__hero-btn {
    min-width: 188rpx;
    height: 76rpx;
    padding: 0 28rpx;
    border-radius: 38rpx;
    background: #fff;
    color: #0f3a24;
    font-size: 27rpx;
    font-weight: 700;
    line-height: 76rpx;
    text-align: center;

    &--ghost {
      background: rgba(255, 255, 255, .14);
      color: #fff;
      border: 1rpx solid rgba(255, 255, 255, .34);
    }
  }

  &__lead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20rpx;
    padding: 26rpx;
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    &-title {
      display: block;
      color: var(--color-text);
      font-size: 30rpx;
      font-weight: 600;
      line-height: 1.35;
    }
    &-desc {
      display: block;
      margin-top: 8rpx;
      color: var(--color-text-secondary);
      font-size: 24rpx;
      line-height: 1.45;
    }
    &-time {
      display: block;
      margin-top: 10rpx;
      color: var(--color-text-tertiary);
      font-size: 22rpx;
    }
    &-status {
      flex-shrink: 0;
      padding: 8rpx 16rpx;
      border-radius: 24rpx;
      background: var(--color-primary-light);
      color: var(--color-primary);
      font-size: 22rpx;
      font-weight: 600;
    }
  }

  &__section {
    margin: 0 28rpx 34rpx;
  }

  &__activity-list {
    display: flex;
    flex-direction: column;
    gap: 18rpx;
  }

  &__activity,
  &__activity-state {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  &__activity {
    display: flex;
    gap: 18rpx;
    padding: 20rpx;
  }

  &__activity-cover {
    width: 136rpx;
    height: 104rpx;
    border-radius: 14rpx;
    background: #eef2f1;
    flex: 0 0 auto;
  }

  &__activity-main {
    flex: 1;
    min-width: 0;
  }

  &__activity-top {
    display: flex;
    justify-content: space-between;
    gap: 12rpx;
    color: var(--color-primary);
    font-size: 22rpx;
    font-weight: 700;
    line-height: 30rpx;
  }

  &__activity-title {
    display: block;
    margin-top: 8rpx;
    color: var(--color-text);
    font-size: 28rpx;
    font-weight: 800;
    line-height: 38rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__activity-desc {
    display: block;
    margin-top: 6rpx;
    color: var(--color-text-secondary);
    font-size: 23rpx;
    line-height: 32rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__activity-state {
    padding: 32rpx 24rpx;
    color: var(--color-text-secondary);
    font-size: 25rpx;
    text-align: center;
  }
}
</style>
