import { waitingDays } from '../../apps/api/src/service-program/order/wait-days'

describe('机构等待延期计算', () => {
  test('不足一天按一天', () => {
    expect(waitingDays([{ startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-01T01:00:00Z' }])).toBe(1)
  })
  test('重叠等待与重复登记不重复累计', () => {
    const first = { startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-03T00:00:00Z' }
    expect(waitingDays([first, first, { startAt: '2026-10-02T00:00:00Z', endAt: '2026-10-04T00:00:00Z' }])).toBe(3)
  })
  test('无记录不延期，倒置区间拒绝', () => {
    expect(waitingDays([])).toBe(0)
    expect(() => waitingDays([{ startAt: '2026-10-03', endAt: '2026-10-01' }])).toThrow()
  })
})
