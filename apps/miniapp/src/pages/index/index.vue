<template>
  <view class="index">

    <!-- Banner -->
    <swiper class="index__banner" :indicator-dots="false" autoplay circular interval="4500">
      <swiper-item v-for="(item, i) in banners" :key="i">
        <view class="index__banner-item" :style="{ background: item.gradient || '#f5f5f7' }">
          <image v-if="item.imageUrl" :src="item.imageUrl" class="index__banner-bg" mode="aspectFill" />
          <view v-if="!item.imageUrl" class="index__banner-content">
            <text class="index__banner-title">{{ item.title }}</text>
            <text class="index__banner-desc">{{ item.description }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <view v-if="isLogin" class="index__overview">
      <view class="index__overview-main">
        <image :src="userStore.avatarUrl" class="index__overview-avatar" mode="aspectFill" />
        <view class="index__overview-info">
          <text class="index__overview-name">{{ userStore.displayName }}</text>
          <text class="index__overview-desc">{{ overviewText }}</text>
        </view>
      </view>
      <view class="index__overview-actions">
        <view class="index__overview-action" @tap="chooseAssessment">选择评估</view>
        <view class="index__overview-action index__overview-action--ghost" @tap="goLeadList">我的咨询</view>
      </view>
    </view>

    <view v-if="!isLogin" class="index__cta">
      <text class="index__cta-title">心悦部落</text>
      <text class="index__cta-sub">先了解你的需求，再推荐合适的服务</text>
      <view class="index__cta-actions">
        <view class="index__cta-btn" @tap="showAuthPopup = true">立即入会</view>
        <view class="index__cta-btn index__cta-btn--ghost" @tap="chooseAssessment">选择评估</view>
      </view>
    </view>

    <view class="index__section">
      <view class="index__section-head">
        <text class="index__section-title">需求评估</text>
        <text class="index__section-more">{{ assessmentCount }}/{{ productModules.length }} 已完成</text>
      </view>
      <view class="index__modules">
        <view
          v-for="item in productModules"
          :key="item.code"
          class="index__module"
          @tap="goProductModule(item)"
        >
          <image v-if="item.coverUrl" :src="item.coverUrl" class="index__module-bg" mode="aspectFill" />
          <view class="index__module-head">
            <text class="index__module-icon">{{ item.icon || item.name.slice(0, 2) }}</text>
            <text class="index__module-status" :class="{ done: hasAssessment(item.code) }">
              {{ hasAssessment(item.code) ? '已评估' : '待评估' }}
            </text>
          </view>
          <text class="index__module-title">{{ item.name }}</text>
          <text class="index__module-desc">{{ item.description || `${item.name}类服务推荐` }}</text>
        </view>
      </view>
    </view>

    <view v-if="isLogin && recentLead" class="index__section">
      <view class="index__section-head">
        <text class="index__section-title">咨询进展</text>
        <text class="index__section-more" @tap="goLeadList">全部</text>
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
      <view class="index__section-head">
        <text class="index__section-title">为你推荐</text>
        <text v-if="recommendedProducts.length" class="index__section-more" @tap="goProducts">查看全部</text>
      </view>
      <view v-if="recommendLoading" class="index__recommend-state">
        <text>正在匹配推荐</text>
      </view>
      <view v-else-if="recommendError" class="index__recommend-state">
        <text>推荐加载失败</text>
        <view class="index__recommend-retry" @tap="loadRecommendedProducts">重试</view>
      </view>
      <view v-else-if="recommendedProducts.length" class="index__recommend">
        <view
          v-for="item in recommendedProducts"
          :key="item.id"
          class="index__recommend-item"
          @tap="goProductDetail(item.id)"
        >
          <image v-if="item.coverUrl" :src="item.coverUrl" class="index__recommend-cover" mode="aspectFill" />
          <view v-else class="index__recommend-cover index__recommend-cover--empty">
            <text>{{ item.module.name }}</text>
          </view>
          <view class="index__recommend-main">
            <view class="index__recommend-head">
              <text class="index__recommend-module">{{ item.module.name }}</text>
              <text v-if="item.priceText" class="index__recommend-price">{{ item.priceText }}</text>
            </view>
            <text class="index__recommend-title">{{ item.title }}</text>
            <text class="index__recommend-desc">{{ item.summary || item.subtitle }}</text>
            <view v-if="item.matchedTags.length" class="index__recommend-tags">
              <text v-for="tag in item.matchedTags.slice(0, 2)" :key="tag" class="index__recommend-tag">{{ tag }}</text>
            </view>
            <text class="index__recommend-reason">{{ item.recommendReason }}</text>
          </view>
        </view>
      </view>
      <view v-else class="index__recommend-state">
        <text>暂无推荐产品</text>
      </view>
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
import { useFreshUserInfo } from '@/composables/useFreshUserInfo'
import { useHealthAssessment } from '@/composables/useHealthAssessment'
import { useAssessmentSync } from '@/composables/useAssessmentSync'
import { storage } from '@/utils/storage'
import AuthPopup from '@/components/business/AuthPopup.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const isLogin = computed(() => authStore.isLogin)
const banners = ref<Banner[]>([])
const productModules = ref<ProductModule[]>([])
const recommendedProducts = ref<Product[]>([])
const recentLead = ref<ProductLead | null>(null)
const assessmentMap = ref<Record<string, boolean>>({})
const recommendLoading = ref(false)
const recommendError = ref(false)
const showAuthPopup = ref(false)
const { refreshUserInfo } = useFreshUserInfo()
const { getAssessment } = useHealthAssessment()
const { syncLocalAssessments } = useAssessmentSync()

const assessmentCount = computed(() => Object.values(assessmentMap.value).filter(Boolean).length)
const overviewText = computed(() => {
  if (recentLead.value) return `${leadStatusText(recentLead.value.status)}：${recentLead.value.product.title}`
  if (assessmentCount.value > 0) return `已完成 ${assessmentCount.value} 个需求评估`
  return '先完成评估，推荐会更精准'
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
    recommendedProducts.value = await productApi.recommended({
      moduleCode,
      tags: [...new Set([...(user?.tags || []), ...(assessment?.tags || [])])],
      limit: 3,
    })
  } catch {
    recommendedProducts.value = []
    recommendError.value = true
  } finally {
    recommendLoading.value = false
  }
}

const goProducts = () => {
  const moduleCode = productModules.value[0]?.code || 'health'
  uni.navigateTo({ url: `/pages/products/index?moduleCode=${moduleCode}` })
}
const goProductDetail = (id: number) => uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
const goLeadList = () => uni.navigateTo({ url: '/pages/profile/product-leads' })
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
  loadRecentLead()
})
</script>

