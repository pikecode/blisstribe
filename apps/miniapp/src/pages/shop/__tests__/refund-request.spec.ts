import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RefundRequest from '@/pages/shop/refund-request.vue'
import { shopApi } from '@/api/modules/shop'

vi.mock('@/api/modules/shop')
vi.mock('@dcloudio/uni-app', () => ({
  onLoad: vi.fn((cb) => cb({ id: '123' })),
}))

describe('RefundRequest.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(RefundRequest, {
      global: {
        stubs: {
          'view': true,
          'text': true,
          'textarea': true,
          'scroll-view': true,
        },
      },
    })
  })

  it('renders refund request form', () => {
    expect(wrapper.find('.refund-request__title').exists()).toBe(true)
  })

  it('displays refund reasons', () => {
    const reasons = shopApi.getRefundReasons()
    expect(reasons).toContain('质量问题')
    expect(reasons).toContain('与描述不符')
    expect(reasons).toContain('不需要了')
  })

  it('disables submit button when form is incomplete', async () => {
    expect(wrapper.vm.canSubmit).toBe(false)
  })

  it('enables submit button when form is valid', async () => {
    await wrapper.vm.$nextTick()
    wrapper.vm.selectedReason = '质量问题'
    wrapper.vm.description = 'Test description'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.canSubmit).toBe(true)
  })

  it('validates reason is required', async () => {
    await wrapper.vm.$nextTick()
    const isValid = wrapper.vm.validateForm()
    expect(isValid).toBe(false)
    expect(wrapper.vm.errors.reason).toBe('请选择退款原因')
  })

  it('validates description is required', async () => {
    await wrapper.vm.$nextTick()
    wrapper.vm.selectedReason = '质量问题'
    await wrapper.vm.$nextTick()
    const isValid = wrapper.vm.validateForm()
    expect(isValid).toBe(false)
    expect(wrapper.vm.errors.description).toBe('请输入问题描述')
  })

  it('formats amount correctly', () => {
    const formatted = wrapper.vm.formatAmount(10050)
    expect(formatted).toBe('100.50')
  })

  it('selects reason when option clicked', async () => {
    wrapper.vm.selectReason('质量问题')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.selectedReason).toBe('质量问题')
    expect(wrapper.vm.showReasonPicker).toBe(false)
  })

  it('updates description input', async () => {
    const event = { detail: { value: 'Product is broken' } }
    wrapper.vm.onDescriptionInput(event)
    expect(wrapper.vm.description).toBe('Product is broken')
  })

  it('shows success modal after successful submission', async () => {
    vi.mocked(shopApi.requestRefund).mockResolvedValue({
      id: 1,
      orderId: 123,
      userId: 456,
      amountInFen: 10050,
      reason: '质量问题',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    wrapper.vm.orderId = '123'
    wrapper.vm.selectedReason = '质量问题'
    wrapper.vm.description = 'Product is broken'

    await wrapper.vm.submitRefund()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.successVisible).toBe(true)
  })
})
