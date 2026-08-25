<template>
  <view class="detail" v-if="product">
    <image v-if="product.coverUrl" :src="product.coverUrl" class="detail__cover" mode="aspectFill" />
    <view v-else class="detail__cover detail__cover--empty">
      <text>{{ product.module.name }}</text>
    </view>

    <view class="detail__main">
      <view class="detail__title-row">
        <text class="detail__title">{{ product.title }}</text>
        <text v-if="product.priceText" class="detail__price">{{ product.priceText }}</text>
      </view>
      <text class="detail__subtitle">{{ product.subtitle || product.summary }}</text>
      <view class="detail__tags">
        <text v-for="tag in product.tags" :key="tag" class="detail__tag" :class="{ matched: product.matchedTags.includes(tag) }">{{ tag }}</text>
      </view>
    </view>

    <view class="detail__section" v-if="product.targetUserText">
      <text class="detail__section-title">适合人群</text>
      <text class="detail__text">{{ product.targetUserText }}</text>
    </view>
    <view class="detail__section" v-if="product.painPointText">
      <text class="detail__section-title">解决痛点</text>
      <text class="detail__text">{{ product.painPointText }}</text>
    </view>
    <view class="detail__section" v-if="product.serviceProcess">
      <text class="detail__section-title">服务流程</text>
      <text class="detail__text">{{ product.serviceProcess }}</text>
    </view>
    <view class="detail__section" v-if="product.detail">
      <text class="detail__section-title">产品详情</text>
      <text class="detail__text">{{ product.detail }}</text>
    </view>

    <view class="detail__section">
      <text class="detail__section-title">服务保障</text>
      <view class="detail__assurance">
        <view v-for="item in assurances" :key="item.title" class="detail__assurance-item">
          <text class="detail__assurance-title">{{ item.title }}</text>
          <text class="detail__assurance-desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <view class="detail__lead">
      <text class="detail__section-title">我的需求</text>
      <text class="detail__lead-desc">提交后会进入后台线索池，运营人员或服务伙伴会根据你的需求跟进。</text>
      <view v-if="assessmentSummary" class="detail__assessment">
        <text class="detail__assessment-title">需求评估</text>
        <text class="detail__assessment-summary">{{ assessmentSummary }}</text>
      </view>
      <view class="detail__need-tags">
        <text
          v-for="tag in needTagOptions"
          :key="tag"
          class="detail__need-tag"
          :class="{ active: needTags.includes(tag) }"
          @tap="toggleNeedTag(tag)"
        >
          {{ tag }}
        </text>
      </view>
      <textarea class="detail__textarea" :value="message" placeholder="可以简单写下你的需求，便于后续匹配服务" maxlength="300" @input="onMessageInput" />
    </view>

    <view class="detail__footer">
      <view class="detail__submit" :class="{ loading: submitting, disabled: hasSubmitted }" @tap="submitLead">
        {{ submitButtonText }}
      </view>
    </view>

    <view v-if="leadSuccess" class="detail__success-mask">
      <view class="detail__success">
        <text class="detail__success-title">需求已提交</text>
        <text class="detail__success-desc">我们已记录你的需求，后续会根据产品和标签安排跟进。</text>
        <view class="detail__success-actions">
          <view class="detail__success-btn detail__success-btn--ghost" @tap="goProductList">继续看看</view>
          <view class="detail__success-btn" @tap="goBack">返回上一页</view>
        </view>
      </view>
    </view>
  </view>

  <view v-else class="detail__empty">
    <text>产品加载中</text>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productApi, type Product } from '@/api/modules/product'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { useFreshUserInfo } from '@/composables/useFreshUserInfo'
import { useHealthAssessment } from '@/composables/useHealthAssessment'
import { storage } from '@/utils/storage'
import { setAuthRedirect } from '@/utils/auth'

type UniValueEvent = { detail?: { value?: string | number } }

