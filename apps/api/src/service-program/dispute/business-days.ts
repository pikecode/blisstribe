// 支持日历使用北京时间；运营维护节假日与调休日期，不依赖服务器时区。
export function businessDeadline(from: Date, days: number, excluded: string[] = [], included: string[] = []): Date {
  let local = new Date(from.getTime() + 8 * 3600000)
  for (let remaining = days, guard = 0; remaining > 0; guard++) {
    if (guard > 3660) throw new Error('支持日历无法计算处理期限')
    local = new Date(local.getTime() + 86400000)
    const key = local.toISOString().slice(0, 10)
    if (included.includes(key) || (!excluded.includes(key) && ![0, 6].includes(local.getUTCDay()))) remaining--
  }
  return new Date(local.getTime() - 8 * 3600000)
}
