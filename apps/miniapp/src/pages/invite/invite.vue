<template>
  <view class="invite">
    <view class="invite__header">
      <text class="invite__title">邀请好友</text>
      <text class="invite__subtitle">分享邀请码，与好友一起加入心悦部落</text>
    </view>

    <view v-if="!isLogin" class="invite__login-card">
      <text class="invite__login-title">登录后查看邀请码</text>
      <text class="invite__login-desc">完成登录即可生成专属邀请码，查看邀请记录并生成分享海报。</text>
      <view class="invite__login-btn" @tap="showAuthPopup = true">去登录</view>
    </view>

    <view v-else class="invite__card">
      <text class="invite__card-label">我的邀请码</text>
      <view class="invite__code-box">
        <text class="invite__code">{{ inviteCode }}</text>
        <view class="invite__copy" @tap="copyCode">
          <text>复制</text>
        </view>
      </view>
      <text class="invite__card-tip">好友入会时填写此邀请码，双方均可获得奖励</text>
    </view>

    <view v-if="isLogin" class="invite__share">
      <text class="invite__share-title">分享方式</text>
      <view class="invite__share-btns">
        <button class="invite__share-btn invite__share-btn--wechat" open-type="share">
          <image src="/static/icons/share-wechat.svg" class="invite__share-icon" mode="aspectFit" />
          <text>微信好友</text>
        </button>
        <view class="invite__share-btn invite__share-btn--poster" @tap="generatePoster">
          <image src="/static/icons/poster.svg" class="invite__share-icon" mode="aspectFit" />
          <text>生成海报</text>
        </view>
      </view>
    </view>

    <view v-if="invitees.length > 0" class="invite__list">
      <text class="invite__list-title">已邀请好友（{{ invitees.length }}人）</text>
      <view v-for="item in invitees" :key="item.id" class="invite__list-item">
        <image :src="item.avatar || '/static/images/default-avatar.png'" class="invite__list-avatar" mode="aspectFill" />
        <view class="invite__list-info">
          <text class="invite__list-name">{{ item.nickname }}</text>
          <text class="invite__list-time">{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 隐藏 canvas，用于绘制海报 -->
  <canvas
    canvas-id="posterCanvas"
    style="position: fixed; top: -9999px; left: -9999px; width: 375px; height: 600px;"
  />

  <!-- 海报预览弹窗 -->
  <view v-if="posterVisible" class="poster-modal" @tap="closePoster">
    <view class="poster-modal__box" @tap.stop>
      <image :src="posterUrl" class="poster-modal__img" mode="widthFix" />
      <view class="poster-modal__tip">长按图片保存到相册</view>
      <view class="poster-modal__close" @tap="closePoster">关闭</view>
    </view>
  </view>

  <AuthPopup :visible="showAuthPopup" @close="showAuthPopup = false" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { invitationApi } from '@/api/modules/invitation'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { APP_CONFIG } from '@/config'
import AuthPopup from '@/components/business/AuthPopup.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const isLogin = computed(() => authStore.isLogin)
const inviteCode = ref('')
const invitees = ref<Array<{ id: number; nickname: string; avatar: string; createdAt: string }>>([])
const posterVisible = ref(false)
const posterUrl = ref('')
const showAuthPopup = ref(false)
const POSTER_WIDTH = 375
const POSTER_HEIGHT = 600
const POSTER_SCALE = 2

const loadData = async (): Promise<void> => {
  if (!authStore.isLogin) {
    inviteCode.value = ''
    invitees.value = []
    return
  }
  try {
    const data = await invitationApi.getMyInvitations()
    inviteCode.value = data.inviteCode
    invitees.value = data.invitees
  } catch (e) {
    if (authStore.isLogin) {
      uni.showToast({ title: '加载失败，请重试', icon: 'none' })
    }
  }
}

const copyCode = (): void => {
  if (!authStore.isLogin) {
    showAuthPopup.value = true
    return
  }
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      uni.showToast({ title: '邀请码已复制', icon: 'success' })
    },
  })
}

