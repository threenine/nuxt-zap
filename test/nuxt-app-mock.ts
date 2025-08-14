// Type-safe mock for useNuxtApp in tests
import type { NuxtApp } from '#app'
import type { ZapResult } from '~/src/runtime/composables/zap'

export function useNuxtApp(): NuxtApp {
  // Extract: explicit type alias for the zap send function
  type SendFn = (amount?: number, comment?: string) => Promise<ZapResult>

  // Introduce: typed default send implementation
  const defaultSend: SendFn = async () => ({} as unknown as ZapResult)

  // Introduce: narrowly-typed access to an optional global mock
  const globalWithMock = globalThis as unknown as { __sendMock?: SendFn }

  // Rename: intent-revealing name for the selected implementation
  const zapSend: SendFn = globalWithMock.__sendMock ?? defaultSend

  return {
    $config: { public: {} },
    $zap: { send: zapSend },
  }
}
