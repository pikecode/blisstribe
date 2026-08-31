<template>
  <view class="profile">
    <view v-if="isLogin" class="profile__hero">
      <view class="profile__avatar">
        <image :src="userStore.avatarUrl" class="profile__avatar-img" mode="aspectFill" />
      </view>
      <view class="profile__identity">
        <view class="profile__name-row">
          <text class="profile__name">{{ userStore.displayName }}</text>
          <view class="profile__edit" @tap="goEdit">编辑</view>
        </view>
        <text class="profile__phone">{{ userStore.userInfo?.phone || '手机号未绑定' }}</text>
        <view class="profile__tags">
          <text v-for="tag in profileTags" :key="tag" class="profile__tag">{{ tag }}</text>
          <text v-if="!profileTags.length" class="profile__tag profile__tag--empty">完善标签后推荐更准确</text>
        </view>
      </view>
    </view>

    <view v-else class="profile__guest">
      <view>
        <text class="profile__guest-title">登录后查看你的推荐进度</text>
        <text class="profile__guest-desc">评估结果、咨询记录和个性化推荐会同步到账号。</text>
      </view>
      <view class="profile__guest-btn" @tap="showAuthPopup = true">去登录</view>
    </view>

    <view class="profile__panel profile__summary">
      <view class="profile__metric" @tap="chooseAssessment">
        <text class="profile__metric-value">{{ assessmentCount }}</text>
        <text class="profile__metric-label">已评估模块</text>
      </view>
      <view class="profile__metric" @tap="goProductLeads">
        <text class="profile__metric-value">{{ leadCountText }}</text>
        <text class="profile__metric-label">咨询记录</text>
      </view>
      <view class="profile__metric" @tap="goActivityRegistrations">
        <text class="profile__metric-value">{{ activityCountText }}</text>
        <text class="profile__metric-label">活动报名</text>
      </view>
    </view>

    <view class="profile__panel">
      <view class="profile__section-head">
        <view>
          <text class="profile__section-title">需求评估</text>
          <text class="profile__section-desc">按模块沉淀需求标签</text>
        </view>
        <view class="profile__section-action" @tap="chooseAssessment">去评估</view>
      </view>
      <ModuleAssessmentList
        v-if="assessmentItems.length"
        :items="assessmentItems"
        variant="list"
        @module-tap="handleModuleTap"
      />
      <view v-else class="profile__empty">暂无可评估模块</view>
    </view>

    <view class="profile__panel">
      <view class="profile__section-head">
        <view>
          <text class="profile__section-title">推荐产品</text>
          <text class="profile__section-desc">基于标签和评估结果匹配</text>
        </view>
        <view class="profile__section-action" @tap="goProducts">全部产品</view>
      </view>
      <ProductRecommendList
        :products="recommendedProducts"
        :loading="recommendLoading"
        :surface="false"
        empty-text="完成评估后会生成更准确的推荐"
        loading-text="加载中"
        @product-tap="goProductDetail"
      />
    </view>

    <view v-if="isLogin" class="profile__panel">
      <view class="profile__section-head">
        <view>
          <text class="profile__section-title">最近咨询</text>
          <text class="profile__section-desc">跟进状态和沟通记录</text>
        </view>
        <view class="profile__section-action" @tap="goProductLeads">全部</view>
      </view>
      <view v-if="recentLead" class="profile__lead" @tap="goProductDetail(recentLead.productId)">
        <view>
          <text class="profile__lead-title">{{ recentLead.product.title }}</text>
          <text class="profile__lead-date">{{ formatDate(recentLead.createdAt) }}</text>
        </view>
        <view class="profile__status profile__status--done">{{ leadStatusText(recentLead.status) }}</view>
      </view>
      <view v-else class="profile__empty">还没有咨询记录</view>
    </view>

    <view class="profile__panel profile__menu">
      <view class="profile__menu-item" @tap="goInvite">
        <view>
          <text class="profile__menu-title">邀请好友</text>
          <text class="profile__menu-desc">分享服务并沉淀关系</text>
        </view>
        <text class="profile__chevron">›</text>
      </view>
      <view class="profile__menu-item" @tap="goPartner">
        <view>
          <text class="profile__menu-title">{{ partnerEntryText }}</text>
          <text class="profile__menu-desc">服务伙伴、客户和邀请管理</text>
        </view>
        <text class="profile__chevron">›</text>
      </view>
      <view class="profile__menu-item" @tap="goEdit">
        <view>
          <text class="profile__menu-title">资料与标签</text>
          <text class="profile__menu-desc">维护画像信息，提升推荐质量</text>
        </view>
        <text class="profile__chevron">›</text>
      </view>
      <view class="profile__menu-item" @tap="goActivityRegistrations">
        <view>
          <text class="profile__menu-title">我的活动</text>
          <text class="profile__menu-desc">查看报名、确认和参与记录</text>
        </view>
        <text class="profile__chevron">›</text>
      </view>
    </view>

    <view v-if="isLogin" class="profile__actions">
      <view class="profile__btn profile__btn--default" @tap="handleLogout">
        <text class="profile__btn-title">退出登录</text>
        <text class="profile__btn-desc">仅清除当前设备登录状态，账号数据会保留</text>
      </view>
      <view class="profile__btn profile__btn--danger" @tap="handleDeactivate">
        <text class="profile__btn-title">注销账号</text>
        <text class="profile__btn-desc">永久停用账号并清除个人资料，操作后不可恢复</text>
      </view>
    </view>
  </view>

  <AuthPopup :visible="showAuthPopup" @close="showAuthPopup = false" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { useAuth } from '@/composables/useAuth'
