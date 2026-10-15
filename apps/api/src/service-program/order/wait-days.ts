// 合并等待区间后再按天向上取整，避免重叠记录重复延期。
export function waitingDays(intervals: Array<{ startAt: string; endAt: string }>): number {
  const ranges = intervals.map((item) => [new Date(item.startAt).getTime(), new Date(item.endAt).getTime()])
    .sort((a, b) => a[0] - b[0])
  let total = 0
  let start = 0
  let end = 0
  for (const range of ranges) {
    if (!Number.isFinite(range[0]) || !Number.isFinite(range[1]) || range[1] <= range[0]) throw new Error('等待起止时间无效')
    if (!end) { [start, end] = range; continue }
    if (range[0] <= end) end = Math.max(end, range[1])
    else { total += Math.ceil((end - start) / 86400000); [start, end] = range }
  }
  return total + (end ? Math.ceil((end - start) / 86400000) : 0)
}
