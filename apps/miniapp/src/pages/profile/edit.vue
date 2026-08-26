<template>
  <view class="edit">
    <view class="edit__hero">
      <view class="edit__avatar" @tap="chooseAvatar">
        <view class="edit__avatar-wrap">
          <image v-if="form.avatar" :src="form.avatar" class="edit__avatar-img" mode="aspectFill" />
          <view v-else class="edit__avatar-placeholder">头像</view>
        </view>
        <view class="edit__avatar-action">更换头像</view>
      </view>
      <view class="edit__hero-main">
        <text class="edit__hero-title">{{ form.nickname || '完善个人资料' }}</text>
        <text class="edit__hero-desc">资料和标签会用于服务推荐、咨询跟进和伙伴识别。</text>
      </view>
    </view>

    <view class="edit__section">
      <view class="edit__section-head">
        <text class="edit__section-title">基础信息</text>
        <text class="edit__section-desc">用于账号识别</text>
      </view>
      <view class="edit__card">
        <view class="edit__row">
          <text class="edit__label">昵称</text>
          <input class="edit__input" :value="form.nickname" placeholder="请输入昵称" :maxlength="20" @input="onNicknameInput" />
        </view>
        <view class="edit__row">
          <text class="edit__label">真实姓名</text>
          <input class="edit__input" :value="form.realName" placeholder="选填" @input="onRealNameInput" />
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
          <picker mode="date" :value="form.birthday" :end="today" @change="onBirthdayChange">
            <text :class="['edit__value', { placeholder: !form.birthday }]">{{ form.birthday || '请选择' }}</text>
          </picker>
        </view>
        <view class="edit__row">
          <text class="edit__label">年龄</text>
          <input class="edit__input" :value="form.age ? String(form.age) : ''" placeholder="选填" type="number" :maxlength="3" @input="onAgeInput" />
        </view>
      </view>
    </view>

    <view class="edit__section">
      <view class="edit__section-head">
        <text class="edit__section-title">联系方式</text>
        <text class="edit__section-desc">便于后续服务沟通</text>
      </view>
      <view class="edit__card">
        <view class="edit__row">
          <text class="edit__label">微信号</text>
          <input class="edit__input" :value="form.wechatId" placeholder="选填" @input="onWechatIdInput" />
        </view>
        <view class="edit__row">
          <text class="edit__label">邮箱</text>
          <input class="edit__input" :value="form.email" placeholder="选填" type="email" @input="onEmailInput" />
        </view>
      </view>
    </view>

    <view class="edit__section">
      <view class="edit__section-head">
        <text class="edit__section-title">偏好标签</text>
        <text class="edit__section-desc">用于提升推荐准确度</text>
      </view>
      <view class="edit__card">
        <view class="edit__row">
          <text class="edit__label">职业</text>
          <input class="edit__input" :value="form.occupation" placeholder="选填" @input="onOccupationInput" />
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
          <view v-if="tagGroups.length" class="edit__tag-groups">
            <view v-for="group in tagGroups" :key="group.label" class="edit__tag-group">
              <text class="edit__tag-group-title">{{ group.label }}</text>
              <view class="edit__tags">
                <view
                  v-for="tag in group.options"
                  :key="tag.id"
                  class="edit__tag"
                  :class="{ active: isTagSelected(tag.id) }"
                  @tap="toggleTag(tag)"
                >
                  <text>{{ tag.name }}</text>
                </view>
              </view>
            </view>
          </view>
          <text v-else class="edit__tag-empty">暂无可选标签</text>
        </view>
      </view>
    </view>

    <view class="edit__section">
      <view class="edit__section-head">
        <text class="edit__section-title">注册身份</text>
        <text class="edit__section-desc">决定后续工作台入口</text>
      </view>
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
import { computed, ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/modules/user'
import { userApi } from '@/api/modules/user'
import { productApi, type TagDictionary } from '@/api/modules/product'
import type { Gender } from '@blisstribe/shared'

type UniValueEvent = { detail?: { value?: string | number } }

const userStore = useUserStore()
const today = new Date().toISOString().slice(0, 10)
const saving = ref(false)

const form = reactive({
  nickname: '', phone: '', avatar: '',
  gender: 0 as Gender, birthday: '',
  realName: '', wechatId: '', email: '',
  age: undefined as number | undefined,
  favoriteColor: '', occupation: '',
  tags: [] as string[], tagIds: [] as number[], identity: '',
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

const tagOptions = ref<TagDictionary[]>([])
const tagGroups = computed(() => {
  const groups = new Map<string, TagDictionary[]>()
  for (const tag of tagOptions.value) {
    const moduleName = tag.module?.name || '通用'
    const label = `${moduleName} / ${tag.group || '未分组'}`
    groups.set(label, [...(groups.get(label) || []), tag])
  }
  return Array.from(groups.entries()).map(([label, options]) => ({ label, options }))
})

const identityOptions = [
  { value: 'C', label: '单纯消费者', desc: '享受会员权益与服务' },
  { value: 'B', label: '产品供应商', desc: '提供优质产品与合作' },
  { value: 'S', label: '服务供应商', desc: '提供专业服务与支持' },
]

function isTagSelected(tagId: number) {
  return form.tagIds.includes(tagId)
}

function toggleTag(tag: TagDictionary) {
  const idx = form.tagIds.indexOf(tag.id)
  if (idx >= 0) {
    form.tagIds.splice(idx, 1)
    form.tags = form.tags.filter((name) => name !== tag.name)
    return
  }
  if (form.tagIds.length >= 5) {
    uni.showToast({ title: '最多选择5个标签', icon: 'none' })
    return
  }
  form.tagIds.push(tag.id)
  if (!form.tags.includes(tag.name)) form.tags.push(tag.name)
}

function getEventValue(e: unknown): string {
  const detail = (e as UniValueEvent).detail
  return detail?.value === undefined ? '' : String(detail.value)
}

function onNicknameInput(e: InputEvent) {
  form.nickname = getEventValue(e)
}

function onRealNameInput(e: InputEvent) {
  form.realName = getEventValue(e)
}

function onBirthdayChange(e: unknown) {
  form.birthday = getEventValue(e)
}

function onAgeInput(e: InputEvent) {
  form.age = Number(getEventValue(e)) || undefined
}

function onWechatIdInput(e: InputEvent) {
  form.wechatId = getEventValue(e)
}

function onEmailInput(e: InputEvent) {
  form.email = getEventValue(e)
}

function onOccupationInput(e: InputEvent) {
  form.occupation = getEventValue(e)
}

onShow(async () => {
  await loadTagOptions()
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
    form.tagIds = resolveSelectedTagIds(u.tagIds || [], u.tags || [])
    form.identity = u.identity || ''
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
    form.tagIds = resolveSelectedTagIds(u.tagIds || [], u.tags || [])
    form.identity = u.identity || ''
  }
})

async function loadTagOptions() {
  try {
    tagOptions.value = await productApi.listTags({ status: 1 })
  } catch {
    tagOptions.value = []
  }
}

function resolveSelectedTagIds(tagIds: number[], tags: string[]) {
  if (tagIds.length) return tagIds
  const names = new Set(tags)
  return tagOptions.value.filter((item) => names.has(item.name)).map((item) => item.id)
}

const chooseAvatar = async () => {
  try {
    const { tempFilePaths } = await uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
    if (!tempFilePaths.length) return
    uni.showLoading({ title: '上传中...' })
    const result = await userApi.uploadAvatar(tempFilePaths[0])
    form.avatar = result.url
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
      tagIds: form.tagIds,
      identity: form.identity || undefined,
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
  background: #f4f6f5;
  padding: 20rpx 22rpx 132rpx;

  &__hero {
    display: flex;
    align-items: center;
    gap: 22rpx;
    padding: 26rpx;
    background: #fff;
    border-radius: 20rpx;
    box-shadow: 0 10rpx 26rpx rgba(31, 41, 55, 0.06);
    margin-bottom: 22rpx;
  }

  &__avatar {
    position: relative;
    flex-shrink: 0;

    &-wrap {
      width: 124rpx;
      height: 124rpx;
      border-radius: 62rpx;
      overflow: hidden;
      background: #edf3f0;
      border: 4rpx solid #fff;
      box-shadow: 0 8rpx 18rpx rgba(31, 41, 55, 0.12);
    }

    &-img {
      width: 100%;
      height: 100%;
    }

    &-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #667085;
      font-size: 24rpx;
      font-weight: 600;
    }

    &-action {
      position: absolute;
      left: 50%;
      bottom: -10rpx;
      transform: translateX(-50%);
      min-width: 108rpx;
      padding: 6rpx 12rpx;
      border-radius: 999rpx;
      background: #07c160;
      color: #fff;
      font-size: 20rpx;
      line-height: 26rpx;
      text-align: center;
      box-shadow: 0 6rpx 14rpx rgba(7, 193, 96, 0.24);
    }
  }

  &__hero-main {
    flex: 1;
    min-width: 0;
  }

  &__hero-title {
    display: block;
    color: #1f2937;
    font-size: 34rpx;
    font-weight: 750;
    line-height: 44rpx;
  }

  &__hero-desc {
    display: block;
    color: #667085;
    font-size: 24rpx;
    line-height: 34rpx;
    margin-top: 6rpx;
  }

  &__section {
    margin-bottom: 22rpx;
  }

  &__section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18rpx;
    padding: 0 6rpx 10rpx;
  }

  &__section-title {
    color: #1f2937;
    font-size: 29rpx;
    font-weight: 700;
    line-height: 36rpx;
  }

  &__section-desc {
    color: #98a2b3;
    font-size: 22rpx;
    line-height: 30rpx;
    text-align: right;
  }

  &__card {
    background: #fff;
    border-radius: 18rpx;
    overflow: hidden;
    box-shadow: 0 8rpx 22rpx rgba(31, 41, 55, 0.045);
  }

  &__row {
    display: flex;
    align-items: center;
    min-height: 96rpx;
    padding: 20rpx 26rpx;
    border-bottom: 1rpx solid #eef1f0;

    &:last-child {
      border-bottom: none;
    }

    &--readonly {
      background: #fafcfb;
    }

    &--column {
      flex-direction: column;
      align-items: flex-start;
      gap: 16rpx;
      padding-top: 24rpx;
      padding-bottom: 26rpx;
    }
  }

  &__label {
    width: 164rpx;
    flex-shrink: 0;
    color: #344054;
    font-size: 28rpx;
    font-weight: 600;
    line-height: 38rpx;

    &-hint {
      color: #98a2b3;
      font-size: 22rpx;
      font-weight: 400;
      margin-left: 8rpx;
    }
  }

  &__input {
    flex: 1;
    min-width: 0;
    color: #101828;
    font-size: 28rpx;
    line-height: 40rpx;
    text-align: right;
  }

  &__value {
    flex: 1;
    min-width: 0;
    color: #101828;
    font-size: 28rpx;
    line-height: 40rpx;
    text-align: right;

    &.placeholder {
      color: #b6beca;
    }
  }

  &__options {
    display: flex;
    flex: 1;
    justify-content: flex-end;
    gap: 10rpx;
  }

  &__option {
    min-width: 82rpx;
    padding: 9rpx 18rpx;
    border-radius: 999rpx;
    border: 1rpx solid #d0d5dd;
    color: #667085;
    font-size: 24rpx;
    line-height: 32rpx;
    text-align: center;

    &.active {
      border-color: #07c160;
      color: #08783d;
      background: #e9f8ef;
      font-weight: 600;
    }
  }

  &__colors {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(5, 1fr);
    gap: 12rpx;
  }

  &__color-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 12rpx 8rpx;
    border-radius: 14rpx;
    border: 1rpx solid #edf0ef;
    background: #fafcfb;

    &.active {
      border-color: #07c160;
      background: #e9f8ef;
    }
  }

  &__color-dot {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    border: 1rpx solid rgba(0,0,0,0.08);
  }

  &__color-label {
    color: #667085;
    font-size: 20rpx;
    line-height: 28rpx;
  }

  &__tag-groups {
    display: flex;
    flex-direction: column;
    gap: 18rpx;
    width: 100%;
  }

  &__tag-group-title {
    display: block;
    color: #667085;
    font-size: 23rpx;
    font-weight: 600;
    line-height: 30rpx;
    margin-bottom: 10rpx;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
  }

  &__tag {
    max-width: 260rpx;
    padding: 9rpx 20rpx;
    border-radius: 999rpx;
    border: 1rpx solid #d0d5dd;
    color: #475467;
    background: #fff;
    font-size: 24rpx;
    line-height: 32rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.active {
      border-color: #07c160;
      color: #08783d;
      background: #e9f8ef;
      font-weight: 600;
    }
  }

  &__tag-empty {
    color: #98a2b3;
    font-size: 24rpx;
    line-height: 36rpx;
  }

  &__identity-list {
    display: flex;
    flex-direction: column;
  }

  &__identity-item {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 22rpx 26rpx;
    border-bottom: 1rpx solid #eef1f0;

    &:last-child {
      border-bottom: none;
    }

    &.active {
      background: #f1fbf5;
    }
  }

  &__identity-badge {
    width: 54rpx;
    height: 54rpx;
    border-radius: 50%;
    flex-shrink: 0;
    background: #edf0ef;
    color: #667085;
    font-size: 24rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;

    &.active {
      background: #07c160;
      color: #fff;
    }
  }

  &__identity-name {
    display: block;
    color: #1f2937;
    font-size: 28rpx;
    font-weight: 650;
    line-height: 36rpx;
    margin-bottom: 2rpx;
  }

  &__identity-desc {
    color: #667085;
    font-size: 22rpx;
    line-height: 30rpx;
  }

  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 14rpx 22rpx calc(14rpx + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1rpx solid #eef1f0;
    box-shadow: 0 -8rpx 24rpx rgba(31, 41, 55, 0.06);
  }

  &__save-btn {
    height: 88rpx;
    border-radius: 44rpx;
    background: #07c160;
    color: #fff;
    font-size: 30rpx;
    font-weight: 700;
    line-height: 88rpx;
    text-align: center;
    box-shadow: 0 10rpx 22rpx rgba(7, 193, 96, 0.24);

    &.loading {
      background: #a6b5ad;
      box-shadow: none;
    }
  }
}
</style>