import { useAssessmentSync } from '@/composables/useAssessmentSync'
import { useFreshUserInfo } from '@/composables/useFreshUserInfo'
import { useHealthAssessment, type HealthAssessment } from '@/composables/useHealthAssessment'
import { userApi } from '@/api/modules/user'
import {
  productApi,
  type Product,
  type ProductLead,
  type ProductModule,
  type UserAssessment,
} from '@/api/modules/product'
import { partnerApi } from '@/api/modules/partner'
import { activityApi } from '@/api/modules/activity'
import type { Partner } from '@blisstribe/shared'
import AuthPopup from '@/components/business/AuthPopup.vue'
import ModuleAssessmentList from '@/components/business/ModuleAssessmentList.vue'
import ProductRecommendList from '@/components/business/ProductRecommendList.vue'

interface AssessmentItem {
  code: string
  name: string
  description?: string
  coverUrl?: string
  icon?: string
  done: boolean
  summary?: string
}

const authStore = useAuthStore()
const userStore = useUserStore()
const { logout } = useAuth()
const { syncLocalAssessments } = useAssessmentSync()
const { refreshUserInfo } = useFreshUserInfo()
const { getAssessment } = useHealthAssessment()

const showAuthPopup = ref(false)
const modules = ref<ProductModule[]>([])
const remoteAssessments = ref<UserAssessment[]>([])
const recommendedProducts = ref<Product[]>([])
const recentLead = ref<ProductLead | null>(null)
const leadTotal = ref(0)
const activityTotal = ref(0)
const partner = ref<Partner | null>(null)
const recommendLoading = ref(false)

const isLogin = computed(() => authStore.isLogin)
const profileTags = computed(() => (userStore.userInfo?.tags || []).slice(0, 4))
const localAssessments = computed(() => modules.value
  .map((item) => getAssessment(item.code))
  .filter((item): item is HealthAssessment => !!item))

const assessmentCount = computed(() => {
  const codes = new Set<string>()
  localAssessments.value.forEach((item) => codes.add(item.moduleCode || 'health'))
  remoteAssessments.value.forEach((item) => codes.add(item.moduleCode))
  return codes.size
})

const leadCountText = computed(() => (leadTotal.value > 99 ? '99+' : String(leadTotal.value)))
const activityCountText = computed(() => (activityTotal.value > 99 ? '99+' : String(activityTotal.value)))

const partnerEntryText = computed(() => {
  if (!isLogin.value || !partner.value) return '申请成为服务伙伴'
  if (partner.value.status === 1) return 'B 端工作台'
  if (partner.value.status === 0) return '入驻审核中'
  if (partner.value.status === 2) return '修改入驻资料'
  return '服务伙伴资料'
})

