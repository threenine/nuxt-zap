import { defineNuxtPlugin } from '#app'
import { sendZap } from './composables/zap'

export default defineNuxtPlugin((nuxtApp) => {
  const options = nuxtApp.$config.public.nuxtZap || {}

  const zapService = {
    async send(amount?: number, comment?: string) {
      const amt = amount ?? options.defaultAmount ?? 21
      if (!options.zapAddress) {
        throw new Error('No zapAddress configured')
      }
      return await sendZap({
        zapAddress: options.zapAddress,
        amount: amt,
        comment: comment || (options.messageTemplate ? String(options.messageTemplate).replace('{title}', '') : undefined),
      })
    },
  }

  return {
    provide: {
      zap: zapService,
    },
  }
})
