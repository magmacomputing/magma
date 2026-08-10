import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { fileURLToPath } from 'node:url'
import { Temporal } from '@js-temporal/polyfill'

if (typeof (globalThis as any).Temporal === 'undefined') {
  Object.defineProperty(globalThis, 'Temporal', {
    value: Temporal,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}


export default withMermaid(defineConfig({
  base: '/magma/',
  title: "Tempo",
  description: "The Professional Date-Time Library for Temporal",
  srcDir: '.',
  srcExclude: ['**/plan/**', '**/archive/**', '**/bench/**', '**/scratch/**', 'CHANGELOG.md'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/magma/tempo-logo.svg' }]
  ],
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Guide', link: '/README' },
      { text: 'API Reference', link: '/api/index.html', target: '_self' },
      { text: 'Library API', link: '/api/library/index.html', target: '_self' },
      { text: 'Releases', link: '/doc/8-project-and-support/releases/' },
      { text: 'Functions', link: 'https://magmacomputing.github.io/magma/functions/' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/README' },
          { text: 'Installation', link: '/doc/1-getting-started/installation' },
          { text: 'AI & IDE Integration', link: '/doc/1-getting-started/ai-integration' },
          { text: 'Cookbook', link: '/doc/1-getting-started/tempo.cookbook' }
        ]
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Configuration', link: '/doc/2-core-concepts/tempo.config' },
          { text: 'Cache Management', link: '/doc/2-core-concepts/tempo.cache' },
          { text: 'Core Getters', link: '/doc/2-core-concepts/tempo.getters' },
          { text: 'Smart Parsing', link: '/doc/2-core-concepts/tempo.parse' },
          { text: 'Smart Formatting', link: '/doc/2-core-concepts/tempo.format' },
          { text: 'Duration Logic', link: '/doc/2-core-concepts/tempo.duration' },
          { text: 'Mutation & Math', link: '/doc/2-core-concepts/tempo.mutate' },
          { text: 'Intervals', link: '/doc/2-core-concepts/tempo.interval' }
        ]
      },
      {
        text: 'Extending Tempo',
        items: [
          { text: 'Modules', link: '/doc/3-extending-tempo/tempo.modularity' },
          { text: 'Registries', link: '/doc/3-extending-tempo/tempo.registry' },
          { text: 'Plugins', link: '/doc/3-extending-tempo/tempo.plugin' },
          { text: 'Layout Patterns', link: '/doc/3-extending-tempo/tempo.layout' },
          { text: 'Terms', link: '/doc/3-extending-tempo/tempo.term' },
          { text: 'Namespaces', link: '/doc/3-extending-tempo/tempo.namespace' },
          { text: 'Creating Custom Plugins', link: '/doc/3-extending-tempo/tempo.extension' },
          { text: 'Plugin Ecosystem', link: '/doc/3-extending-tempo/ecosystem' }
        ]
      },
      {
        text: 'Advanced Reference',
        items: [
          { text: 'Sandbox Factory', link: '/doc/4-advanced-reference/sandbox-factory' },
          { text: 'Parse Planner', link: '/doc/4-advanced-reference/tempo.planner' },
          { text: 'The Role of Locale', link: '/doc/4-advanced-reference/tempo.locale' },
          { text: 'Shorthand Engine', link: '/doc/4-advanced-reference/tempo.shorthand' },
          { text: 'Weekday Engine', link: '/doc/4-advanced-reference/tempo.weekday' },
          { text: 'Debugging', link: '/doc/4-advanced-reference/tempo.debugging' }
        ]
      },
      {
        text: 'Architecture & Internals',
        items: [
          { text: 'Core Architecture', link: '/doc/5-architecture-and-internals/architecture' },
          { text: 'Soft Freeze Strategy', link: '/doc/5-architecture-and-internals/soft_freeze_strategy' },
          { text: 'Lazy Evaluation', link: '/doc/5-architecture-and-internals/lazy-evaluation-pattern' },
          { text: 'Performance Benchmarks', link: '/doc/5-architecture-and-internals/tempo.benchmarks' }
        ]
      },
      {
        text: 'Utility Library',
        items: [
          { text: 'Library Overview', link: '/doc/6-utility-library/tempo.library' },
          { text: 'Enumerators', link: '/doc/6-utility-library/tempo.enumerators' },
          { text: 'Serializers', link: '/doc/6-utility-library/tempo.serializers' },
          { text: 'Decorators', link: '/doc/6-utility-library/tempo.decorators' },
          { text: 'Advanced Promises (Pledge)', link: '/doc/6-utility-library/tempo.pledge' }
        ]
      },
      {
        text: 'Ecosystem',
        items: [
          { text: 'Contribution Guide', link: '/CONTRIBUTING' },
          { text: 'Comparison', link: '/doc/7-ecosystem/comparison' },
          { text: 'Extending Temporal', link: '/doc/7-ecosystem/extending-temporal' },
          { text: 'Project Vision', link: '/doc/7-ecosystem/vision' }
        ]
      },
      {
        text: 'Project & Support',
        items: [
          { text: 'License Key Guide', link: '/doc/9-plugins/_setup.index' },
          { text: 'Migration Guide', link: '/doc/8-project-and-support/migration-guide' },
          { text: 'Release Notes', link: '/doc/8-project-and-support/releases/' },
          { text: 'Professional Services', link: '/doc/8-project-and-support/commercial' }
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
  markdown: {
    config: (md) => {
      // Dynamically rewrite source links to the harvested plugin documents
      const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      }

      md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const hrefIndex = token.attrIndex('href');
        if (hrefIndex >= 0) {
          const hrefAttr = token.attrs![hrefIndex];
          const href = hrefAttr[1];
          // Match paths like ../../../plugins/ticker/doc/index.md or similar
          const match = href.match(/(?:\.\.\/)+plugins\/([^\/]+)\/doc\/([^/]+)\.md(?:([#?].*))?/);
          if (match) {
            // Normalise: replace leading dot with underscore (mirrors harvest-plugins.mjs)
            // e.g. '.setup' -> '_setup', 'ticker' -> 'ticker'
            // Using '_' (not stripping) avoids silent collision between '.setup/' and 'setup/'.
            const pluginId = match[1].replace(/^\./, '_');
            // Rewrite the href to point to the absolute harvested VitePress path
            hrefAttr[1] = `/doc/9-plugins/${pluginId}.${match[2]}.md${match[3] || ''}`;
          }
        }
        return defaultRender(tokens, idx, options, env, self);
      }
    }
  },
  vite: {
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 2000
    },
    esbuild: {
      target: 'esnext'
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
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
          find: /^@magmacomputing\/tempo\/parse$/,
          replacement: fileURLToPath(new URL('../dist/module/module.parse.js', import.meta.url))
        },
        {
          find: /^@magmacomputing\/tempo\/format$/,
          replacement: fileURLToPath(new URL('../dist/module/module.format.js', import.meta.url))
        },
        {
          find: /^@magmacomputing\/tempo\/module$/,
          replacement: fileURLToPath(new URL('../dist/module/module.index.js', import.meta.url))
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
}))
