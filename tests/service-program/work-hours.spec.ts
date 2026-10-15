import { confirmationDeadline, withinReceptionHours } from '../../apps/api/src/service-program/appointment/work-hours'
const hours = { weekdays: [1,2,3,4,5], startMinute: 540, endMinute: 1020 }
describe('机构接待时间', () => {
  test('下午申请跨到下一工作日上午累计四小时', () => {
    expect(confirmationDeadline(new Date('2026-10-16T16:00:00+08:00'), new Date('2026-10-21T10:00:00+08:00'), hours).toISOString()).toBe(new Date('2026-10-19T12:00:00+08:00').toISOString())
  })
  test('截止时间不超过预约开始前一小时', () => {
    expect(confirmationDeadline(new Date('2026-10-14T09:00:00+08:00'), new Date('2026-10-14T11:00:00+08:00'), hours).toISOString()).toBe(new Date('2026-10-14T10:00:00+08:00').toISOString())
  })
  test('闭店时间、非接待日不能开放时段', () => {
    expect(withinReceptionHours(new Date('2026-10-17T10:00:00+08:00'), new Date('2026-10-17T11:00:00+08:00'), hours)).toBe(false)
    expect(withinReceptionHours(new Date('2026-10-14T16:00:00+08:00'), new Date('2026-10-14T18:00:00+08:00'), hours)).toBe(false)
    expect(withinReceptionHours(new Date('2026-10-14T09:00:00+08:00'), new Date('2026-10-14T10:00:00+08:00'), hours)).toBe(true)
  })
})
