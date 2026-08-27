import { Product } from '@prisma/client'

export interface MatchContext {
  matchType: 'primary' | 'secondary' | 'fallback' | 'rule'
  sourceType: 'user' | 'assessment' | 'scene'
  tags: string[]
  ruleReason?: string
}

/**
 * 生成推荐理由文案
 * 用于前端展示为什么推荐这个产品
 */
export function generateMatchReason(context: MatchContext): string {
  const { matchType, sourceType, tags, ruleReason } = context

  // 规则加成：优先返回规则理由
  if (matchType === 'rule' && ruleReason) {
    return ruleReason
  }

  const tagName = tags[0] ?? '该标签'
  const key = `${matchType}_${sourceType}`

  const reasonMap: Record<string, string> = {
    // 强相关标签
    'primary_user': `您的标签"${tagName}"精确匹配`,
    'primary_assessment': `评估结果"${tagName}"优先推荐`,
    'primary_scene': `${tagName}场景下的优选产品`,

    // 弱相关标签
    'secondary_user': `您可能对"${tagName}"感兴趣`,
    'secondary_assessment': `评估结果显示您适合"${tagName}"相关产品`,
    'secondary_scene': `${tagName}场景下的推荐产品`,

    // 通用标签
    'fallback_user': `基于您对"${tagName}"的兴趣`,
    'fallback_assessment': `根据评估结果为您推荐`,
    'fallback_scene': `在${tagName}场景下为您推荐`,

    // 默认
    'rule_triggered': ruleReason || '基于推荐规则为您优先推荐',
  }

  return reasonMap[key] ?? '为您推荐'
}

/**
 * 生成匹配类型标签
 * 用于分析推荐质量的维度
 */
export function generateMatchTypeLabel(matchType: 'primary' | 'secondary' | 'fallback' | 'rule'): string {
  const labels: Record<string, string> = {
    primary: '强相关推荐',
    secondary: '相关推荐',
    fallback: '潜在推荐',
    rule: '规则推荐',
  }
  return labels[matchType] ?? '未知推荐'
}

/**
 * 判断产品是否是强相关推荐
 */
export function isHighConfidenceMatch(matchType: 'primary' | 'secondary' | 'fallback' | 'rule'): boolean {
  return matchType === 'primary' || matchType === 'rule'
}

/**
 * 判断产品是否是中相关推荐
 */
export function isMediumConfidenceMatch(matchType: 'primary' | 'secondary' | 'fallback' | 'rule'): boolean {
  return matchType === 'secondary'
}