<style lang="scss" scoped>
.index {
  min-height: 100vh;
  background: #f9f9f9;
  padding-bottom: 80rpx;

  // ── Banner ──────────────────────────
  &__banner {
    height: 400rpx;
    &-item {
      position: relative;
      height: 100%;
    }
    &-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    &-content {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 40rpx 48rpx;
      background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%);
    }
    &-title {
      display: block;
      font-size: 44rpx;
      font-weight: 600;
      color: #fff;
      margin-bottom: 8rpx;
    }
    &-desc {
      font-size: 26rpx;
      color: rgba(255,255,255,0.85);
    }
  }

  &__overview {
    margin: 28rpx 32rpx 32rpx;
    padding: 30rpx;
    background: #fff;
    border-radius: 16rpx;
    &-main {
      display: flex;
      align-items: center;
      gap: 22rpx;
    }
    &-avatar {
      width: 88rpx;
      height: 88rpx;
      border-radius: 50%;
      background: #e9eef3;
      flex-shrink: 0;
    }
    &-info {
      flex: 1;
      min-width: 0;
    }
    &-name {
      display: block;
      font-size: 32rpx;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.35;
    }
    &-desc {
      display: block;
      margin-top: 8rpx;
      color: #667085;
      font-size: 24rpx;
      line-height: 1.45;
    }
    &-actions {
      display: flex;
      gap: 16rpx;
      margin-top: 26rpx;
    }
    &-action {
      flex: 1;
      height: 72rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 36rpx;
      background: var(--color-primary);
      color: #fff;
      font-size: 26rpx;
      font-weight: 600;
      &--ghost {
        background: #f2f4f7;
        color: #475467;
      }
    }
  }

  &__lead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20rpx;
    padding: 28rpx;
    background: #fff;
    border-radius: 16rpx;
    &-title {
      display: block;
      color: #1f2937;
      font-size: 30rpx;
      font-weight: 600;
      line-height: 1.35;
    }
    &-desc {
      display: block;
      margin-top: 8rpx;
      color: #667085;
      font-size: 24rpx;
      line-height: 1.45;
    }
    &-time {
      display: block;
      margin-top: 10rpx;
      color: #98a2b3;
      font-size: 22rpx;
    }
    &-status {
      flex-shrink: 0;
      padding: 8rpx 16rpx;
      border-radius: 24rpx;
      background: rgba(7, 193, 96, 0.1);
      color: var(--color-primary);
      font-size: 22rpx;
      font-weight: 600;
    }
  }

  // ── CTA ──────────────────────────────
  &__cta {
    margin: 32rpx;
    padding: 56rpx 40rpx;
    background: #fff;
    border-radius: 16rpx;
    &-title {
      display: block;
      font-size: 48rpx;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 12rpx;
    }
    &-sub {
      display: block;
      font-size: 26rpx;
      color: #999;
      margin-bottom: 34rpx;
    }
    &-actions {
      display: flex;
      gap: 16rpx;
    }
    &-btn {
      flex: 1;
      height: 76rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: #fff;
      font-size: 28rpx;
      font-weight: 500;
      border-radius: 60rpx;
      &--ghost {
        background: #f2f4f7;
        color: #475467;
      }
    }
  }

  // ── Section ──────────────────────────
  &__section {
    margin: 0 32rpx 32rpx;
    &-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20rpx;
    }
    &-title {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 20rpx;
    }
    &-head &-title { margin-bottom: 0; }
    &-more {
      font-size: 24rpx;
      color: var(--color-primary);
    }
  }

  &__modules {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  &__module {
    position: relative;
    width: calc((100% - 16rpx) / 2);
    min-height: 190rpx;
    padding: 24rpx;
    background: #fff;
    border-radius: 16rpx;
    box-sizing: border-box;
    overflow: hidden;
    &-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: .22;
    }
    &-head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18rpx;
    }
    &-icon {
      color: #1f2937;
      font-size: 30rpx;
      font-weight: 700;
    }
    &-status {
      padding: 5rpx 12rpx;
      border-radius: 20rpx;
      background: #f2f4f7;
      color: #98a2b3;
      font-size: 20rpx;
      &.done {
        background: rgba(7, 193, 96, 0.1);
        color: var(--color-primary);
      }
    }
    &-title {
      position: relative;
      display: block;
      color: #1f2937;
      font-size: 30rpx;
      font-weight: 600;
      line-height: 1.35;
    }
    &-desc {
      position: relative;
      display: block;
      margin-top: 8rpx;
      color: #667085;
      font-size: 23rpx;
      line-height: 1.45;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  &__recommend {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
    &-item {
      display: flex;
      align-items: flex-start;
      gap: 18rpx;
      padding: 28rpx;
      border-bottom: 1rpx solid #f0f0f0;
      &:last-child { border-bottom: none; }
    }
    &-cover {
      width: 116rpx;
      height: 92rpx;
      border-radius: 10rpx;
      background: #e9eef3;
      flex-shrink: 0;
      &--empty {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667085;
        font-size: 22rpx;
      }
    }
    &-main { flex: 1; min-width: 0; }
    &-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14rpx;
      margin-bottom: 8rpx;
    }
    &-module {
      color: var(--color-primary);
      font-size: 22rpx;
      font-weight: 600;
    }
    &-title {
      display: block;
      font-size: 30rpx;
      font-weight: 600;
      color: #1a1a1a;
      line-height: 1.35;
    }
    &-desc {
      display: block;
      margin-top: 8rpx;
      font-size: 24rpx;
      color: #666;
      line-height: 1.45;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    &-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8rpx;
      margin-top: 12rpx;
    }
    &-tag {
      padding: 5rpx 12rpx;
      border-radius: 18rpx;
      background: rgba(7, 193, 96, 0.08);
      color: var(--color-primary);
      font-size: 20rpx;
    }
    &-reason {
      display: block;
      margin-top: 10rpx;
      font-size: 22rpx;
      color: #999;
    }
    &-price {
      flex-shrink: 0;
      font-size: 24rpx;
      color: #f97316;
      font-weight: 600;
    }
  }
  &__recommend-state {
    min-height: 128rpx;
    background: #fff;
    border-radius: 16rpx;
    color: #999;
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
  }
  &__recommend-retry {
    padding: 8rpx 20rpx;
    border-radius: 24rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 22rpx;
  }
}
</style>