const assessmentItems = computed<AssessmentItem[]>(() => modules.value
  .filter((item) => item.assessmentEnabled)
  .slice(0, 4)
  .map((module) => {
    const local = getAssessment(module.code)
    const remote = remoteAssessments.value.find((item) => item.moduleCode === module.code)
    const done = !!local || !!remote
    return {
      code: module.code,
      name: module.name,
      description: module.description,
      coverUrl: module.coverUrl,
      icon: module.icon,
      done,
      summary: local?.summary || remote?.summary || `${module.name}需求还未评估`,
    }
  }))

async function loadProfileData(): Promise<void> {
  try {
    modules.value = await productApi.modules()
  } catch {
    modules.value = []
  }

  if (!isLogin.value) {
    remoteAssessments.value = []
    recentLead.value = null
    leadTotal.value = 0
    activityTotal.value = 0
    partner.value = null
    await loadRecommendedProducts()
    return
  }

  await syncLocalAssessments(true)
  await refreshUserInfo()
  await Promise.all([loadAssessments(), loadLeads(), loadActivityRegistrations(), loadPartner()])
  await loadRecommendedProducts()
}

async function loadAssessments(): Promise<void> {
  try {
    remoteAssessments.value = await productApi.myAssessments()
  } catch {
    remoteAssessments.value = []
  }
}

async function loadLeads(): Promise<void> {
  try {
    const result = await productApi.myLeads({ page: 1, pageSize: 1 })
    recentLead.value = result.list[0] || null
    leadTotal.value = result.total
  } catch {
    recentLead.value = null
    leadTotal.value = 0
  }
}

async function loadActivityRegistrations(): Promise<void> {
  try {
    const result = await activityApi.myRegistrations({ page: 1, pageSize: 1 })
    activityTotal.value = result.total
  } catch {
    activityTotal.value = 0
  }
}

async function loadPartner(): Promise<void> {
  try {
    partner.value = await partnerApi.getMine()
  } catch {
    partner.value = null
  }
}

async function loadRecommendedProducts(): Promise<void> {
  recommendLoading.value = true
  try {
    const tags = collectRecommendationTags()
    const tagIds = collectRecommendationTagIds()
    recommendedProducts.value = await productApi.recommended({
      moduleCode: preferredModuleCode(),
      tags,
      tagIds,
      limit: 3,
    })
  } catch {
    recommendedProducts.value = []
  } finally {
    recommendLoading.value = false
  }
}

function collectRecommendationTags(): string[] {
  const tags = [
    ...(userStore.userInfo?.tags || []),
    ...localAssessments.value.flatMap((item) => item.tags || []),
    ...remoteAssessments.value.flatMap((item) => item.tags || []),
  ]
  return Array.from(new Set(tags.filter(Boolean)))
}

function collectRecommendationTagIds(): number[] {
  const tagIds = [
    ...(userStore.userInfo?.tagIds || []),
    ...localAssessments.value.flatMap((item) => item.tagIds || []),
    ...remoteAssessments.value.flatMap((item) => item.tagIds || []),
  ]
  return Array.from(new Set(tagIds.filter(Boolean)))
}

function preferredModuleCode(): string {
  return localAssessments.value[0]?.moduleCode
    || remoteAssessments.value[0]?.moduleCode
    || modules.value[0]?.code
    || 'health'
}

