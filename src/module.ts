import { addComponent, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  zapAddress: string
  enableWebLn: boolean
  defaultAmount: number
  messageTemplate: string

}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-zap',
    configKey: 'nuxtZap',
    compatibility: {
      nuxt: '^4.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    zapAddress: 'threenine@alby.com',
    enableWebLn: true,
    defaultAmount: 2100,
    messageTemplate: 'Zap for {title}',

  },
  hooks: {
    'components:dirs'(_dirs) {
      _dirs.push({
        path: './runtime/components',
        prefix: 'zap',
      })
    },
  },
  setup: function (_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)
    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))
    const nuxtOptions = _nuxt.options
    nuxtOptions.runtimeConfig.public.nuxtZap = defu(nuxtOptions.runtimeConfig.public.nuxtZap || {},
      {
        ..._options,
      })

    addComponent({
      name: 'ZapButton',
      filePath: resolve('./runtime/components/ZapButton.vue'),
    },
    )
  },
})
