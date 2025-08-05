import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  nuxtZap: {
    zapAddress: 'test@test.com',
  },
})
