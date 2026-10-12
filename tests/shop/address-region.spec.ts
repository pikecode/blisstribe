import { splitAddress, joinAddress } from '../../apps/miniapp/src/utils/shop-address'

describe('收货地址地区选择', () => {
  it('保存后可以回填省市区和详细地址', () => {
    const region = ['浙江省', '杭州市', '西湖区']
    expect(splitAddress(joinAddress(region, '  文三路1号  '))).toEqual({
      region, detail: '文三路1号',
    })
  })

  it('直辖市保留选择器提供的完整三级地区', () => {
    const region = ['上海市', '上海市', '浦东新区']
    expect(splitAddress(joinAddress(region, '世纪大道1号')).region).toEqual(region)
  })

  it('旧地址和无法识别的格式保持原文', () => {
    for (const address of ['浙江省杭州市西湖区文三路1号', '浙江省 杭州市\n文三路1号', '']) {
      expect(splitAddress(address)).toEqual({ region: [], detail: address })
    }
  })

  it('详细地址内的换行保持完整', () => {
    const detail = '文三路1号\n2栋301室'
    expect(splitAddress(joinAddress(['浙江省', '杭州市', '西湖区'], detail)).detail).toBe(detail)
  })
})
