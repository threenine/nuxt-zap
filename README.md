<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: Nuxt- Zap
- Package name: @threenine/nuxt-zap
- Description: My new Nuxt module
-->

# Nuxt- Zap

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt module for Zap payments using @getalby/sdk.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-zap?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- Send a zap (Lightning payment) to a Lightning Address using @getalby/sdk (WebLN)\
  Falls back to window.webln if the SDK provider is not available.
- Simple Zap component with amount and comment input.

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add @threenine/nuxt-zap
```

That's it! You can now use My Module in your Nuxt app ✨

### Configuration

Add to your nuxt.config:

```ts
export default defineNuxtConfig({
  modules: ['@threenine/nuxt-zap'],
  nuxtZap: {
    zapAddress: 'yourname@getalby.com',
    defaultAmount: 21,
    messageTemplate: 'Zap from Nuxt',
  },
})
```

### Usage

- Component:
```vue
<template>
  <Zap title="Zap me" />
</template>
```

- Programmatic:
```ts
const { $zap } = useNuxtApp()
await $zap.send(100, 'Thanks!')
```

A WebLN provider is required (e.g. Alby browser extension). The SDK will be used when available.


## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  npm install
  
  # Generate type stubs
  npm run dev:prepare
  
  # Develop with the playground
  npm run dev
  
  # Build the playground
  npm run dev:build
  
  # Run ESLint
  npm run lint
  
  # Run Vitest
  npm run test
  npm run test:watch
  
  # Release new version
  npm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@threenine/nuxt-zap/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@threenine/nuxt-zap

[npm-downloads-src]: https://img.shields.io/npm/dm/@threenine/nuxt-zap.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@threenine/nuxt-zap

[license-src]: https://img.shields.io/npm/l/@threenine/nuxt-zap.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@threenine/nuxt-zap

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
