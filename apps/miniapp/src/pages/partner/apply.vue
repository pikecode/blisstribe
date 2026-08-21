<template>
  <view class="partner-apply">
    <view class="partner-apply__intro">
      <text class="partner-apply__title">{{ pageTitle }}</text>
      <text class="partner-apply__desc">{{ pageDesc }}</text>
      <text v-if="auditReason" class="partner-apply__audit-reason">审核意见：{{ auditReason }}</text>
    </view>

    <view class="partner-apply__card">
      <view class="partner-apply__field">
        <text class="partner-apply__label">展示名称</text>
        <input class="partner-apply__input" :value="form.displayName" placeholder="例如：小林健康社群" maxlength="40" @input="onDisplayNameInput" />
      </view>

      <view class="partner-apply__field">
        <text class="partner-apply__label">主体类型</text>
        <view class="partner-apply__types">
          <view
            v-for="item in typeOptions"
            :key="item.value"
            class="partner-apply__type"
            :class="{ active: form.type === item.value }"
            @tap="form.type = item.value"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="partner-apply__field">
        <text class="partner-apply__label">联系人</text>
        <input class="partner-apply__input" :value="form.contactName" placeholder="负责人姓名" maxlength="30" @input="onContactNameInput" />
      </view>

      <view class="partner-apply__field">
        <text class="partner-apply__label">联系电话</text>
        <input class="partner-apply__input" :value="form.contactPhone" :placeholder="contactPhonePlaceholder" type="number" maxlength="11" @input="onContactPhoneInput" />
      </view>

      <view class="partner-apply__field">
        <text class="partner-apply__label">地区</text>
        <input class="partner-apply__input" :value="form.regionCode" placeholder="选填，如：深圳" maxlength="32" @input="onRegionInput" />
      </view>

      <view class="partner-apply__field partner-apply__field--column">
        <text class="partner-apply__label">经营说明</text>
        <textarea class="partner-apply__textarea" :value="description" placeholder="简单说明你的社群、渠道或服务能力" maxlength="200" @input="onDescriptionInput" />
      </view>
    </view>

    <view class="partner-apply__submit" :class="{ disabled: !canSubmit || submitting }" @tap="submit">
      {{ submitText }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { partnerApi } from '@/api/modules/partner'
import type { Partner, PartnerType } from '@blisstribe/shared'

type UniValueEvent = { detail?: { value?: string | number } }

const submitting = ref(false)
const description = ref('')
const existingPartner = ref<Partner | null>(null)

const form = reactive({
  displayName: '',
  type: 'group_leader' as PartnerType,
  contactName: '',
  contactPhone: '',
  regionCode: '',
})

const typeOptions: Array<{ label: string; value: PartnerType }> = [
  { label: '团长', value: 'group_leader' },
  { label: '达人', value: 'creator' },
  { label: '门店', value: 'store' },
  { label: '服务商', value: 'service_provider' },
  { label: '机构', value: 'agency' },
  { label: '个人', value: 'individual' },
]

const canEditExisting = computed(() => {
  return existingPartner.value?.status === 0 || existingPartner.value?.status === 2
})

const canSubmit = computed(() => {
  const hasContactPhone = form.contactPhone.trim().length >= 7 || !!existingPartner.value?.contactPhoneMasked
  return form.displayName.trim().length >= 2 && form.contactName.trim().length > 0 && hasContactPhone
})

const pageTitle = computed(() => {
  if (!existingPartner.value) return '申请成为经营伙伴'
  if (existingPartner.value.status === 2) return '修改入驻资料'
  if (existingPartner.value.status === 0) return '完善入驻资料'
  return '主体资料'
})

const pageDesc = computed(() => {
  if (!existingPartner.value) return '提交经营主体信息后，平台审核通过即可获得专属邀请码和客户管理能力。'
  if (existingPartner.value.status === 2) return '根据平台审核意见修改资料后，可重新提交审核。'
  if (existingPartner.value.status === 0) return '你的资料正在审核中，如需补充信息可以修改后重新提交。'
  return '当前状态暂不支持在小程序修改主体资料。'
})

const auditReason = computed(() => existingPartner.value?.status === 2 ? existingPartner.value.auditReason : '')
const contactPhonePlaceholder = computed(() => existingPartner.value?.contactPhoneMasked || '用于审核联系')
const submitText = computed(() => {
  if (submitting.value) return '提交中...'
  if (existingPartner.value?.status === 2) return '重新提交审核'
  if (existingPartner.value?.status === 0) return '保存修改并提交审核'
  return '提交申请'
})

function getEventValue(e: unknown): string {
  const detail = (e as UniValueEvent).detail
  return detail?.value === undefined ? '' : String(detail.value)
}

function onDisplayNameInput(e: InputEvent) { form.displayName = getEventValue(e) }
function onContactNameInput(e: InputEvent) { form.contactName = getEventValue(e) }
function onContactPhoneInput(e: InputEvent) { form.contactPhone = getEventValue(e) }
function onRegionInput(e: InputEvent) { form.regionCode = getEventValue(e) }
function onDescriptionInput(e: InputEvent) { description.value = getEventValue(e) }

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  if (existingPartner.value && !canEditExisting.value) {
    uni.showToast({ title: '当前状态不可修改资料', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      displayName: form.displayName.trim(),
      type: form.type,
      contactName: form.contactName.trim(),
      regionCode: form.regionCode.trim() || undefined,
      profile: { description: description.value.trim() },
    }
    const contactPhone = form.contactPhone.trim()
    if (existingPartner.value) {
      await partnerApi.updateMine({
        ...payload,
        ...(contactPhone && { contactPhone }),
      })
    } else {
      await partnerApi.apply({
        ...payload,
        contactPhone,
      })
    }
    uni.showToast({ title: existingPartner.value ? '已重新提交' : '已提交审核', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/partner/dashboard' }), 800)
  } catch {
    // 请求封装已展示错误
  } finally {
    submitting.value = false
  }
}

async function loadExistingPartner(): Promise<void> {
  try {
    const partner = await partnerApi.getMine()
    existingPartner.value = partner
    if (!partner) return
    form.displayName = partner.displayName
    form.type = partner.type
    form.contactName = partner.contactName || ''
    form.contactPhone = ''
    form.regionCode = partner.regionCode || ''
    const profile = partner.profile || {}
    description.value = typeof profile.description === 'string' ? profile.description : ''
  } catch {
    existingPartner.value = null
  }
}

onShow(loadExistingPartner)
</script>

<style lang="scss" scoped>
.partner-apply {
  min-height: 100vh;
  background: var(--color-bg);
  padding: 32rpx;

  &__intro {
    margin-bottom: 24rpx;
  }

  &__title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 12rpx;
  }

  &__desc {
    display: block;
    font-size: 26rpx;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }

  &__audit-reason {
    display: block;
    margin-top: 16rpx;
    padding: 20rpx 24rpx;
    border-radius: 12rpx;
    background: #fff8e6;
    color: #8a5a00;
    font-size: 24rpx;
    line-height: 1.5;
  }

  &__card {
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
  }

  &__field {
    padding: 28rpx 32rpx;
    border-bottom: 1rpx solid #f1f1f1;
    display: flex;
    align-items: center;
    gap: 24rpx;
    &:last-child { border-bottom: none; }
    &--column { display: block; }
  }

  &__label {
    width: 160rpx;
    flex-shrink: 0;
    font-size: 28rpx;
    color: var(--color-text);
  }

  &__input {
    flex: 1;
    text-align: right;
    font-size: 28rpx;
    color: var(--color-text);
  }

  &__types {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    justify-content: flex-end;
  }

  &__type {
    padding: 10rpx 20rpx;
    border-radius: 999rpx;
    border: 1rpx solid var(--color-border);
    font-size: 24rpx;
    color: var(--color-text-secondary);
    &.active {
      color: var(--color-primary);
      border-color: var(--color-primary);
      background: rgba(7, 193, 96, 0.08);
    }
  }

  &__textarea {
    width: 100%;
    min-height: 160rpx;
    margin-top: 20rpx;
    padding: 20rpx;
    box-sizing: border-box;
    background: #fafafa;
    border-radius: 12rpx;
    font-size: 28rpx;
  }

  &__submit {
    height: 88rpx;
    margin-top: 40rpx;
    border-radius: 16rpx;
    background: var(--color-primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    &.disabled {
      opacity: 0.45;
    }
  }
}
</style>
