import { defineConfig } from 'vitest/config'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import swc from 'unplugin-swc'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: false,
  oxc: false,
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorVersion: '2023-11' },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Tempo: Full',
          include: ['packages/tempo/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**', '**/test/**/*.core.test.ts', '**/test/**/*.lazy.test.ts'],
          setupFiles: process.env.TEMPO_PREFILTER_CI === 'true'
            ? ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts', './packages/tempo/test/support/ci.prefilter.setup.ts']
            : ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        }
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Tempo: Core',
          include: ['packages/tempo/test/**/*.core.test.ts', 'packages/tempo/test/**/*.lazy.test.ts'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        }
      },
      {
        extends: './packages/library/vitest.config.ts',
        test: {
          name: 'Library: Full',
          include: ['packages/library/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**'],
        }
      }
    ],
    alias: [
      { find: /^#library\/(browser|server|common)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/$1/$2.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1.ts') },
      { find: /^#tempo\/plugins\/plugin\.util\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugins/plugin.util.ts') },
      { find: /^#tempo\/plugins\/plugin\.type\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugins/plugin.type.ts') },
      { find: /^#tempo\/plugins\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugins/extend/plugin.$1.ts') },
      { find: /^#tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/src/core.index.ts') },
      { find: /^#tempo\/(parse|format)$/, replacement: path.resolve(__dirname, './packages/tempo/src/discrete/discrete.$1.ts') },
      { find: /^#tempo\/discrete$/, replacement: path.resolve(__dirname, './packages/tempo/src/discrete/discrete.index.ts') },
      { find: /^#tempo\/tempo\.class\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.index.ts') },
      { find: /^#tempo\/support$/, replacement: path.resolve(__dirname, './packages/tempo/src/support/support.index.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') },
      { find: /^#tempo\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') }
    ]
  },
})
