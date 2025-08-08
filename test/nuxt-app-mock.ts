export function useNuxtApp() {
  const send = (globalThis as unknown).__sendMock || (async () => ({}))
  return {
    $config: { public: {} },
    $zap: { send },
  }
}
