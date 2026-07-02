<template>
  <view class="register">
    <!-- 步骤指示器 -->
    <view class="register__steps">
      <view v-for="i in 4" :key="i" class="register__step">
        <view class="register__step-dot" :class="{ active: step >= i, done: step > i }">
          <text v-if="step > i">✓</text>
          <text v-else>{{ i }}</text>
        </view>
        <view v-if="i < 4" class="register__step-line" :class="{ active: step > i }" />
      </view>
    </view>

    <view class="register__title">
      <text>{{ stepTitles[step - 1] }}</text>
    </view>

    <!-- Step 1: 基础信息 -->
    <view v-if="step === 1" class="register__form">
      <view class="register__avatar" @tap="chooseAvatar">
        <view class="register__avatar-preview">
          <image v-if="form.avatar" :src="form.avatar" class="register__avatar-img" mode="aspectFill" />
          <view v-else class="register__avatar-placeholder">👤</view>
        </view>
        <text class="register__avatar-tip">点击上传头像</text>
      </view>

      <view class="register__field">
        <text class="register__label">昵称 <text class="required">*</text></text>
        <view class="register__input-wrap" :class="{ error: errors.nickname }">
          <input class="register__input" :value="form.nickname" placeholder="2-20 字符" :maxlength="20" @input="e => form.nickname = e.detail.value" />
        </view>
        <text v-if="errors.nickname" class="register__error">{{ errors.nickname }}</text>
      </view>

      <view class="register__field">
        <text class="register__label">真实姓名</text>
        <view class="register__input-wrap">
          <input class="register__input" :value="form.realName" placeholder="选填" @input="e => form.realName = e.detail.value" />
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">手机号 <text class="required">*</text></text>
        <view class="register__phone-row">
          <text class="register__phone-text">{{ phoneMasked || '未获取' }}</text>
          <button class="register__phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
            {{ phoneMasked ? '已获取' : '获取手机号' }}
          </button>
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">性别</text>
        <view class="register__options">
          <view v-for="g in genderOptions" :key="g.value" class="register__option" :class="{ active: form.gender === g.value }" @tap="form.gender = g.value">
            <text>{{ g.label }}</text>
          </view>
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">生日</text>
        <picker mode="date" :value="form.birthday" :end="today" @change="e => form.birthday = e.detail.value">
          <view class="register__picker">
            <text :class="{ placeholder: !form.birthday }">{{ form.birthday || '请选择' }}</text>
          </view>
        </picker>
      </view>
    </view>

    <!-- Step 2: 联系方式 -->
    <view v-if="step === 2" class="register__form">
      <view class="register__field">
        <text class="register__label">微信号</text>
        <view class="register__input-wrap">
          <input class="register__input" :value="form.wechatId" placeholder="选填" @input="e => form.wechatId = e.detail.value" />
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">邮箱</text>
        <view class="register__input-wrap">
          <input class="register__input" :value="form.email" placeholder="选填" type="email" @input="e => form.email = e.detail.value" />
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">年龄</text>
        <view class="register__input-wrap">
          <input class="register__input" :value="form.age ? String(form.age) : ''" placeholder="选填" type="number" :maxlength="3" @input="e => form.age = Number(e.detail.value) || undefined" />
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">喜欢的颜色</text>
        <view class="register__color-grid">
          <view v-for="c in colorOptions" :key="c.value" class="register__color-item" :class="{ active: form.favoriteColor === c.value }" @tap="form.favoriteColor = form.favoriteColor === c.value ? '' : c.value">
            <view class="register__color-dot" :style="{ background: c.hex }" />
            <text class="register__color-label">{{ c.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Step 3: 职业与标签 -->
    <view v-if="step === 3" class="register__form">
      <view class="register__field">
        <text class="register__label">职业</text>
        <view class="register__input-wrap">
          <input class="register__input" :value="form.occupation" placeholder="选填，如：设计师、教师等" @input="e => form.occupation = e.detail.value" />
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">自我标签 <text class="register__label-hint">（最多选5个）</text></text>
        <view class="register__tags">
          <view v-for="tag in tagOptions" :key="tag" class="register__tag" :class="{ active: form.tags?.includes(tag) }" @tap="toggleTag(tag)">
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">邀请码</text>
        <view class="register__input-wrap">
          <input class="register__input" :value="inviteCode" placeholder="如有邀请码请填写" :maxlength="6" @input="e => inviteCode = e.detail.value.toUpperCase()" />
        </view>
      </view>
    </view>

    <!-- Step 4: 注册身份 -->
    <view v-if="step === 4" class="register__form">
      <view class="register__field">
        <text class="register__label">注册身份 <text class="required">*</text></text>
        <view class="register__identity-cards">
          <view v-for="id in identityOptions" :key="id.value" class="register__identity-card" :class="{ active: form.identity === id.value }" @tap="form.identity = id.value">
            <text class="register__identity-badge">{{ id.value }}</text>
            <text class="register__identity-name">{{ id.label }}</text>
            <text class="register__identity-desc">{{ id.desc }}</text>
          </view>
        </view>
      </view>

      <view class="register__agreement">
        <UserAgreement v-model="form.agreement" />
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="register__footer">
      <view v-if="step > 1" class="register__btn register__btn--back" @tap="step--">上一步</view>
      <view v-if="step < 4" class="register__btn register__btn--next" :class="{ disabled: !canNext }" @tap="nextStep">下一步</view>
      <view v-if="step === 4" class="register__btn register__btn--submit" :class="{ disabled: !canSubmit || submitting }" @tap="handleSubmit">
        {{ submitting ? '提交中...' : '完成入会' }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { useAuth } from '@/composables/useAuth'
import { authApi } from '@/api/modules/auth'
import { userApi } from '@/api/modules/user'
import { invitationApi } from '@/api/modules/invitation'
import { redirectToHome } from '@/utils/auth'
import UserAgreement from '@/components/business/UserAgreement.vue'
import type { Gender } from '@blisstribe/shared'

const authStore = useAuthStore()
const userStore = useUserStore()
const { getPhoneNumber } = useAuth()

const today = new Date().toISOString().slice(0, 10)
const step = ref(1)
const phoneMasked = ref('')
const inviteCode = ref('')
const submitting = ref(false)

const stepTitles = ['基础信息', '联系方式', '职业与标签', '注册身份']

const form = reactive({
  nickname: '',
  avatar: '',
  gender: 0 as Gender,
  birthday: '',
  realName: '',
  wechatId: '',
  email: '',
  age: undefined as number | undefined,
  favoriteColor: '',
  occupation: '',
  tags: [] as string[],
  identity: '' as string,
  agreement: false,
})

const errors = reactive({ nickname: '' })

const genderOptions = [
  { label: '保密', value: 0 as Gender },
  { label: '男', value: 1 as Gender },
  { label: '女', value: 2 as Gender },
]

const colorOptions = [
  { label: '红', value: 'red', hex: '#ff4d4f' },
  { label: '橙', value: 'orange', hex: '#fa8c16' },
  { label: '黄', value: 'yellow', hex: '#fadb14' },
  { label: '绿', value: 'green', hex: '#52c41a' },
  { label: '蓝', value: 'blue', hex: '#1677ff' },
  { label: '紫', value: 'purple', hex: '#722ed1' },
  { label: '粉', value: 'pink', hex: '#eb2f96' },
  { label: '黑', value: 'black', hex: '#1a1a1a' },
  { label: '白', value: 'white', hex: '#f0f0f0' },
]

const tagOptions = [
  '生活方式', '健康养生', '时尚美容', '美食探店', '旅行达人',
  '运动健身', '读书学习', '科技数码', '音乐艺术', '亲子育儿',
  '宠物爱好者', '职场进阶', '创业者', '投资理财', '公益志愿',
]

const identityOptions = [
  { value: 'C', label: '单纯消费者', desc: '享受会员权益与服务' },
  { value: 'B', label: '产品供应商', desc: '提供优质产品与合作' },
  { value: 'S', label: '服务供应商', desc: '提供专业服务与支持' },
]

const canNext = computed(() => {
  if (step.value === 1) return !!form.nickname.trim() && form.nickname.length >= 2 && !!phoneMasked.value
  return true
})

const canSubmit = computed(() => !!form.identity && form.agreement && !submitting.value)

function toggleTag(tag: string) {
  const idx = form.tags.indexOf(tag)
  if (idx >= 0) {
    form.tags.splice(idx, 1)
  } else if (form.tags.length < 5) {
    form.tags.push(tag)
  }
}

function nextStep() {
  if (!canNext.value) return
  if (step.value === 1) {
    errors.nickname = ''
    if (form.nickname.trim().length < 2) {
      errors.nickname = '昵称需 2-20 字符'
      return
    }
  }
  step.value++
}

const chooseAvatar = async (): Promise<void> => {
  try {
    const { tempFilePaths } = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    if (!tempFilePaths.length) return
    form.avatar = tempFilePaths[0]  // 先显示本地预览
    uni.showLoading({ title: '上传中...' })
    const result = await userApi.uploadAvatar(tempFilePaths[0])
    form.avatar = result.url  // 替换为服务器永久 URL
  } catch { /* 用户取消或上传失败，保持本地预览 */ } finally { uni.hideLoading() }
}

const onGetPhoneNumber = async (e: { detail: { code?: string; errMsg?: string } }): Promise<void> => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok' || !e.detail.code) {
    uni.showToast({ title: '未获取到手机号', icon: 'none' })
    return
  }
  try {
    phoneMasked.value = await getPhoneNumber(e.detail.code)
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '获取失败', icon: 'none' })
  }
}