const authStore = useAuthStore()
const userStore = useUserStore()
const product = ref<Product | null>(null)
const productId = ref(0)
const message = ref('')
const needTags = ref<string[]>([])
const submitting = ref(false)
const leadSuccess = ref(false)
const submittedProductIds = ref<number[]>([])
const assessmentTags = ref<string[]>([])
const assessmentSummary = ref('')
const userTags = computed(() => userStore.userInfo?.tags || [])
const hasSubmitted = computed(() => product.value ? submittedProductIds.value.includes(product.value.id) : false)
const { refreshUserInfo } = useFreshUserInfo()
const { getAssessment } = useHealthAssessment()
const submitButtonText = computed(() => {
  if (submitting.value) return '提交中...'
  return hasSubmitted.value ? '已提交需求' : '我想了解'
})

const needTagOptions = ['健康养生', '运动健身', '睡眠改善', '体重管理', '家庭健康', '到店体验']
const assurances = [
  { title: '需求先行', desc: '先记录你的关注点，再匹配合适产品' },
  { title: '人工跟进', desc: '线索进入后台后由运营或伙伴处理' },
  { title: '可持续优化', desc: '你的标签会帮助后续推荐更精准' },
]

function getEventValue(e: unknown): string {
  const detail = (e as UniValueEvent).detail
  return detail?.value === undefined ? '' : String(detail.value)
}

async function loadDetail() {
  if (!productId.value) return
  submittedProductIds.value = storage.get<number[]>('submittedProductLeadIds') || []
  await refreshUserInfo()
  const baseProduct = await productApi.detail(productId.value, userTags.value)
  const assessment = getAssessment(baseProduct.module.code)
  assessmentTags.value = assessment?.tags || []
  assessmentSummary.value = assessment?.summary || ''
  const tags = [...new Set([...userTags.value, ...assessmentTags.value])]
  product.value = await productApi.detail(productId.value, tags)
  needTags.value = product.value.matchedTags.length ? [...product.value.matchedTags] : assessmentTags.value.slice(0, 3)
}

function toggleNeedTag(tag: string) {
  const index = needTags.value.indexOf(tag)
  if (index >= 0) needTags.value.splice(index, 1)
  else needTags.value.push(tag)
}

function onMessageInput(e: unknown) {
  message.value = getEventValue(e)
}

async function submitLead() {
  if (!authStore.isLogin) {
    if (product.value) setAuthRedirect(`/pages/products/detail?id=${product.value.id}`)
    uni.navigateTo({ url: '/pages/auth/auth' })
    return
  }
  if (!product.value || submitting.value || hasSubmitted.value) return
  submitting.value = true
  try {
    const cleanMessage = message.value.trim()
    const nextMessage = assessmentSummary.value
      ? `${cleanMessage ? `${cleanMessage}\n` : ''}需求评估：${assessmentSummary.value}`
      : cleanMessage
    await productApi.createLead(product.value.id, {
      needTags: needTags.value,
      message: nextMessage,
      inviteCode: storage.get<string>('pendingInviteCode') || undefined,
      sourceScene: 'miniapp_product_detail',
    })
    submittedProductIds.value = [...new Set([...submittedProductIds.value, product.value.id])]
    storage.set('submittedProductLeadIds', submittedProductIds.value, { expireSeconds: 7 * 24 * 3600 })
    leadSuccess.value = true
  } catch {
    // 请求层已统一提示
  } finally {
    submitting.value = false
  }
}

function goProductList() {
  leadSuccess.value = false
  const code = product.value?.module.code || 'health'
  uni.redirectTo({ url: `/pages/products/index?moduleCode=${code}` })
}

function goBack() {
  leadSuccess.value = false
  uni.navigateBack()
}

onLoad((options) => {
  productId.value = Number(options?.id) || 0
  loadDetail()
})
</script>

