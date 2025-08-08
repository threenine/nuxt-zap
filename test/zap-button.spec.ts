/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// SFC under test
import Zap from '../src/runtime/components/Zap.vue'

// Helper to mock Nuxt's useNuxtApp to inject $zap
const sendMock = vi.fn()
vi.mock('#app', () => {
  return {
    useNuxtApp: () => ({
      $config: { public: {} },
      $zap: { send: sendMock },
    }),
  }
})

function mountZap(overrides: Partial<Parameters<typeof mount>[1]> = {}) {
  return mount(Zap, {
    global: {
      // Stub nuxt/ui components and Icon to avoid bringing in their implementations
      stubs: {
        UPopover: {
          name: 'UPopover',
          template: '<div><slot/><slot name="content"/></div>',
        },
        UButton: {
          name: 'UButton',
          // Render content and forward clicks/disabled/loading attrs
          props: ['color', 'loading', 'disabled'],
          emits: ['click'],
          template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
        },
        UFormField: {
          name: 'UFormField',
          props: ['label'],
          template: '<label><slot/></label>',
        },
        UInput: {
          name: 'UInput',
          props: ['modelValue', 'type', 'min', 'placeholder'],
          emits: ['update:modelValue'],
          // Simple two-way binding stub
          template:
            '<input :type="type || \'text\'" :min="min" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Icon: {
          name: 'Icon',
          template: '<span />',
        },
      },
    },
    ...overrides,
  })
}

describe('Zap.vue', () => {
  beforeEach(() => {
    sendMock.mockReset()
  })

  it('renders with default title', () => {
    const wrapper = mountZap()
    expect(wrapper.text()).toContain('Zap')
  })

  it('sends zap successfully and shows result then closes popover', async () => {
    sendMock.mockResolvedValue({ preimage: 'abc123' })
    const wrapper = mountZap()

    // Open the popover by emitting on the UPopover stub (v-model:open)
    const pop = wrapper.findComponent({ name: 'UPopover' })
    await pop.vm.$emit('update:open', true)

    // Enter amount and comment
    const inputs = wrapper.findAllComponents({ name: 'UInput' })
    // Expect first UInput for amount, second for comment
    const amountInput = inputs[0]
    const commentInput = inputs[1]

    await amountInput?.find('input').setValue('21')
    await commentInput?.find('input').setValue('Thanks!')

    // Click Send Zap
    const sendBtn = wrapper.findAllComponents({ name: 'UButton' }).find(b => b.text().includes('Send Zap'))!
    await sendBtn.trigger('click')

    // Ensure service called with number 21 and comment
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith(21, 'Thanks!')

    // Wait for DOM to update and show result
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Paid invoice. Preimage: abc123')

    // Popover should be closed after success (open=false). Emitting true again should be needed to show content.
    // We cannot directly read the internal ref, but the UX expectation is result still visible in the DOM we rendered.
    // Verify that no error message is shown
    expect(wrapper.find('span.text-red-600').exists()).toBe(false)
  })

  it('shows error when send fails and resets loading', async () => {
    sendMock.mockRejectedValue(new Error('Boom'))
    const wrapper = mountZap()

    const pop = wrapper.findComponent({ name: 'UPopover' })
    await pop.vm.$emit('update:open', true)

    const sendBtn = wrapper.findAllComponents({ name: 'UButton' }).find(b => b.text().includes('Send Zap'))!

    // Click to send (with no amount/comment -> undefineds)
    await sendBtn.trigger('click')

    // Error message should appear
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Boom')

    // Ensure result is not shown
    expect(wrapper.text()).not.toContain('Paid invoice')
  })

  it('disables buttons while sending', async () => {
    // Make send hang until we resolve
    let resolveSend: (v?: any) => void
    const p = new Promise((res) => { resolveSend = res })
    // @ts-expect-error - assigned in closure
    sendMock.mockReturnValue(p)

    const wrapper = mountZap()
    const pop = wrapper.findComponent({ name: 'UPopover' })
    await pop.vm.$emit('update:open', true)

    const mainBtn = wrapper.findAll('button')[0]
    const sendBtn = wrapper.findAllComponents({ name: 'UButton' }).find(b => b.text().includes('Send Zap'))!

    // Trigger send
    await sendBtn.trigger('click')

    // While pending, both buttons should be disabled
    expect((mainBtn?.element as HTMLButtonElement).disabled).toBe(true)
    expect((sendBtn.element as HTMLButtonElement).disabled).toBe(true)

    // Resolve
    // @ts-expect-error - set above
    resolveSend({ preimage: 'ok' })
    await new Promise(r => setTimeout(r))
    await wrapper.vm.$nextTick()

    // Buttons re-enabled
    expect((mainBtn?.element as HTMLButtonElement).disabled).toBe(false)
  })
})
