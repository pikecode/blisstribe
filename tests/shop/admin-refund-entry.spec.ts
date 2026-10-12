import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transpileModule, ModuleKind } from 'typescript'

describe('订单进入退款审核', () => {
  async function open(refundId: unknown, status = 'pending') {
    const source = readFileSync(join(__dirname, '../../apps/admin/src/views/shop/refund.vue'), 'utf8')
    const body = source.slice(source.indexOf('const route = useRoute()'), source.indexOf('</script>'))
    const compiled = transpileModule(body, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText
    const api = { getRefund: jest.fn(async () => ({ id: 1, status })) }
    const approval = { value: false }, detail = { value: false }, current = { value: null }
    let callback: () => Promise<void>
    new Function('useRoute', 'onMounted', 'loadList', 'refundApi', 'currentRefund', 'resetApprovalForm', 'approvalDialogVisible', 'detailDialogVisible', 'ElMessage', compiled)(
      () => ({ query: { refundId } }), (fn: () => Promise<void>) => { callback = fn },
      async () => {}, api, current, () => {}, approval, detail, { error: jest.fn() },
    )
    await callback!()
    return { api, approval, detail }
  }
  it('待审核申请打开审批弹窗', async () => {
    const result = await open('1')
    expect(result.approval.value).toBe(true)
    expect(result.detail.value).toBe(false)
  })
  it('已处理申请打开详情', async () => {
    expect((await open('1', 'processing')).detail.value).toBe(true)
  })
  it('非法参数不查询或审批退款', async () => {
    for (const id of [undefined, 'abc', '-1', '0', '1.5']) {
      const result = await open(id)
      expect(result.api.getRefund).not.toHaveBeenCalled()
      expect(result.approval.value).toBe(false)
    }
  })
})