const handleSubmit = async (): Promise<void> => {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    const result = await authApi.register({
      tempToken: authStore.tempToken,
      nickname: form.nickname.trim(),
      avatar: form.avatar,
      gender: form.gender,
      birthday: form.birthday || undefined,
      realName: form.realName || undefined,
      wechatId: form.wechatId || undefined,
      email: form.email || undefined,
      age: form.age,
      favoriteColor: form.favoriteColor || undefined,
      occupation: form.occupation || undefined,
      tags: form.tags,
      identity: form.identity || undefined,
      inviteCode: inviteCode.value.trim().toUpperCase() || undefined,
      agreement: form.agreement,
    })
    authStore.setToken(result.token, result.refreshToken)
    authStore.setTempToken('')
    userStore.setUserInfo(result.userInfo)

    if (inviteCode.value.trim()) {
      try { await invitationApi.useCode(inviteCode.value.trim().toUpperCase()) } catch { /* 不影响流程 */ }
    }

    uni.showToast({ title: '入会成功', icon: 'success' })
    setTimeout(redirectToHome, 1000)
  } catch (err) {
    uni.showToast({ title: err instanceof Error ? err.message : '入会失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((options) => {
  if (!authStore.tempToken) uni.redirectTo({ url: '/pages/auth/auth' })
  if (options?.inviteCode) inviteCode.value = String(options.inviteCode).toUpperCase()
})
</script>

<style lang="scss" scoped>
.register {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 32rpx 32rpx 120rpx;

  // ── 步骤条 ──
  &__steps {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 32rpx;
  }
  &__step {
    display: flex;
    align-items: center;
  }
  &__step-dot {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    background: #e0e0e0;
    color: #999;
    font-size: 22rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    &.active { background: var(--color-primary); color: #fff; }
    &.done { background: var(--color-primary); color: #fff; }
  }
  &__step-line {
    width: 80rpx;
    height: 2rpx;
    background: #e0e0e0;
    margin: 0 8rpx;
    &.active { background: var(--color-primary); }
  }

  // ── 标题 ──
  &__title {
    text-align: center;
    font-size: 34rpx;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 40rpx;
  }

  // ── 表单 ──
  &__form {
    background: #fff;
    border-radius: 16rpx;
    padding: 8rpx 24rpx 24rpx;
    margin-bottom: 32rpx;
  }
  &__field {
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }
  }
  &__label {
    font-size: 26rpx;
    color: #666;
    margin-bottom: 12rpx;
    display: block;
    &-hint { font-size: 22rpx; color: #aaa; }
  }
  .required { color: #ff4d4f; margin-left: 4rpx; }

  // ── 输入框 ──
  &__input-wrap {
    height: 80rpx;
    padding: 0 20rpx;
    background: #f9f9f9;
    border-radius: 10rpx;
    border: 1rpx solid #e8e8e8;
    display: flex;
    align-items: center;
    &.error { border-color: #ff4d4f; }
  }
  &__input { flex: 1; font-size: 28rpx; color: #1a1a1a; }
  &__error { font-size: 22rpx; color: #ff4d4f; margin-top: 6rpx; }

  // ── 头像 ──
  &__avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28rpx 0;
    &-preview {
      width: 140rpx;
      height: 140rpx;
      border-radius: 50%;
      overflow: hidden;
      background: #f0f0f0;
    }
    &-img { width: 100%; height: 100%; }
    &-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 64rpx;
    }
    &-tip { font-size: 22rpx; color: #999; margin-top: 8rpx; }
  }

  // ── 手机号 ──
  &__phone-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 80rpx;
    padding: 0 20rpx;
    background: #f9f9f9;
    border-radius: 10rpx;
    border: 1rpx solid #e8e8e8;
  }
  &__phone-text { font-size: 28rpx; color: #1a1a1a; }
  &__phone-btn {
    font-size: 24rpx;
    color: var(--color-primary);
    background: transparent;
    padding: 0;
    &::after { border: none; }
  }

  // ── 性别选项 ──
  &__options {
    display: flex;
    gap: 16rpx;
  }
  &__option {
    flex: 1;
    height: 68rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1rpx solid #e8e8e8;
    border-radius: 10rpx;
    font-size: 26rpx;
    color: #666;
    &.active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: rgba(7, 193, 96, 0.06);
    }
  }

  // ── 日期选择 ──
  &__picker {
    height: 80rpx;
    padding: 0 20rpx;
    background: #f9f9f9;
    border-radius: 10rpx;
    border: 1rpx solid #e8e8e8;
    display: flex;
    align-items: center;
    font-size: 28rpx;
    color: #1a1a1a;
    .placeholder { color: #bbb; }
  }

  // ── 颜色选择 ──
  &__color-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  &__color-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 12rpx;
    border-radius: 10rpx;
    border: 2rpx solid transparent;
    &.active { border-color: var(--color-primary); background: rgba(7, 193, 96, 0.06); }
  }
  &__color-dot {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    border: 1rpx solid rgba(0,0,0,0.08);
  }
  &__color-label { font-size: 20rpx; color: #666; }

  // ── 标签 ──
  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
  }
  &__tag {
    padding: 10rpx 24rpx;
    border-radius: 40rpx;
    border: 1rpx solid #e8e8e8;
    font-size: 24rpx;
    color: #666;
    background: #f9f9f9;
    &.active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: rgba(7, 193, 96, 0.06);
    }
  }

  // ── 身份卡片 ──
  &__identity-cards {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
  &__identity-card {
    padding: 28rpx;
    border-radius: 12rpx;
    border: 2rpx solid #e8e8e8;
    background: #f9f9f9;
    &.active { border-color: var(--color-primary); background: rgba(7, 193, 96, 0.04); }
  }
  &__identity-badge {
    display: inline-block;
    width: 48rpx;
    height: 48rpx;
    line-height: 48rpx;
    text-align: center;
    border-radius: 50%;
    background: #e0e0e0;
    font-size: 24rpx;
    font-weight: bold;
    margin-bottom: 10rpx;
  }
  &__identity-name {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4rpx;
  }
  &__identity-desc { font-size: 22rpx; color: #999; }

  .register__identity-card.active .register__identity-badge {
    background: var(--color-primary);
    color: #fff;
  }

  // ── 协议 ──
  &__agreement { padding: 16rpx 0; }

  // ── 底部按钮 ──
  &__footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16rpx 32rpx;
    background: #fff;
    border-top: 1rpx solid #f0f0f0;
    display: flex;
    gap: 16rpx;
  }
  &__btn {
    flex: 1;
    height: 88rpx;
    border-radius: 44rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    font-weight: 500;
    &--back {
      background: #f5f5f5;
      color: #666;
      flex: 0 0 160rpx;
    }
    &--next, &--submit {
      background: var(--color-primary);
      color: #fff;
      &.disabled { background: #ccc; }
    }
  }
}
</style>