function chooseAssessment(): void {
  const candidates = modules.value.filter((item) => item.assessmentEnabled)
  if (!candidates.length) {
    uni.showToast({ title: '暂无可评估模块', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: candidates.map((item) => item.name),
    success: ({ tapIndex }) => {
      const module = candidates[tapIndex]
      if (module) uni.navigateTo({ url: `/pages/products/assessment?moduleCode=${module.code}` })
    },
  })
}

function goModule(module: ProductModule): void {
  if (module.assessmentEnabled) {
    uni.navigateTo({ url: `/pages/products/assessment?moduleCode=${module.code}` })
    return
  }
  uni.navigateTo({ url: `/pages/products/index?moduleCode=${module.code}` })
}

function handleModuleTap(code: string): void {
  const module = modules.value.find((item) => item.code === code)
  if (module) goModule(module)
}

function goProducts(): void {
  uni.navigateTo({ url: `/pages/products/index?moduleCode=${preferredModuleCode()}` })
}

function goProductDetail(id: number): void {
  uni.navigateTo({ url: `/pages/products/detail?id=${id}` })
}

function requireLogin(action: () => void): void {
  if (!isLogin.value) {
    showAuthPopup.value = true
    return
  }
  action()
}

function goEdit(): void {
  requireLogin(() => uni.navigateTo({ url: '/pages/profile/edit' }))
}

function goInvite(): void {
  requireLogin(() => uni.navigateTo({ url: '/pages/invite/invite' }))
}

function goProductLeads(): void {
  requireLogin(() => uni.navigateTo({ url: '/pages/profile/product-leads' }))
}

function goActivityRegistrations(): void {
  requireLogin(() => uni.navigateTo({ url: '/pages/profile/activity-registrations' }))
}

function goPartner(): void {
  requireLogin(() => {
    const url = partner.value && partner.value.status !== 2 ? '/pages/partner/dashboard' : '/pages/partner/apply'
    uni.navigateTo({ url })
  })
}

function leadStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待跟进',
    new: '已提交',
    contacted: '跟进中',
    qualified: '方案确认中',
    converted: '已完成',
    invalid: '已结束',
    closed: '已结束',
  }
  return map[status] || status
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

async function handleLogout(): Promise<void> {
  const { confirm } = await uni.showModal({ title: '提示', content: '确定退出登录？' })
  if (!confirm) return
  await logout()
  remoteAssessments.value = []
  recentLead.value = null
  leadTotal.value = 0
  activityTotal.value = 0
  partner.value = null
  await loadRecommendedProducts()
}

