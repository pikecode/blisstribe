import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RefundStatus from '@/components/business/RefundStatus.vue'

describe('RefundStatus.vue', () => {
  it('renders pending status correctly', () => {
    const wrapper = mount(RefundStatus, {
      props: {
        status: 'pending',
      },
      global: {
        stubs: {
          'view': true,
          'text': true,
        },
      },
    })

    expect(wrapper.vm.statusLabel).toBe('待审核')
    expect(wrapper.vm.statusIcon).toBe('⏳')
  })

  it('renders approved status correctly', () => {
    const wrapper = mount(RefundStatus, {
      props: {
        status: 'approved',
      },
      global: {
        stubs: {
          'view': true,
          'text': true,
        },
      },
    })

    expect(wrapper.vm.statusLabel).toBe('已批准，退款处理中')
    expect(wrapper.vm.statusIcon).toBe('✓')
  })

  it('renders rejected status correctly', () => {
    const wrapper = mount(RefundStatus, {
      props: {
        status: 'rejected',
        rejectionReason: 'Invalid reason',
      },
      global: {
        stubs: {
          'view': true,
          'text': true,
        },
      },
    })

    expect(wrapper.vm.statusLabel).toBe('已拒绝')
    expect(wrapper.vm.statusIcon).toBe('✕')
  })

  it('renders success status correctly', () => {
    const wrapper = mount(RefundStatus, {
      props: {
        status: 'success',
      },
      global: {
        stubs: {
          'view': true,
          'text': true,
        },
      },
    })

    expect(wrapper.vm.statusLabel).toBe('退款已到账')
    expect(wrapper.vm.statusIcon).toBe('✓')
  })

  it('renders completed status correctly', () => {
    const wrapper = mount(RefundStatus, {
      props: {
        status: 'completed',
      },
      global: {
        stubs: {
          'view': true,
          'text': true,
        },
      },
    })

    expect(wrapper.vm.statusLabel).toBe('退款已到账')
    expect(wrapper.vm.statusIcon).toBe('✓')
  })

  it('displays rejection reason when provided', () => {
    const wrapper = mount(RefundStatus, {
      props: {
        status: 'rejected',
        rejectionReason: 'Product was used',
      },
      global: {
        stubs: {
          'view': true,
          'text': true,
        },
      },
    })

    expect(wrapper.html()).toContain('Product was used')
  })

  it('applies correct CSS class for each status', () => {
    const statuses = ['pending', 'approved', 'rejected', 'success']

    statuses.forEach((status) => {
      const wrapper = mount(RefundStatus, {
        props: { status },
        global: {
          stubs: {
            'view': true,
            'text': true,
          },
        },
      })

      expect(wrapper.vm.$el.className).toContain(`refund-status--${status}`)
    })
  })
})
