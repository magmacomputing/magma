import { defineConfig } from 'vitepress'
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
      { text: 'Releases', link: '/doc/releases/versions' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/README' },
          { text: 'Migration Guide', link: '/doc/migration-guide' },
          { text: 'Version History', link: '/doc/releases/versions' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Configuration', link: '/doc/tempo.config' },
          { text: 'Modularity', link: '/doc/tempo.modularity' },
          { text: 'Shorthand Engine', link: '/doc/tempo.shorthand' },
          { text: 'Terms System', link: '/doc/tempo.term' },
          { text: 'Ticker Plugin', link: '/doc/tempo.ticker' }
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
        text: 'Ecosystem',
        items: [
          { text: 'Contribution Guide', link: '/CONTRIBUTING' },
          { text: 'Comparison', link: '/doc/comparison' },
          { text: 'Project Vision', link: '/doc/vision' }
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
      target: 'esnext'
    }
  }
})
