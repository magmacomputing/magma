import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: false,
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
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
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
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Plugins',
          include: ['packages/plugins/*/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        }
      }
    ],
    alias: [
      { find: /^#library\/(browser|server|common)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/$1/$2.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1.ts') },
      { find: /^#tempo\/plugin\.(util|type)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/extend/plugin.$1.ts') },
      { find: /^#tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/src/core.index.ts') },
      { find: /^#tempo\/config\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/config/$1.ts') },
      { find: /^#tempo\/config$/, replacement: path.resolve(__dirname, './packages/tempo/src/config/config.index.ts') },
      { find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/module.$1.ts') },
      { find: /^#tempo\/support$/, replacement: path.resolve(__dirname, './packages/tempo/src/support/support.index.ts') },
      { find: /^#tempo\/module$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/module.index.ts') },
      { find: /^#tempo\/tempo\.class\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.index.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') },
      { find: /^#tempo\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') }
    ]
  },
})
