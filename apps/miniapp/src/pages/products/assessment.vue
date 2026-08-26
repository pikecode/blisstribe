<template>
  <view class="assessment">
    <view class="assessment__head">
      <text class="assessment__eyebrow">需求评估</text>
      <text class="assessment__title">{{ currentTemplate.title }}</text>
      <text class="assessment__subtitle">{{ currentTemplate.subtitle }}</text>
      <view class="assessment__progress">
        <view class="assessment__progress-bar">
          <view class="assessment__progress-value" :style="{ width: `${progressPercent}%` }" />
        </view>
        <text class="assessment__progress-text">{{ answeredCount }}/{{ currentTemplate.questions.length }}</text>
      </view>
    </view>

    <view class="assessment__form">
      <view v-for="(question, index) in currentTemplate.questions" :key="question.key" class="question">
        <view class="question__head">
          <text class="question__index">{{ index + 1 }}</text>
          <text class="question__title">{{ question.title }}</text>
        </view>
        <view class="question__options">
          <view
            v-for="option in question.options"
            :key="option.value"
            class="question__option"
            :class="{ active: answers[question.key] === option.value }"
            @tap="answers[question.key] = option.value"
          >
            <text>{{ option.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="assessment__footer">
      <view class="assessment__submit" :class="{ disabled: !canSubmit }" @tap="submitAssessment">生成推荐</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { productApi, type AssessmentTemplate as RemoteAssessmentTemplate } from '@/api/modules/product'
import { useHealthAssessment } from '@/composables/useHealthAssessment'

interface Option {
  label: string
  value: string
  tags: string[]
  tagIds?: number[]
  tagWeights?: Record<string, number>
}

interface Question {
  key: string
  title: string
  options: Option[]
}

interface LocalAssessmentTemplate {
  title: string
  subtitle: string
  questions: Question[]
}

const { saveAssessment } = useHealthAssessment()
let returnModuleCode = 'health'
const assessmentType = ref('health')

const templates: Record<string, LocalAssessmentTemplate> = {
  health: {
    title: '健康需求评估',
    subtitle: '回答几个问题，先缩小推荐范围',
    questions: [
      {
        key: 'focus',
        title: '你现在最想改善什么？',
        options: [
          { label: '睡眠质量', value: 'sleep', tags: ['睡眠改善', '健康养生'] },
          { label: '体重管理', value: 'weight', tags: ['体重管理', '运动健身'] },
          { label: '运动习惯', value: 'exercise', tags: ['运动健身', '生活方式'] },
          { label: '家庭健康', value: 'family', tags: ['家庭健康', '亲子育儿'] },
          { label: '饮食营养', value: 'nutrition', tags: ['营养咨询', '健康养生'] },
        ],
      },
      {
        key: 'level',
        title: '这个问题现在到什么程度？',
        options: [
          { label: '轻度关注', value: 'light', tags: ['先了解'] },
          { label: '已经影响生活', value: 'medium', tags: ['重点改善'] },
          { label: '希望尽快改善', value: 'urgent', tags: ['尽快改善'] },
        ],
      },
      {
        key: 'service',
        title: '你更偏好哪种服务方式？',
        options: [
          { label: '线上咨询', value: 'online', tags: ['线上咨询'] },
          { label: '到店体验', value: 'offline', tags: ['到店体验'] },
          { label: '社群陪伴', value: 'community', tags: ['社群陪伴'] },
          { label: '暂不确定', value: 'unknown', tags: ['先了解'] },
        ],
      },
      {
        key: 'budget',
        title: '你的预算倾向是？',
        options: [
          { label: '免费评估', value: 'free', tags: ['免费评估'] },
          { label: '低价体验', value: 'trial', tags: ['低价体验'] },
          { label: '标准服务', value: 'standard', tags: ['标准服务'] },
          { label: '先了解', value: 'unknown', tags: ['先了解'] },
        ],
      },
      {
        key: 'contact',
        title: '是否愿意让服务伙伴联系你？',
        options: [
          { label: '愿意联系', value: 'yes', tags: ['愿意联系'] },
          { label: '先看产品', value: 'browse', tags: ['先看产品'] },
          { label: '暂不联系', value: 'no', tags: ['暂不联系'] },
        ],
      },
    ],
  },
  beauty: {
    title: '美学需求评估',
    subtitle: '先了解肤质、场景和体验偏好',
    questions: [
      {
        key: 'focus',
        title: '你最想改善哪类问题？',
        options: [
          { label: '皮肤状态', value: 'skin', tags: ['皮肤管理', '免费评估'] },
          { label: '痘痘敏感', value: 'sensitive', tags: ['皮肤管理', '重点改善'] },
          { label: '形象风格', value: 'style', tags: ['形象提升', '先了解'] },
          { label: '重要场合', value: 'occasion', tags: ['形象提升', '职场进阶'] },
        ],
      },
      {
        key: 'service',
        title: '你更愿意选择哪种方式？',
        options: [
          { label: '线上咨询', value: 'online', tags: ['线上咨询'] },
          { label: '到店体验', value: 'offline', tags: ['到店体验'] },
          { label: '先看方案', value: 'browse', tags: ['先了解'] },
        ],
      },
      {
        key: 'budget',
        title: '你的预算倾向是？',
        options: [
          { label: '免费咨询', value: 'free', tags: ['免费评估'] },
          { label: '低价体验', value: 'trial', tags: ['低价体验'] },
          { label: '标准服务', value: 'standard', tags: ['标准服务'] },
        ],
      },
    ],
  },
  family: {
    title: '家庭需求评估',
    subtitle: '先判断服务对象和家庭关注点',
    questions: [
      {
        key: 'target',
        title: '你主要想为谁了解服务？',
        options: [
          { label: '父母长辈', value: 'elder', tags: ['长辈关怀', '家庭健康'] },
          { label: '孩子', value: 'child', tags: ['亲子育儿', '家庭健康'] },
          { label: '伴侣家庭', value: 'partner', tags: ['家庭健康', '关系沟通'] },
        ],
      },
      {
        key: 'focus',
        title: '当前更关注什么？',
        options: [
          { label: '健康管理', value: 'health', tags: ['家庭健康', '重点改善'] },
          { label: '陪伴沟通', value: 'company', tags: ['亲子育儿', '社群陪伴'] },
          { label: '长期跟进', value: 'follow', tags: ['长辈关怀', '社群陪伴'] },
        ],
      },
      {
        key: 'service',
        title: '你希望如何开始？',
        options: [
          { label: '线上先聊', value: 'online', tags: ['线上咨询'] },
          { label: '顾问定制', value: 'custom', tags: ['标准服务'] },
          { label: '先了解', value: 'browse', tags: ['先了解'] },
        ],
      },
    ],
  },
  emotion: {
    title: '情绪需求评估',
    subtitle: '仅用于需求梳理，不做诊断结论',
    questions: [
      {
        key: 'focus',
        title: '你最近主要被什么困扰？',
        options: [
          { label: '压力疲惫', value: 'stress', tags: ['压力管理', '情绪支持'] },
          { label: '关系沟通', value: 'relation', tags: ['关系沟通', '情绪支持'] },
          { label: '睡眠受影响', value: 'sleep', tags: ['压力管理', '睡眠改善'] },
        ],
      },
      {
        key: 'level',
        title: '你希望获得哪类支持？',
        options: [
          { label: '免费初聊', value: 'free', tags: ['先了解'] },
          { label: '方法练习', value: 'practice', tags: ['关系沟通', '社群陪伴'] },
          { label: '尽快有人沟通', value: 'contact', tags: ['尽快改善', '线上咨询'] },
        ],
      },
      {
        key: 'contact',
        title: '是否愿意让服务伙伴联系你？',
        options: [
          { label: '愿意联系', value: 'yes', tags: ['愿意联系'] },
          { label: '先看产品', value: 'browse', tags: ['先看产品'] },
          { label: '暂不联系', value: 'no', tags: ['暂不联系'] },
        ],
      },
    ],
  },
}

const answers = reactive<Record<string, string>>({})
const currentTemplate = ref<LocalAssessmentTemplate>(templates.health)
const canSubmit = computed(() => currentTemplate.value.questions.every((item) => !!answers[item.key]))
const answeredCount = computed(() => currentTemplate.value.questions.filter((item) => !!answers[item.key]).length)
const progressPercent = computed(() => {
  const total = currentTemplate.value.questions.length || 1
  return Math.round((answeredCount.value / total) * 100)
})

function fallbackTemplate(type: string) {
  return templates[type] || templates[returnModuleCode] || templates.health
}

function normalizeRemoteTemplate(template: RemoteAssessmentTemplate): LocalAssessmentTemplate {
  return {
    title: template.title,
    subtitle: template.subtitle,
    questions: template.questions.map((question) => ({
      key: question.key,
      title: question.title,
      options: question.options.map((option) => ({
        label: option.label,
        value: option.value,
        tags: option.tags,
        tagIds: option.tagIds,
        tagWeights: option.tagWeights,
      })),
    })),
  }
}

function selectedOption(question: Question) {
  return question.options.find((item) => item.value === answers[question.key])
}

function submitAssessment() {
  if (!canSubmit.value) {
    uni.showToast({ title: '请先完成评估', icon: 'none' })
    return
  }
  const selected = currentTemplate.value.questions
    .map((question) => ({ question, option: selectedOption(question) }))
    .filter((item): item is { question: Question; option: Option } => !!item.option)
  const tags = [...new Set(selected.flatMap((item) => item.option.tags))]
  const tagIds = [...new Set(selected.flatMap((item) => item.option.tagIds || []))]
  const tagWeights = selected.reduce<Record<string, number>>((result, item) => {
    for (const tagId of item.option.tagIds || []) {
      const key = String(tagId)
      result[key] = Math.max(result[key] || 0, Number(item.option.tagWeights?.[key] || 1))
    }
    return result
  }, {})
  const summary = selected.map((item) => `${item.question.title.replace(/[？?]$/, '')}：${item.option.label}`).join('；')
  saveAssessment({
    moduleCode: returnModuleCode,
    assessmentType: assessmentType.value,
    tags,
    tagIds,
    tagWeights,
    summary,
    answers: { ...answers },
    createdAt: new Date().toISOString(),
  }, returnModuleCode)
  uni.redirectTo({ url: `/pages/products/index?moduleCode=${returnModuleCode}&fromAssessment=1` })
}

onLoad(async (options) => {
  if (options?.moduleCode) returnModuleCode = String(options.moduleCode)
  try {
    const modules = await productApi.modules()
    const current = modules.find((item) => item.code === returnModuleCode)
    assessmentType.value = current?.assessmentType || returnModuleCode || 'health'
    currentTemplate.value = fallbackTemplate(assessmentType.value)
    const remoteTemplate = await productApi.assessmentTemplate(returnModuleCode)
    if (remoteTemplate?.questions?.length) {
      currentTemplate.value = normalizeRemoteTemplate(remoteTemplate)
    }
  } catch {
    assessmentType.value = returnModuleCode || 'health'
    currentTemplate.value = fallbackTemplate(assessmentType.value)
  }
})
</script>

<style lang="scss" scoped>
.assessment {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 140rpx;

  &__head {
    padding: 42rpx 32rpx 30rpx;
    background: linear-gradient(180deg, #ffffff 0%, #f6faf7 100%);
    border-bottom: 1rpx solid var(--color-border);
  }
  &__eyebrow {
    display: block;
    color: var(--color-primary);
    font-size: 23rpx;
    font-weight: 700;
    line-height: 32rpx;
    margin-bottom: 8rpx;
  }
  &__title {
    display: block;
    color: var(--color-text);
    font-size: 42rpx;
    font-weight: 800;
    line-height: 1.24;
    margin-bottom: 10rpx;
  }
  &__subtitle {
    display: block;
    color: var(--color-text-secondary);
    font-size: 25rpx;
    line-height: 1.5;
  }
  &__progress {
    display: flex;
    align-items: center;
    gap: 18rpx;
    margin-top: 28rpx;
  }
  &__progress-bar {
    flex: 1;
    height: 12rpx;
    border-radius: 999rpx;
    background: #e7ece9;
    overflow: hidden;
  }
  &__progress-value {
    height: 100%;
    border-radius: 999rpx;
    background: var(--color-primary);
    transition: width .2s ease;
  }
  &__progress-text {
    color: var(--color-text-secondary);
    font-size: 23rpx;
    font-weight: 700;
  }
  &__form {
    padding: 24rpx 28rpx;
  }
  &__footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 16rpx 32rpx;
    background: #fff;
    border-top: 1rpx solid var(--color-border);
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
    box-shadow: var(--shadow-action);
    &.disabled {
      background: #d0d5dd;
      color: var(--color-text-secondary);
      box-shadow: none;
    }
  }
}

.question {
  margin-bottom: 22rpx;
  padding: 28rpx;
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);

  &__head {
    display: flex;
    align-items: flex-start;
    gap: 16rpx;
    margin-bottom: 22rpx;
  }
  &__index {
    width: 42rpx;
    height: 42rpx;
    border-radius: 50%;
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-size: 22rpx;
    font-weight: 800;
    line-height: 42rpx;
    text-align: center;
    flex-shrink: 0;
  }
  &__title {
    display: block;
    flex: 1;
    color: var(--color-text);
    font-size: 30rpx;
    font-weight: 700;
    line-height: 1.45;
  }
  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 14rpx;
  }
  &__option {
    padding: 16rpx 22rpx;
    border-radius: 32rpx;
    background: var(--color-bg-gray);
    color: #475467;
    font-size: 26rpx;
    &.active {
      color: var(--color-primary);
      background: var(--color-primary-light);
      font-weight: 700;
    }
  }
}
</style>
