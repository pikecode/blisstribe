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

    <!-- 会员卡（已登录） -->
    <view v-if="isLogin" class="index__member">
      <image :src="userStore.avatarUrl" class="index__member-avatar" mode="aspectFill" />
      <view class="index__member-info">
        <text class="index__member-name">{{ userStore.displayName }}</text>
        <text class="index__member-tag">心悦会员</text>
      </view>
    </view>

    <!-- CTA（未登录） -->
    <view v-if="!isLogin" class="index__cta">
      <text class="index__cta-title">心悦部落</text>
      <text class="index__cta-sub">加入我们，开启专属旅程</text>
    <view class="index__cta-btn" @tap="showAuthPopup = true">立即入会</view>
    </view>

    <!-- 权益 -->
    <view class="index__section">
      <text class="index__section-title">会员权益</text>
      <view class="index__perks">
        <view v-for="(card, i) in introCards" :key="i" class="index__perk">
          <text class="index__perk-icon">{{ card.icon }}</text>
          <view>
            <text class="index__perk-title">{{ card.title }}</text>
            <text class="index__perk-desc">{{ card.desc }}</text>
          </view>
        </view>
      </view>
    </view>

  </view>

  <AuthPopup :visible="showAuthPopup" @close="showAuthPopup = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { bannerApi, type Banner } from '@/api/modules/banner'
import AuthPopup from '@/components/business/AuthPopup.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const isLogin = computed(() => authStore.isLogin)
const banners = ref<Banner[]>([])
const showAuthPopup = ref(false)

async function loadBanners() {
  try {
    banners.value = await bannerApi.list()
  } catch {
    // 接口失败保持空列表
  }
}

const introCards = [
  { icon: '🏠', title: '温馨社区', desc: '志同道合的伙伴，温暖的交流空间' },
  { icon: '🎁', title: '专属福利', desc: '会员独享优惠与活动权益' },
  { icon: '🤝', title: '邀请好友', desc: '分享邀请码，与好友共同成长' },
  { icon: '💎', title: '尊贵身份', desc: '心悦会员专属标识与荣誉' },
]

const goAuth = () => uni.navigateTo({ url: '/pages/auth/auth' })
const goProfile = () => uni.switchTab({ url: '/pages/profile/index' })
const goInvite = () => uni.navigateTo({ url: '/pages/invite/invite' })
const goAgreement = () => uni.navigateTo({ url: '/pages/agreement/user-agreement' })

onShow(loadBanners)
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

  // ── 会员卡 ──────────────────────────
  &__member {
    display: flex;
    align-items: center;
    gap: 24rpx;
    margin: 32rpx;
    padding: 32rpx;
    background: #fff;
    border-radius: 16rpx;
    &-avatar {
      width: 88rpx;
      height: 88rpx;
      border-radius: 50%;
      flex-shrink: 0;
    }
    &-name {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8rpx;
    }
    &-tag {
      display: inline-block;
      font-size: 22rpx;
      color: #6c63ff;
      background: rgba(108, 99, 255, 0.08);
      padding: 4rpx 16rpx;
      border-radius: 20rpx;
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
      letter-spacing: 2rpx;
    }
    &-sub {
      display: block;
      font-size: 26rpx;
      color: #999;
      margin-bottom: 48rpx;
    }
    &-btn {
      display: inline-block;
      padding: 22rpx 64rpx;
      background: #1a1a1a;
      color: #fff;
      font-size: 28rpx;
      font-weight: 500;
      border-radius: 60rpx;
      letter-spacing: 2rpx;
    }
  }

  // ── Section ──────────────────────────
  &__section {
    margin: 0 32rpx 32rpx;
    &-title {
      display: block;
      font-size: 28rpx;
      font-weight: 600;
      color: #1a1a1a;
      letter-spacing: 1rpx;
      margin-bottom: 20rpx;
    }
  }

  // ── 权益列表 ──────────────────────────
  &__perks {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
  }
  &__perk {
    display: flex;
    align-items: center;
    gap: 28rpx;
    padding: 32rpx;
    border-bottom: 1rpx solid #f0f0f0;
    &:last-child { border-bottom: none; }
  }
  &__perk-icon { font-size: 44rpx; flex-shrink: 0; }
  &__perk-title {
    display: block;
    font-size: 28rpx;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 6rpx;
  }
  &__perk-desc {
    font-size: 24rpx;
    color: #999;
    line-height: 1.5;
  }

  // ── 快捷入口 ──────────────────────────
  &__quick {
    display: flex;
    gap: 16rpx;
    &-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      padding: 32rpx 16rpx;
      background: #fff;
      border-radius: 16rpx;
    }
    &-icon { font-size: 40rpx; }
    &-text {
      font-size: 24rpx;
      color: #666;
    }
  }
}
</style>
