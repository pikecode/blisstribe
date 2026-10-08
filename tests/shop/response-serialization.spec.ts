import { firstValueFrom, of } from 'rxjs'

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}))
jest.mock('@nestjs/core', () => ({
  Reflector: class Reflector {},
}))

import { ResponseInterceptor } from '../../apps/api/src/common/interceptors/response.interceptor'

describe('API 响应序列化', () => {
  it('同时保留日期并将 BigInt 转为字符串', async () => {
    const createdAt = new Date('2026-09-28T09:04:00.872Z')
    const interceptor = new ResponseInterceptor({
      getAllAndOverride: () => false,
    } as never)

    const result = await firstValueFrom(interceptor.intercept(
      { getHandler: () => null, getClass: () => null } as never,
      { handle: () => of({ id: 16n, createdAt }) } as never
    ))

    expect(result.data).toEqual({
      id: '16',
      createdAt: '2026-09-28T09:04:00.872Z',
    })
  })
})
