import type { TagDictionary } from '@/api/product'

export interface TagOptionGroup {
  label: string
  options: TagDictionary[]
}

export function tagScopeName(tag: TagDictionary) {
  return tag.module?.name || '通用'
}

export function tagGroupName(tag: TagDictionary) {
  return tag.group || '未分组'
}

export function tagOptionLabel(tag: TagDictionary) {
  return `${tag.name}（${tag.code}）`
}

export function buildTagOptionGroups(tags: TagDictionary[]): TagOptionGroup[] {
  const groups = new Map<string, TagDictionary[]>()
  for (const tag of tags) {
    const label = `${tagScopeName(tag)} / ${tagGroupName(tag)}`
    groups.set(label, [...(groups.get(label) || []), tag])
  }
  return Array.from(groups.entries()).map(([label, options]) => ({
    label,
    options: [...options].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
  }))
}

export function mapTagNamesToIds(names: string[] = [], tags: TagDictionary[] = []) {
  const nameSet = new Set(names)
  return tags.filter((tag) => nameSet.has(tag.name)).map((tag) => tag.id)
}
