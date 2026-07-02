<template>
  <view class="invite">
    <view class="invite__header">
      <text class="invite__title">邀请好友</text>
      <text class="invite__subtitle">分享邀请码，与好友一起加入心悦部落</text>
    </view>

    <view class="invite__card">
      <text class="invite__card-label">我的邀请码</text>
      <view class="invite__code-box">
        <text class="invite__code">{{ inviteCode }}</text>
        <view class="invite__copy" @tap="copyCode">
          <text>复制</text>
        </view>
      </view>
      <text class="invite__card-tip">好友入会时填写此邀请码，双方均可获得奖励</text>
    </view>

    <view class="invite__share">
      <text class="invite__share-title">分享方式</text>
      <view class="invite__share-btns">
        <button class="invite__share-btn invite__share-btn--wechat" open-type="share">
          <text>📤</text>
          <text>微信好友</text>
        </button>
        <view class="invite__share-btn invite__share-btn--poster" @tap="generatePoster">
          <text>🖼️</text>
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
  <canvas canvas-id="posterCanvas" style="position: fixed; top: -9999rpx; left: -9999rpx; width: 750rpx; height: 1200rpx;" />

  <!-- 海报预览弹窗 -->
  <view v-if="posterVisible" class="poster-modal" @tap="closePoster">
    <view class="poster-modal__box" @tap.stop>
      <image :src="posterUrl" class="poster-modal__img" mode="aspectFit" />
      <view class="poster-modal__tip">长按图片保存到相册</view>
      <view class="poster-modal__close" @tap="closePoster">关闭</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { invitationApi } from '@/api/modules/invitation'
import { useUserStore } from '@/stores/modules/user'
import { APP_CONFIG } from '@/config'

const userStore = useUserStore()
const inviteCode = ref('')
const invitees = ref<Array<{ id: number; nickname: string; avatar: string; createdAt: string }>>([])
const posterVisible = ref(false)
const posterUrl = ref('')

const loadData = async (): Promise<void> => {
  try {
    const data = await invitationApi.getMyInvitations()
    inviteCode.value = data.inviteCode
    invitees.value = data.invitees
  } catch (e) {
    uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  }
}

const copyCode = (): void => {
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
    const W = 375
    const H = 600

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#667eea')
    grad.addColorStop(1, '#764ba2')
    ctx.setFillStyle(grad)
    ctx.fillRect(0, 0, W, H)

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
    }

    &-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32rpx;
      border-radius: var(--radius-md);
      background-color: var(--color-bg-white);

      text {
        font-size: 26rpx;
        color: var(--color-text);
      }

      &--wechat {
        &::after {
          border: none;
        }
      }
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
    height: 960rpx;
    border-radius: 16rpx;
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
