<template>
  <view class="edit">
    <!-- 头像 -->
    <view class="edit__avatar" @tap="chooseAvatar">
      <view class="edit__avatar-wrap">
        <image v-if="form.avatar" :src="form.avatar" class="edit__avatar-img" mode="aspectFill" />
        <view v-else class="edit__avatar-placeholder">👤</view>
      </view>
      <text class="edit__avatar-tip">点击更换头像</text>
    </view>

    <!-- 基础信息 -->
    <view class="edit__section">
      <text class="edit__section-title">基础信息</text>
      <view class="edit__card">
        <view class="edit__row">
          <text class="edit__label">昵称</text>
          <input class="edit__input" :value="form.nickname" placeholder="请输入昵称" :maxlength="20" @input="form.nickname = $event.detail.value" />
        </view>
        <view class="edit__row">
          <text class="edit__label">真实姓名</text>
          <input class="edit__input" :value="form.realName" placeholder="选填" @input="form.realName = $event.detail.value" />
        </view>
        <view class="edit__row edit__row--readonly">
          <text class="edit__label">手机号</text>
          <text class="edit__value">{{ form.phone }}</text>
        </view>
        <view class="edit__row">
          <text class="edit__label">性别</text>
          <view class="edit__options">
            <view v-for="g in genderOptions" :key="g.value" class="edit__option" :class="{ active: form.gender === g.value }" @tap="form.gender = g.value">
              <text>{{ g.label }}</text>
            </view>
          </view>
        </view>
        <view class="edit__row">
          <text class="edit__label">生日</text>
          <picker mode="date" :value="form.birthday" :end="today" @change="e => form.birthday = e.detail.value">
            <text :class="['edit__value', { placeholder: !form.birthday }]">{{ form.birthday || '请选择' }}</text>
          </picker>
        </view>
        <view class="edit__row">
          <text class="edit__label">年龄</text>
          <input class="edit__input" :value="form.age ? String(form.age) : ''" placeholder="选填" type="number" :maxlength="3" @input="form.age = Number($event.detail.value) || undefined" />
        </view>
      </view>
    </view>

    <!-- 联系方式 -->
    <view class="edit__section">
      <text class="edit__section-title">联系方式</text>
      <view class="edit__card">
        <view class="edit__row">
          <text class="edit__label">微信号</text>
          <input class="edit__input" :value="form.wechatId" placeholder="选填" @input="form.wechatId = $event.detail.value" />
        </view>
        <view class="edit__row">
          <text class="edit__label">邮箱</text>
          <input class="edit__input" :value="form.email" placeholder="选填" type="email" @input="form.email = $event.detail.value" />
        </view>
        <view class="edit__row">
          <text class="edit__label">抖音收款码</text>
          <view class="edit__upload" @tap="choosePayCode">
            <image v-if="form.douyinPayCode" :src="form.douyinPayCode" class="edit__upload-preview" mode="aspectFill" />
            <view v-else class="edit__upload-placeholder">
              <text class="edit__upload-icon">＋</text>
              <text class="edit__upload-text">上传收款码</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 职业与标签 -->
    <view class="edit__section">
      <text class="edit__section-title">职业与标签</text>
      <view class="edit__card">
        <view class="edit__row">
          <text class="edit__label">职业</text>
          <input class="edit__input" :value="form.occupation" placeholder="选填" @input="form.occupation = $event.detail.value" />
        </view>
        <view class="edit__row edit__row--column">
          <text class="edit__label">喜欢的颜色</text>
          <view class="edit__colors">
            <view v-for="c in colorOptions" :key="c.value" class="edit__color-item" :class="{ active: form.favoriteColor === c.value }" @tap="form.favoriteColor = form.favoriteColor === c.value ? '' : c.value">
              <view class="edit__color-dot" :style="{ background: c.hex }" />
              <text class="edit__color-label">{{ c.label }}</text>
            </view>
          </view>
        </view>
        <view class="edit__row edit__row--column">
          <text class="edit__label">自我标签 <text class="edit__label-hint">最多5个</text></text>
          <view class="edit__tags">
            <view v-for="tag in tagOptions" :key="tag" class="edit__tag" :class="{ active: form.tags.includes(tag) }" @tap="toggleTag(tag)">
              <text>{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 注册身份 -->
    <view class="edit__section">
      <text class="edit__section-title">注册身份</text>
      <view class="edit__card">
        <view class="edit__identity-list">
          <view v-for="id in identityOptions" :key="id.value" class="edit__identity-item" :class="{ active: form.identity === id.value }" @tap="form.identity = id.value">
            <view class="edit__identity-badge" :class="{ active: form.identity === id.value }">{{ id.value }}</view>
            <view>
              <text class="edit__identity-name">{{ id.label }}</text>
              <text class="edit__identity-desc">{{ id.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="edit__footer">
      <view class="edit__save-btn" :class="{ loading: saving }" @tap="handleSave">
        {{ saving ? '保存中...' : '保存修改' }}
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
  nickname: '', phone: '', avatar: '',
  gender: 0 as Gender, birthday: '',
  realName: '', wechatId: '', email: '',
  age: undefined as number | undefined,
  favoriteColor: '', occupation: '',
  tags: [] as string[], identity: '',
  douyinPayCode: '',
})

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

function toggleTag(tag: string) {
  const idx = form.tags.indexOf(tag)
  if (idx >= 0) form.tags.splice(idx, 1)
  else if (form.tags.length < 5) form.tags.push(tag)
}

onShow(async () => {
  try {
    const u = await userApi.getInfo()
    userStore.setUserInfo(u)
    form.nickname = u.nickname
    form.phone = u.phone
    form.avatar = u.avatar
    form.gender = u.gender
    form.birthday = u.birthday || ''
    form.realName = u.realName || ''
    form.wechatId = u.wechatId || ''
    form.email = u.email || ''
    form.age = u.age
    form.favoriteColor = u.favoriteColor || ''
    form.occupation = u.occupation || ''
    form.tags = [...(u.tags || [])]
    form.identity = u.identity || ''
    form.douyinPayCode = u.douyinPayCode || ''
  } catch {
    // 接口失败时回退到本地缓存
    const u = userStore.userInfo
    if (!u) return
    form.nickname = u.nickname
    form.phone = u.phone
    form.avatar = u.avatar
    form.gender = u.gender
    form.birthday = u.birthday || ''
    form.realName = u.realName || ''
    form.wechatId = u.wechatId || ''
    form.email = u.email || ''
    form.age = u.age
    form.favoriteColor = u.favoriteColor || ''
    form.occupation = u.occupation || ''
    form.tags = [...(u.tags || [])]
    form.identity = u.identity || ''
    form.douyinPayCode = u.douyinPayCode || ''
  }
})

const chooseAvatar = async () => {
  try {
    const { tempFilePaths } = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    if (!tempFilePaths.length) return
    uni.showLoading({ title: '上传中...' })
    const result = await userApi.uploadAvatar(tempFilePaths[0])
    form.avatar = result.url
  } catch { /* ignore */ } finally { uni.hideLoading() }
}

const choosePayCode = async () => {
  try {
    const { tempFilePaths } = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    if (!tempFilePaths.length) return
    uni.showLoading({ title: '上传中...' })
    const result = await userApi.uploadAvatar(tempFilePaths[0])
    form.douyinPayCode = result.url
  } catch { /* ignore */ } finally { uni.hideLoading() }
}

const handleSave = async () => {
  saving.value = true
  try {
    const updated = await userApi.updateInfo({
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
      douyinPayCode: form.douyinPayCode || undefined,
    })
    userStore.setUserInfo(updated)
    uni.showToast({ title: '保存成功', icon: 'success' })
    uni.navigateBack()
  } catch { /* toast handled by interceptor */ } finally { saving.value = false }
}
</script>

<style lang="scss" scoped>
.edit {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;

  &__avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 0 32rpx;
    background: #fff;
    margin-bottom: 16rpx;
    &-wrap {
      width: 140rpx; height: 140rpx;
      border-radius: 50%; overflow: hidden; background: #f0f0f0;
    }
    &-img { width: 100%; height: 100%; }
    &-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 64rpx;
    }
    &-tip { font-size: 24rpx; color: #999; margin-top: 12rpx; }
  }

  &__section {
    margin-bottom: 16rpx;
    &-title {
      font-size: 24rpx; color: #999; letter-spacing: 1rpx;
      padding: 16rpx 32rpx 8rpx;
    }
  }

  &__card {
    background: #fff;
    border-radius: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    padding: 28rpx 32rpx;
    border-bottom: 1rpx solid #f5f5f5;
    min-height: 88rpx;
    &:last-child { border-bottom: none; }
    &--readonly { background: #fafafa; }
    &--column { flex-direction: column; align-items: flex-start; gap: 20rpx; }
  }

  &__label {
    width: 160rpx; flex-shrink: 0;
    font-size: 28rpx; color: #333;
    &-hint { font-size: 22rpx; color: #aaa; margin-left: 8rpx; }
  }

  &__input {
    flex: 1; font-size: 28rpx; color: #1a1a1a;
    text-align: right;
  }

  &__value {
    flex: 1; font-size: 28rpx; color: #1a1a1a; text-align: right;
    &.placeholder { color: #bbb; }
  }

  &__options {
    display: flex; gap: 16rpx; flex: 1; justify-content: flex-end;
  }
  &__option {
    padding: 8rpx 24rpx;
    border-radius: 30rpx; border: 1rpx solid #e8e8e8;
    font-size: 24rpx; color: #666;
    &.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(7,193,96,0.06); }
  }

  &__upload {
    flex: 1; display: flex; justify-content: flex-end;
    &-preview { width: 120rpx; height: 120rpx; border-radius: 8rpx; }
    &-placeholder {
      width: 120rpx; height: 120rpx; border-radius: 8rpx;
      border: 1rpx dashed #ddd; display: flex; flex-direction: column;
      align-items: center; justify-content: center; background: #fafafa;
    }
    &-icon { font-size: 36rpx; color: #ccc; }
    &-text { font-size: 20rpx; color: #ccc; margin-top: 4rpx; }
  }

  &__colors {
    display: flex; flex-wrap: wrap; gap: 16rpx;
  }
  &__color-item {
    display: flex; flex-direction: column; align-items: center; gap: 6rpx;
    padding: 10rpx; border-radius: 8rpx; border: 2rpx solid transparent;
    &.active { border-color: var(--color-primary); background: rgba(7,193,96,0.06); }
  }
  &__color-dot { width: 44rpx; height: 44rpx; border-radius: 50%; border: 1rpx solid rgba(0,0,0,0.08); }
  &__color-label { font-size: 20rpx; color: #666; }

  &__tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
  &__tag {
    padding: 10rpx 24rpx; border-radius: 32rpx;
    border: 1rpx solid #e8e8e8; font-size: 24rpx; color: #666; background: #fafafa;
    &.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(7,193,96,0.06); }
  }

  &__identity-list { display: flex; flex-direction: column; }
  &__identity-item {
    display: flex; align-items: center; gap: 24rpx;
    padding: 28rpx 32rpx; border-bottom: 1rpx solid #f5f5f5;
    &:last-child { border-bottom: none; }
    &.active { background: rgba(7,193,96,0.03); }
  }
  &__identity-badge {
    width: 52rpx; height: 52rpx; border-radius: 50%; flex-shrink: 0;
    background: #e0e0e0; color: #666; font-size: 24rpx; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    &.active { background: var(--color-primary); color: #fff; }
  }
  &__identity-name { display: block; font-size: 28rpx; font-weight: 500; color: #1a1a1a; margin-bottom: 4rpx; }
  &__identity-desc { font-size: 22rpx; color: #999; }

  &__footer {
    position: fixed; bottom: 0; left: 0; right: 0;
    padding: 16rpx 32rpx; background: #fff; border-top: 1rpx solid #f0f0f0;
  }
  &__save-btn {
    height: 88rpx; background: var(--color-primary); color: #fff;
    border-radius: 44rpx; font-size: 30rpx; font-weight: 500;
    display: flex; align-items: center; justify-content: center;
    &.loading { background: #ccc; }
  }
}
</style>
