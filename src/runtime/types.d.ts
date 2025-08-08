import type { ZapResult } from './composables/zap'

declare module '#app' {
  interface NuxtApp {
    $zap: {
      send: (amount?: number, comment?: string) => Promise<ZapResult>
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $zap: {
      send: (amount?: number, comment?: string) => Promise<ZapResult>
    }
  }
}

export {}
