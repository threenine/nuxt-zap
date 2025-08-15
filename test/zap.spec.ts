/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Utilities to mock fetch responses for LNURLp and invoice
const WELL_KNOWN_RESPONSE = {
  callback: 'https://example.com/lnurl/callback',
  maxSendable: 10_000_000_000, // 10M msat
  minSendable: 1_000, // 1 sat in msat
  metadata: '[ ["text/identifier", "name@example.com"] ]',
}

function mockFetchSequence(pr: string) {
  const fetchMock = vi.fn()
  // First call: well-known lnurlp
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => WELL_KNOWN_RESPONSE })
  // Second call: callback invoice
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ pr, routes: [] }) })
  global.fetch = fetchMock
  return fetchMock
}

// Helper to override window.location.href assignment for assertions
function stubLocationHref() {
  const original = window.location
  let assigned: string | undefined

  // JSDOM makes location read-only; redefine fully
  Object.defineProperty(window, 'location', {
    value: {
      get href() { return assigned ?? original.href },
      set href(v: string) { assigned = v },
    },
    writable: true,
  })

  return {
    get assigned() { return assigned },
    restore() {
      Object.defineProperty(window, 'location', { value: original })
    },
  }
}

// Reset mocks between tests
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  // Ensure no window.webln by default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).webln
  // Unmock @getalby/sdk
  vi.doUnmock('@getalby/sdk')
})

afterEach(() => {
  // cleanup any custom location overrides if still present by restoring via navigating
})

describe('sendZap composable', () => {
  it('uses WebLN provider when available and returns normalized result', async () => {
    const pr = 'lnbc21u1pabcdefg'
    mockFetchSequence(pr)

    const sendPayment = vi.fn().mockResolvedValue({ preimage: '00aa', paymentHash: '11bb' })

    // Provide a window.webln provider directly (simpler and stable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).webln = { enabled: true, sendPayment }

    // Prevent jsdom navigation errors if fallback unexpectedly triggers
    const loc = stubLocationHref()

    const { sendZap } = await import('../src/runtime/composables/zap')
    const res = await sendZap({ zapAddress: 'name@example.com', amount: 21, comment: 'Hi' })

    loc.restore()

    expect(sendPayment).toHaveBeenCalledTimes(1)
    expect(sendPayment).toHaveBeenCalledWith(pr)
    expect(res).toEqual({ preimage: '00aa', paymentHash: '11bb', invoice: pr })
  })

  it('falls back to lightning: deep link and returns invoice when no WebLN provider', async () => {
    const pr = 'lnbc2500n1pqrstuv'
    const fetchMock = mockFetchSequence(pr)

    // Ensure SDK returns no provider (mock empty module)
    vi.mock('@getalby/sdk', () => ({}))

    // Ensure no window.webln present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).webln

    const loc = stubLocationHref()

    const { sendZap } = await import('../src/runtime/composables/zap')
    const res = await sendZap({ zapAddress: 'name@example.com', amount: 25, comment: 'Thanks' })

    // Should have asked for LNURLp and invoice
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Should attempt to navigate to lightning: URI
    expect(loc.assigned).toBe(`lightning:${pr}`)
    // Should return invoice for UI to display
    expect(res).toEqual({ invoice: pr })

    loc.restore()
  })

  it('returns invoice without attempting navigation in SSR (no window)', async () => {
    const pr = 'lnbc100n1pssrtest'
    mockFetchSequence(pr)

    // Mock SDK empty
    vi.mock('@getalby/sdk', () => ({}))

    // Temporarily remove window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    const originalWindow = g.window
    delete g.window

    try {
      const { sendZap } = await import('../src/runtime/composables/zap')
      const res = await sendZap({ zapAddress: 'name@example.com', amount: 10 })
      expect(res).toEqual({ invoice: pr })
    }
    finally {
      // Restore window for other tests
      g.window = originalWindow
    }
  })
})
