import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const options = nuxtApp.$config.public.nuxtZap || {}
  console.log('Plugin injected by nuxt-zap!')
  console.log('ZapAddress:', options.zapAddress)
})
