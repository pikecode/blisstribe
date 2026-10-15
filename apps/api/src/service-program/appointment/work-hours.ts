export interface ReceptionHours { weekdays: number[]; startMinute: number; endMinute: number }

export function validateReceptionHours(hours: ReceptionHours): void {
  if (!Array.isArray(hours.weekdays) || !hours.weekdays.length || new Set(hours.weekdays).size !== hours.weekdays.length
    || hours.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
    || !Number.isInteger(hours.startMinute) || !Number.isInteger(hours.endMinute)
    || hours.startMinute < 0 || hours.endMinute > 1440 || hours.startMinute >= hours.endMinute) throw new Error('机构接待时间配置无效')
}

// 使用北京时间累计接待分钟，非接待日和非接待时间不计入确认期限。
export function confirmationDeadline(createdAt: Date, startAt: Date, hours: ReceptionHours): Date {
  validateReceptionHours(hours)
  const offset = 8 * 3600000
  const limit = startAt.getTime() - 3600000
  let cursor = createdAt.getTime()
  let remaining = 240 * 60000
  while (cursor < limit && remaining > 0) {
    const local = new Date(cursor + offset)
    const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset
    const open = day + hours.startMinute * 60000
    const close = day + hours.endMinute * 60000
    if (hours.weekdays.includes(local.getUTCDay()) && cursor < close) {
      cursor = Math.max(cursor, open)
      const consumed = Math.min(remaining, Math.max(0, Math.min(close, limit) - cursor))
      cursor += consumed
      remaining -= consumed
      if (remaining === 0 || cursor >= limit) break
    }
    cursor = day + 86400000
  }
  return new Date(Math.min(cursor, limit))
}

export function withinReceptionHours(startAt: Date, endAt: Date, hours: ReceptionHours): boolean {
  validateReceptionHours(hours)
  const start = new Date(startAt.getTime() + 8 * 3600000)
  const end = new Date(endAt.getTime() + 8 * 3600000)
  const day = start.toISOString().slice(0, 10)
  const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes()
  const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes()
  return hours.weekdays.includes(start.getUTCDay()) && day === end.toISOString().slice(0, 10)
    && startMinute >= hours.startMinute && endMinute <= hours.endMinute
}