async function handleDeactivate(): Promise<void> {
  const { confirm } = await uni.showModal({
    title: '注销账号',
    content: '注销后将停用账号，清除昵称、头像、手机号、标签等个人资料，并退出当前登录。咨询记录会保留为不可识别的业务记录。',
    confirmColor: '#d92d20',
    confirmText: '继续注销',
    cancelText: '取消',
  })
  if (!confirm) return
  const secondConfirm = await uni.showModal({
    title: '再次确认',
    content: '该操作不可恢复。确认注销当前账号？',
    confirmColor: '#d92d20',
    confirmText: '确认注销',
    cancelText: '我再想想',
  })
  if (!secondConfirm.confirm) return
  try {
    await userApi.deactivateAccount()
    // 服务端已作废所有 session，直接清本地状态即可。
    authStore.clearToken()
    userStore.clearUserInfo()
    uni.showToast({ title: '账号已注销', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 1000)
  } catch {
    uni.showToast({ title: '注销失败，请重试', icon: 'none' })
  }
}

onShow(() => {
  void loadProfileData()
})
</script>

<style lang="scss" scoped>
.profile {
  min-height: 100vh;
  background: #f4f6f5;
  padding: 24rpx;
  padding-bottom: 56rpx;

  &__hero,
  &__guest,
  &__panel {
    background: #fff;
    border-radius: 18rpx;
    box-shadow: 0 8rpx 24rpx rgba(31, 41, 55, 0.06);
  }

  &__hero {
    display: flex;
    gap: 22rpx;
    padding: 28rpx;
    margin-bottom: 20rpx;
  }

  &__avatar {
    width: 112rpx;
    height: 112rpx;
    border-radius: 56rpx;
    overflow: hidden;
    background: #eef2f1;
    flex-shrink: 0;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__identity {
    flex: 1;
    min-width: 0;
  }

  &__name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
  }

  &__name {
    color: #1f2937;
    font-size: 36rpx;
    font-weight: 700;
    line-height: 48rpx;
  }

  &__edit,
  &__section-action,
  &__guest-btn {
    color: #07a85a;
    font-size: 26rpx;
    font-weight: 600;
    white-space: nowrap;
  }

  &__phone {
    display: block;
    color: #667085;
    font-size: 24rpx;
    line-height: 36rpx;
    margin-top: 4rpx;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-top: 14rpx;
  }

  &__tag {
    max-width: 220rpx;
    padding: 6rpx 14rpx;
    border-radius: 999rpx;
    background: #e9f8ef;
    color: #08783d;
    font-size: 22rpx;
    line-height: 30rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &--empty {
      max-width: 360rpx;
      background: #f1f4f3;
      color: #667085;
    }
  }

  &__guest {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
  }

  &__guest-title {
    display: block;
    color: #1f2937;
    font-size: 32rpx;
    font-weight: 700;
    line-height: 44rpx;
  }

  &__guest-desc {
    display: block;
    color: #667085;
    font-size: 24rpx;
    line-height: 36rpx;
    margin-top: 8rpx;
  }

  &__panel {
    margin-top: 20rpx;
    padding: 26rpx;
  }

  &__summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14rpx;
  }

  &__metric {
    min-width: 0;
    padding: 8rpx 4rpx;
    text-align: center;
  }

  &__metric-value {
    display: block;
    color: #1f2937;
    font-size: 34rpx;
    font-weight: 800;
    line-height: 44rpx;
  }

  &__metric-label {
    display: block;
    color: #667085;
    font-size: 22rpx;
    line-height: 32rpx;
    margin-top: 6rpx;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
    margin-bottom: 20rpx;
  }

  &__section-title {
    display: block;
    color: #1f2937;
    font-size: 30rpx;
    font-weight: 700;
    line-height: 40rpx;
  }

  &__section-desc {
    display: block;
    color: #667085;
    font-size: 22rpx;
    line-height: 32rpx;
    margin-top: 2rpx;
  }

  &__lead,
  &__menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18rpx;
  }

  &__lead-title,
  &__menu-title {
    display: block;
    color: #1f2937;
    font-size: 28rpx;
    font-weight: 650;
    line-height: 38rpx;
  }

  &__lead-date,
  &__menu-desc {
    display: block;
    color: #667085;
    font-size: 22rpx;
    line-height: 32rpx;
    margin-top: 4rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    flex-shrink: 0;
    min-width: 96rpx;
    padding: 8rpx 12rpx;
    border-radius: 999rpx;
    text-align: center;
    font-size: 22rpx;
    line-height: 28rpx;

    &--done {
      background: #e9f8ef;
      color: #08783d;
    }

    &--todo {
      background: #fff4e5;
      color: #a15c00;
    }
  }

  &__lead {
    padding: 18rpx;
    border-radius: 14rpx;
    background: #f7faf8;
  }

  &__menu {
    padding: 10rpx 26rpx;
  }

  &__menu-item {
    padding: 22rpx 0;
    border-bottom: 1rpx solid #edf0ef;

    &:last-child {
      border-bottom: 0;
    }
  }

  &__chevron {
    color: #98a2b3;
    font-size: 44rpx;
    line-height: 44rpx;
  }

  &__empty {
    padding: 24rpx 0;
    color: #98a2b3;
    font-size: 24rpx;
    line-height: 36rpx;
    text-align: center;
  }

  &__actions {
    margin-top: 28rpx;
  }

  &__btn {
    min-height: 96rpx;
    padding: 20rpx 24rpx;
    box-sizing: border-box;
    border-radius: 16rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

    &--default {
      width: 100%;
      background-color: #fff;
      color: #1f2937;
      border: 1rpx solid #d0d5dd;
    }

    &--danger {
      width: 100%;
      margin-top: 16rpx;
      background-color: #fff;
      color: #d92d20;
      border: 1rpx solid #fecdca;
    }
  }

  &__btn-title {
    color: inherit;
    font-size: 29rpx;
    font-weight: 700;
    line-height: 38rpx;
  }

  &__btn-desc {
    display: block;
    margin-top: 4rpx;
    color: #667085;
    font-size: 22rpx;
    line-height: 30rpx;
  }

  &__btn--danger &__btn-desc {
    color: #b42318;
  }
}
</style>
