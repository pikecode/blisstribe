<template>
  <view class="edit-profile">
    <view class="edit-profile__avatar" @tap="chooseAvatar">
      <view class="edit-profile__avatar-preview">
        <image
          v-if="form.avatar"
          :src="form.avatar"
          class="edit-profile__avatar-img"
          mode="aspectFill"
        />
        <text v-else class="edit-profile__avatar-placeholder">👤</text>
      </view>
      <text class="edit-profile__avatar-tip">点击更换头像</text>
    </view>

    <view class="edit-profile__form">
      <view class="edit-profile__field">
        <text class="edit-profile__label">昵称</text>
        <view class="edit-profile__input-wrap">
          <input
            class="edit-profile__input"
            :value="form.nickname"
            placeholder="请输入昵称"
            :maxlength="20"
            @input="form.nickname = $event.detail.value"
          />
        </view>
      </view>

      <view class="edit-profile__field">
        <text class="edit-profile__label">手机号</text>
        <view class="edit-profile__input-wrap edit-profile__input-wrap--readonly">
          <input
            class="edit-profile__input"
            :value="form.phone"
            disabled
            placeholder="手机号"
          />
        </view>
      </view>

      <view class="edit-profile__field">
        <text class="edit-profile__label">性别</text>
        <view class="edit-profile__gender">
          <view
            v-for="item in genderOptions"
            :key="item.value"
            class="edit-profile__gender-item"
            :class="{ 'is-active': form.gender === item.value }"
            @tap="form.gender = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="edit-profile__field">
        <text class="edit-profile__label">生日</text>
        <picker mode="date" :value="form.birthday" :end="today" @change="onBirthdayChange">
          <view class="edit-profile__picker">
            <text :class="{ 'is-placeholder': !form.birthday }">
              {{ form.birthday || '请选择生日' }}
            </text>
          </view>
        </picker>
      </view>
    </view>

    <view class="edit-profile__action">
      <view class="edit-profile__btn edit-profile__btn--primary" :loading="saving" @tap="handleSave">
        保存修改
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { userApi } from '@/api/modules/user'
import type { Gender } from '@blisstribe/shared'

const userStore = useUserStore()
const today = new Date().toISOString().slice(0, 10)
const saving = ref(false)

const form = reactive({
  nickname: '',
  phone: '',
  avatar: '',
  gender: 0 as Gender,
  birthday: '',
})

const genderOptions: { label: string; value: Gender }[] = [
  { label: '保密', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]

onShow(() => {
  if (userStore.userInfo) {
    form.nickname = userStore.userInfo.nickname
    form.phone = userStore.userInfo.phone
    form.avatar = userStore.userInfo.avatar
    form.gender = userStore.userInfo.gender
    form.birthday = userStore.userInfo.birthday || ''
  }
})

const onBirthdayChange = (e: { detail: { value: string } }): void => {
  form.birthday = e.detail.value
}

const chooseAvatar = async (): Promise<void> => {
  try {
    const { tempFilePaths } = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    if (!tempFilePaths.length) return
    const filePath = tempFilePaths[0]
    uni.showLoading({ title: '上传中...' })
    const result = await userApi.uploadAvatar(filePath)
    form.avatar = result.url
    uni.hideLoading()
  } catch {
    uni.hideLoading()
  }
}

const handleSave = async (): Promise<void> => {
  saving.value = true
  try {
    const updatedUser = await userApi.updateInfo({
      nickname: form.nickname.trim(),
      avatar: form.avatar,
      gender: form.gender,
      birthday: form.birthday || undefined,
    })
    userStore.setUserInfo(updatedUser)
    uni.showToast({ title: '保存成功', icon: 'success' })
    uni.navigateBack()
  } catch {
    // toast 已在请求拦截器处理
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.edit-profile {
  padding: 48rpx 32rpx;
  min-height: 100vh;
  background-color: var(--color-bg);

  &__avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 48rpx;
  }

  &__avatar-preview {
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

  &__avatar-tip {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  &__form {
    background-color: var(--color-bg-white);
    border-radius: var(--radius-md);
    padding: 32rpx 24rpx;
    margin-bottom: 32rpx;
  }

  &__field {
    padding: 16rpx 0;
  }

  &__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: 12rpx;
    display: block;
  }

  &__input-wrap {
    height: 88rpx;
    padding: 0 24rpx;
    border: 2rpx solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;

    &--readonly {
      background-color: var(--color-bg-gray);
    }
  }

  &__input {
    flex: 1;
    height: 100%;
    font-size: var(--font-size-md);
    color: var(--color-text);
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

  &__action {
    padding: 0 32rpx;
  }

  &__btn {
    width: 100%;
    height: 88rpx;
    border-radius: var(--radius-md);
    font-size: var(--font-size-lg);
    display: flex;
    align-items: center;
    justify-content: center;

    &--primary {
      background-color: var(--color-primary);
      color: #fff;
    }
  }
}
</style>
