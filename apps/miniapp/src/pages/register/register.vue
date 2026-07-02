<template>
  <view class="register">
    <view class="register__header">
      <text class="register__title">完善个人信息</text>
    </view>

    <view class="register__avatar" @tap="chooseAvatar">
      <view class="register__avatar-preview">
        <image
          v-if="form.avatar"
          :src="form.avatar"
          class="register__avatar-img"
          mode="aspectFill"
        />
        <view v-else class="register__avatar-placeholder">👤</view>
      </view>
      <text class="register__avatar-tip">点击更换头像</text>
    </view>

    <view class="register__form">
      <view class="register__field">
        <text class="register__label">昵称</text>
        <view class="register__input-wrap" :class="{ 'register__input-wrap--error': errors.nickname }">
          <input
            class="register__input"
            :value="nickname"
            placeholder="请输入昵称（2-20字符）"
            :maxlength="20"
            @input="onNicknameInput"
          />
        </view>
        <text v-if="errors.nickname" class="register__error-text">{{ errors.nickname }}</text>
      </view>

      <view class="register__field">
        <text class="register__label">手机号</text>
        <view class="register__phone">
          <text class="register__phone-text">{{ phoneMasked || '请先获取手机号' }}</text>
          <button
            class="register__phone-btn"
            open-type="getPhoneNumber"
            @getphonenumber="onGetPhoneNumber"
          >
            {{ phoneMasked ? '已获取' : '获取手机号' }}
          </button>
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">性别</text>
        <view class="register__gender">
          <view
            v-for="item in genderOptions"
            :key="item.value"
            class="register__gender-item"
            :class="{ 'is-active': form.gender === item.value }"
            @tap="form.gender = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="register__field">
        <text class="register__label">生日（可选）</text>
        <picker mode="date" :value="form.birthday" :end="today" @change="onBirthdayChange">
          <view class="register__picker">
            <text :class="{ 'is-placeholder': !form.birthday }">
              {{ form.birthday || '请选择生日' }}
            </text>
          </view>
        </picker>
      </view>
    </view>

    <view class="register__agreement">
      <UserAgreement v-model="form.agreement" />
    </view>

    <view class="register__action">
      <AppButton type="primary" :loading="submitting" :disabled="!canSubmit" @tap="handleSubmit">
        完成注册
      </AppButton>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { useUpload } from '@/composables/useUpload'
import { authApi } from '@/api/modules/auth'
import { isValidNickname } from '@/utils/validate'
import { redirectToHome } from '@/utils/auth'
import UserAgreement from '@/components/business/UserAgreement.vue'
import type { Gender, RegisterForm } from '@blisstribe/shared'

const authStore = useAuthStore()
const userStore = useUserStore()
const { getPhoneNumber } = useAuth()
const { chooseAndUploadAvatar } = useUpload()

const defaultAvatar = '/static/images/default-avatar.png'
const today = new Date().toISOString().slice(0, 10)

const form = reactive<RegisterForm>({
  avatar: '',
  gender: 0,
  birthday: '',
  agreement: false,
})

const nickname = ref('')
const errors = reactive({ nickname: '' })
const phoneMasked = ref('')
const submitting = ref(false)

const genderOptions: { label: string; value: Gender }[] = [
  { label: '保密', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]

const canSubmit = computed(
  () =>
    !!nickname.value &&
    !!phoneMasked.value &&
    form.agreement &&
    !submitting.value
)

onLoad(() => {
  // 无 tempToken 说明流程异常，回授权页
  if (!authStore.tempToken) {
    uni.redirectTo({ url: '/pages/auth/auth' })
  }
})

const chooseAvatar = async (): Promise<void> => {
  try {
    const { tempFilePaths } = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    if (!tempFilePaths.length) return
    // 注册流程中不上传到后端，只用本地临时路径
    form.avatar = tempFilePaths[0]
  } catch {
    // 用户取消选择
  }
}

const onNicknameInput = (e: { detail: { value: string } }): void => {
  nickname.value = e.detail.value
}

const onGetPhoneNumber = async (e: { detail: { code?: string; errMsg?: string } }): Promise<void> => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok' || !e.detail.code) {
    uni.showToast({ title: '未获取到手机号', icon: 'none' })
    return
  }
  try {
    phoneMasked.value = await getPhoneNumber(e.detail.code)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '获取手机号失败'
    uni.showToast({ title: msg, icon: 'none' })
  }
}

