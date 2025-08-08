export function useNuxtApp() {
  const send = (globalThis as any).__sendMock || (async () => ({}))
  return {
    $config: { public: {} },
    $zap: { send },
  }
}