<style lang="scss" scoped>
.detail {
  min-height: 100vh;
  background: #f6f7f8;
  padding-bottom: 140rpx;

  &__cover {
    width: 100%;
    height: 420rpx;
    background: #e9eef3;
    &--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #667085;
      font-size: 34rpx;
    }
  }
  &__main,
  &__section,
  &__lead {
    background: #fff;
    margin-bottom: 16rpx;
    padding: 28rpx 32rpx;
  }
  &__title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
    margin-bottom: 12rpx;
  }
  &__title {
    flex: 1;
    color: #1f2937;
    font-size: 40rpx;
    font-weight: 700;
    line-height: 1.35;
  }
  &__price {
    flex-shrink: 0;
    color: #f97316;
    font-size: 28rpx;
    font-weight: 600;
  }
  &__subtitle,
  &__text {
    display: block;
    color: #667085;
    font-size: 28rpx;
    line-height: 1.7;
    white-space: pre-wrap;
  }
  &__tags,
  &__need-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 20rpx;
  }
  &__tag,
  &__need-tag {
    padding: 8rpx 18rpx;
    border-radius: 24rpx;
    background: #f2f4f7;
    color: #667085;
    font-size: 24rpx;
    &.matched,
    &.active {
      color: var(--color-primary);
      background: rgba(7, 193, 96, 0.1);
    }
  }
  &__section-title {
    display: block;
    color: #1f2937;
    font-size: 30rpx;
    font-weight: 600;
    margin-bottom: 14rpx;
  }
  &__assurance {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    &-item {
      padding: 20rpx;
      border-radius: 12rpx;
      background: #f9fafb;
    }
    &-title {
      display: block;
      color: #1f2937;
      font-size: 28rpx;
      font-weight: 600;
      margin-bottom: 6rpx;
    }
    &-desc {
      display: block;
      color: #667085;
      font-size: 24rpx;
      line-height: 1.5;
    }
  }
  &__lead-desc {
    display: block;
    color: #667085;
    font-size: 24rpx;
    line-height: 1.6;
  }
  &__assessment {
    margin-top: 20rpx;
    padding: 20rpx;
    border-radius: 12rpx;
    background: #f9fafb;
    &-title {
      display: block;
      color: #1f2937;
      font-size: 26rpx;
      font-weight: 600;
      margin-bottom: 6rpx;
    }
    &-summary {
      display: block;
      color: #667085;
      font-size: 24rpx;
      line-height: 1.55;
    }
  }
  &__textarea {
    width: 100%;
    min-height: 180rpx;
    margin-top: 24rpx;
    padding: 20rpx;
    box-sizing: border-box;
    border-radius: 12rpx;
    background: #f9fafb;
    color: #1f2937;
    font-size: 26rpx;
  }
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 16rpx 32rpx;
    background: #fff;
    border-top: 1rpx solid #eef0f2;
  }
  &__submit {
    height: 88rpx;
    border-radius: 44rpx;
    background: var(--color-primary);
    color: #fff;
    font-size: 30rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    &.loading {
      background: #98a2b3;
    }
    &.disabled {
      background: #d0d5dd;
      color: #667085;
    }
  }
  &__empty {
    padding-top: 180rpx;
    text-align: center;
    color: #98a2b3;
  }
  &__success-mask {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(17, 24, 39, 0.42);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48rpx;
    box-sizing: border-box;
  }
  &__success {
    width: 100%;
    border-radius: 20rpx;
    background: #fff;
    padding: 44rpx 36rpx 32rpx;
    box-sizing: border-box;
    &-title {
      display: block;
      text-align: center;
      color: #1f2937;
      font-size: 36rpx;
      font-weight: 700;
      margin-bottom: 16rpx;
    }
    &-desc {
      display: block;
      text-align: center;
      color: #667085;
      font-size: 26rpx;
      line-height: 1.6;
      margin-bottom: 32rpx;
    }
    &-actions {
      display: flex;
      gap: 16rpx;
    }
    &-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 40rpx;
      background: var(--color-primary);
      color: #fff;
      font-size: 28rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      &--ghost {
        background: #f2f4f7;
        color: #344054;
      }
    }
  }
}
</style>
