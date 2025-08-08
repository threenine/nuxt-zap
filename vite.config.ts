import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '#app': path.resolve(__dirname, 'test/nuxt-app-mock.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
  },
})