const closePoster = (): void => {
  posterVisible.value = false
}

const generatePoster = async (): Promise<void> => {
  if (!authStore.isLogin) {
    showAuthPopup.value = true
    return
  }
  if (!inviteCode.value) {
    uni.showToast({ title: '请先加载邀请码', icon: 'none' })
    return
  }
  uni.showLoading({ title: '生成中...', mask: true })
  try {
    const downloadImg = (url: string) => new Promise<string>((resolve) => {
      uni.downloadFile({ url, success: r => resolve(r.tempFilePath), fail: () => resolve('') })
    })

    // 并行下载头像和二维码
    const [localAvatar, localQrcode] = await Promise.all([
      userStore.avatarUrl.startsWith('http') ? downloadImg(userStore.avatarUrl) : Promise.resolve(userStore.avatarUrl),
      downloadImg(`${APP_CONFIG.apiBaseUrl}/miniapp/qrcode?inviteCode=${inviteCode.value}`),
    ])

    const ctx = uni.createCanvasContext('posterCanvas')
    const W = POSTER_WIDTH
    const H = POSTER_HEIGHT
    const BLEED = 8

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, W, H + BLEED * 2)
    grad.addColorStop(0, '#667eea')
    grad.addColorStop(1, '#764ba2')
    ctx.setFillStyle(grad)
    ctx.fillRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2)

    // 白色卡片
    ctx.setFillStyle('#ffffff')
    ctx.setShadow(0, 4, 16, 'rgba(0,0,0,0.15)')
    roundRect(ctx, 24, 80, W - 48, H - 120, 16)
    ctx.fill()
    ctx.setShadow(0, 0, 0, 'transparent')

    // 头像（圆形）
    if (localAvatar) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(W / 2, 120, 40, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(localAvatar, W / 2 - 40, 80, 80, 80)
      ctx.restore()
    }

    // 用户名
    ctx.setFillStyle('#333333')
    ctx.setFontSize(16)
    ctx.setTextAlign('center')
    ctx.fillText(userStore.displayName, W / 2, 180)

    // 标语
    ctx.setFillStyle('#888888')
    ctx.setFontSize(12)
    ctx.fillText('邀请你加入心悦部落', W / 2, 210)

    // 分割线
    ctx.setStrokeStyle('#eeeeee')
    ctx.setLineWidth(1)
    ctx.beginPath()
    ctx.moveTo(48, 228)
    ctx.lineTo(W - 48, 228)
    ctx.stroke()

    // 二维码
    if (localQrcode) {
      ctx.drawImage(localQrcode, W / 2 - 70, 244, 140, 140)
    }

    // 扫码提示
    ctx.setFillStyle('#666666')
    ctx.setFontSize(12)
    ctx.fillText('扫码加入心悦部落', W / 2, 406)

    // 邀请码
    ctx.setFillStyle('#999999')
    ctx.setFontSize(11)
    ctx.fillText(`邀请码：${inviteCode.value}`, W / 2, 430)

    // 品牌
    ctx.setFillStyle('#cccccc')
    ctx.setFontSize(10)
    ctx.fillText('心悦部落', W / 2, 456)

    await new Promise<void>((resolve) => ctx.draw(false, resolve))

    const result = await new Promise<string>((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: 'posterCanvas',
        fileType: 'jpg',
        quality: 0.92,
        x: 0,
        y: 0,
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        destWidth: POSTER_WIDTH * POSTER_SCALE,
        destHeight: POSTER_HEIGHT * POSTER_SCALE,
        success: (res) => resolve(res.tempFilePath),
        fail: reject,
      })
    })

    posterUrl.value = result
    posterVisible.value = true
  } catch {
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const formatTime = (iso: string): string => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onShareAppMessage(() => {
  if (!authStore.isLogin || !inviteCode.value) {
    return {
      title: '邀请你加入心悦部落',
      path: '/pages/index/index',
      imageUrl: '',
    }
  }
  return {
    title: `邀请你加入心悦部落`,
    path: `/pages/index/index?inviteCode=${inviteCode.value}`,
    imageUrl: '',
  }
})

onShow(loadData)

// 绘制圆角矩形路径
function roundRect(ctx: UniApp.CanvasContext, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
</script>

<style lang="scss" scoped>
.invite {
  min-height: 100vh;
  background-color: var(--color-bg);
  padding: 32rpx;

  &__header {
    text-align: center;
    padding: 48rpx 0;
  }

  &__title {
    display: block;
    font-size: 40rpx;
    font-weight: bold;
    color: var(--color-text);
    margin-bottom: 16rpx;
  }

  &__subtitle {
    font-size: 26rpx;
    color: var(--color-text-secondary);
  }

  &__card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: var(--radius-lg);
    padding: 48rpx;
    margin-bottom: 32rpx;

    &-label {
      display: block;
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 24rpx;
      text-align: center;
    }

    &-tip {
      display: block;
      font-size: 22rpx;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      margin-top: 24rpx;
    }
  }

  &__login-card {
    background: #fff;
    border-radius: var(--radius-lg);
    padding: 48rpx 40rpx;
    margin-bottom: 32rpx;
    text-align: center;
    border: 1rpx solid var(--color-border);
  }

  &__login-title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 16rpx;
  }

  &__login-desc {
    display: block;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--color-text-secondary);
    margin-bottom: 32rpx;
  }

  &__login-btn {
    height: 84rpx;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__code-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24rpx;
  }

  &__code {
    font-size: 56rpx;
    font-weight: bold;
    color: #fff;
    letter-spacing: 8rpx;
  }

  &__copy {
    padding: 12rpx 32rpx;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 32rpx;
    color: #fff;
    font-size: 26rpx;
  }

  &__share {
    margin-bottom: 32rpx;

    &-title {
      display: block;
      font-size: 30rpx;
      font-weight: bold;
      color: var(--color-text);
      margin-bottom: 24rpx;
    }

    &-btns {
      display: flex;
      gap: 24rpx;
      align-items: stretch;
    }

    &-btn {
      flex: 1;
      min-width: 0;
      height: 168rpx;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14rpx;
      margin: 0;
      padding: 0;
      border-radius: var(--radius-md);
      border: none;
      background-color: var(--color-bg-white);
      line-height: 1;

      text {
        display: block;
        line-height: 1;
        font-size: 26rpx;
        color: var(--color-text);
      }

      &::after {
        border: none;
      }
    }

    &-icon {
      display: block;
      width: 48rpx;
      height: 48rpx;
      flex-shrink: 0;
    }
  }

  &__list {
    background-color: var(--color-bg-white);
    border-radius: var(--radius-lg);
    padding: 32rpx;

    &-title {
      display: block;
      font-size: 30rpx;
      font-weight: bold;
      color: var(--color-text);
      margin-bottom: 24rpx;
    }

    &-item {
      display: flex;
      align-items: center;
      gap: 24rpx;
      padding: 24rpx 0;
      border-bottom: 1rpx solid var(--color-border);

      &:last-child {
        border-bottom: none;
      }
    }

    &-avatar {
      width: 72rpx;
      height: 72rpx;
      border-radius: 50%;
    }

    &-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8rpx;
    }

    &-name {
      font-size: 28rpx;
      color: var(--color-text);
    }

    &-time {
      font-size: 22rpx;
      color: var(--color-text-secondary);
    }
  }
}
</style>

<style lang="scss" scoped>
.poster-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;

  &__box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32rpx;
  }

  &__img {
    width: 600rpx;
    height: auto;
    display: block;
    border-radius: 16rpx;
    background: transparent;
  }

  &__tip {
    color: rgba(255, 255, 255, 0.8);
    font-size: 24rpx;
    margin-top: 24rpx;
  }

  &__close {
    margin-top: 32rpx;
    padding: 16rpx 64rpx;
    border: 1rpx solid rgba(255, 255, 255, 0.5);
    border-radius: 40rpx;
    color: #fff;
    font-size: 28rpx;
  }
}
</style>
