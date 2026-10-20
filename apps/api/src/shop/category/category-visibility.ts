import type { Prisma } from '@prisma/client'

export const publicCategoryFilter: Prisma.ShopCategoryWhereInput = {
  status: 1,
  OR: [{ parentId: null }, { parent: { status: 1 } }],
}

export function isCategoryAvailable(category: {
  status: number
  parentId: bigint | null
  parent?: { status: number } | null
} | undefined): boolean {
  return !!category && category.status === 1 && (category.parentId === null || category.parent?.status === 1)
}