const onBirthdayChange = (e: { detail: { value: string } }): void => {
  form.birthday = e.detail.value
}

const validate = (): boolean => {
  errors.nickname = ''
  if (!isValidNickname(nickname.value)) {
    errors.nickname = '昵称需 2-20 字符'
    return false
  }
  if (!phoneMasked.value) {
    uni.showToast({ title: '请先点击获取手机号', icon: 'none' })
    return false
  }
  if (!form.agreement) {
    uni.showToast({ title: '请同意用户协议', icon: 'none' })
    return false
  }
  return true
}

const handleSubmit = async (): Promise<void> => {
  if (!validate()) return
  if (submitting.value) return
  submitting.value = true

  try {
    const result = await authApi.register({
      tempToken: authStore.tempToken,
      nickname: nickname.value.trim(),
      avatar: form.avatar,
      gender: form.gender,
      birthday: form.birthday || undefined,
      agreement: form.agreement,
    })
    authStore.setToken(result.token, result.refreshToken)
    authStore.setTempToken('')
    userStore.setUserInfo(result.userInfo)
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(redirectToHome, 1000)
  } catch (err) {
    const msg = err instanceof Error ? err.message : '注册失败'
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.register {
  padding: 48rpx 32rpx;
  min-height: 100vh;
  background-color: var(--color-bg);

  &__header {
    text-align: center;
    margin-bottom: 48rpx;
  }

  &__title {
    font-size: 40rpx;
    font-weight: bold;
    color: var(--color-text);
  }

  &__avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 48rpx;
  }

  &__avatar-tip {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  &__avatar-preview {
    position: relative;
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    overflow: hidden;
    background-color: var(--color-bg-gray);
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64rpx;
  }

  &__input-wrap {
    height: 88rpx;
    padding: 0 24rpx;
    background-color: var(--color-bg-white);
    border: 2rpx solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;

    &--error {
      border-color: var(--color-danger);
    }
  }

  &__input {
    flex: 1;
    height: 100%;
    font-size: var(--font-size-md);
    color: var(--color-text);
  }

  &__error-text {
    margin-top: 8rpx;
    padding-left: 24rpx;
    font-size: var(--font-size-xs);
    color: var(--color-danger);
  }

  &__form {
    background-color: var(--color-bg-white);
    border-radius: var(--radius-md);
    padding: 32rpx 24rpx;
    margin-bottom: 32rpx;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    padding: 16rpx 0;
  }

  &__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__phone {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 24rpx;
    border: 2rpx solid var(--color-border);
    border-radius: var(--radius-md);
  }

  &__phone-text {
    font-size: var(--font-size-md);
    color: var(--color-text);
  }

  &__phone-btn {
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    background: transparent;
    padding: 0;

    &::after {
      border: none;
    }
  }

  &__gender {
    display: flex;
    gap: 16rpx;
  }

  &__gender-item {
    flex: 1;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);

    &.is-active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background-color: rgba(7, 193, 96, 0.08);
    }
  }

  &__picker {
    height: 88rpx;
    display: flex;
    align-items: center;
    padding: 0 24rpx;
    border: 2rpx solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-md);

    .is-placeholder {
      color: var(--color-text-placeholder);
    }
  }

  &__agreement {
    margin-bottom: 48rpx;
  }

  &__action {
    padding: 0 32rpx;
  }
}
</style>
