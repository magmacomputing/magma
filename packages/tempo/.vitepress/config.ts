import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'
import { Temporal } from '@js-temporal/polyfill'

if (!(globalThis as any).Temporal) {
  (globalThis as any).Temporal = Temporal;
}

export default defineConfig({
  base: '/magma/',
  title: "Tempo",
  description: "The Professional Date-Time Library for Temporal",
  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Guide', link: '/README' },
      { text: 'API', link: '/doc/tempo.api' },
      { text: 'Releases', link: '/doc/releases/' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/README' },
          { text: 'Cookbook', link: '/doc/tempo.cookbook' },
          { text: 'Migration Guide', link: '/doc/migration-guide' },
          { text: 'Release Notes', link: '/doc/releases/' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Configuration', link: '/doc/tempo.config' },
          { text: 'Modularity', link: '/doc/tempo.modularity' },
          { text: 'Layout Patterns', link: '/doc/tempo.layout' },
          { text: 'Terms System', link: '/doc/tempo.term' },
          { text: 'Ticker Plugin', link: '/doc/tempo.ticker' }
        ]
      },
      {
        text: 'Advanced Reference',
        items: [
          { text: 'API Reference', link: '/doc/tempo.api' },
          { text: 'Types System', link: '/doc/tempo.types' },
          { text: 'Shorthand Engine', link: '/doc/tempo.shorthand' },
          { text: 'Weekday Engine', link: '/doc/tempo.weekday' },
          { text: 'Debugging', link: '/doc/tempo.debugging' }
        ]
      },
      {
        text: 'Architecture & Internals',
        items: [
          { text: 'Core Architecture', link: '/doc/architecture' },
          { text: 'Soft Freeze Strategy', link: '/doc/soft_freeze_strategy' },
          { text: 'Lazy Evaluation', link: '/doc/lazy-evaluation-pattern' },
          { text: 'Performance Benchmarks', link: '/doc/tempo.benchmarks' }
        ]
      },
      {
        text: 'Utility Library',
        items: [
          { text: 'Library Overview', link: '/doc/tempo.library' },
          { text: 'Enumerators', link: '/doc/tempo.enumerators' },
          { text: 'Serializers', link: '/doc/tempo.serializers' },
          { text: 'Decorators', link: '/doc/tempo.decorators' },
          { text: 'Advanced Promises (Pledge)', link: '/doc/tempo.pledge' },
        ]
      },
      {
        text: 'Ecosystem',
        items: [
          { text: 'Contribution Guide', link: '/CONTRIBUTING' },
          { text: 'Comparison', link: '/doc/comparison' },
          { text: 'Tempo vs Temporal', link: '/doc/tempo-vs-temporal' },
          { text: 'Project Vision', link: '/doc/vision' }
        ]
      },
      {
        text: 'Services & Support',
        items: [
          { text: 'Professional Services', link: '/doc/commercial' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/magmacomputing/magma/tree/main/packages/tempo' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Magma Computing'
    }
  },
  vite: {
    build: {
      target: 'es2022'
    },
    esbuild: {
      target: 'esnext'
    },
    resolve: {
      conditions: ['development', 'module', 'browser', 'import', 'default'],
      alias: [
        {
          find: /^#library\/(.*)\.js$/,
          replacement: fileURLToPath(new URL('../../library/dist/common/$1.js', import.meta.url))
        },
        // More-specific path must come first so it is matched before the bare package.
        {
          find: /^@magmacomputing\/tempo\/ticker$/,
          replacement: fileURLToPath(new URL('../dist/plugin/extend/extend.ticker.js', import.meta.url))
        },
        {
          find: /^@magmacomputing\/tempo$/,
          replacement: fileURLToPath(new URL('../dist/tempo.index.js', import.meta.url))
        },
      ]
    },
    ssr: {
      // Prevent Vite from externalising these packages during SSR so the aliases
      // above are honoured in the server-side rendering pass as well.
      noExternal: ['@magmacomputing/tempo', '@magmacomputing/library']
    }
  }
})
