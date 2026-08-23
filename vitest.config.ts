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
  resolve: {
    alias: [
      { find: /^#tempo\/license$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/license/license.validator.ts') },
      { find: /^@magmacomputing\/tempo\/plugin$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.index.ts') },
      { find: /^@magmacomputing\/tempo\/plugin-api$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin-api.index.ts') },
      { find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/$1.ts') },
      { find: /^@magmacomputing\/tempo\/term$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.index.ts') },
      { find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.$1.ts') },
      { find: /^@magmacomputing\/tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/src/core.index.ts') },
      { find: /^@magmacomputing\/tempo\/config$/, replacement: path.resolve(__dirname, './packages/tempo/src/config/config.index.ts') },
      { find: /^@magmacomputing\/tempo\/library$/, replacement: path.resolve(__dirname, './packages/tempo/src/library.index.ts') },
      { find: /^@magmacomputing\/tempo$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.index.ts') },
      { find: /^@magmacomputing\/tempo-fns$/, replacement: path.resolve(__dirname, './packages/functions/src/index.ts') },
      { find: /^@magmacomputing\/tempo-fns\/(.*)$/, replacement: path.resolve(__dirname, './packages/functions/src/$1.ts') },
      { find: /^@magmacomputing\/library$/, replacement: path.resolve(__dirname, './packages/library/src/common.index.ts') },
      { find: /^@magmacomputing\/library\/(primitives|temporal|security|scheduling|runtime)\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1/$2') },
      { find: /^@magmacomputing\/library\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/src/$1.ts') },
      { find: /^#library\/(primitives|temporal|security|scheduling|runtime)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1/$2.ts') },
      { find: /^#library\/([^/]+)\/index\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1/index.ts') },
      { find: /^#library\/(browser|server)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/$1/$2.ts') },
      { find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/primitives/$1.library.ts') },
      { find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/temporal/$1.library.ts') },
      { find: /^#library\/temporal\.polyfill\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/temporal/temporal.polyfill.ts') },
      { find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/security/$1.library.ts') },
      { find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/scheduling/$1.library.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/runtime/$1.ts') },
      { find: /^#library$/, replacement: path.resolve(__dirname, './packages/library/src/common.index.ts') },
      { find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/$1.ts') },
      { find: /^#tempo\/plugin\.(util|type)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/extend/plugin.$1.ts') },
      { find: /^#tempo\/term\/quarter$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.quarter.ts') },
      { find: /^#tempo\/term$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.index.ts') },
      { find: /^#tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/$1') },
      { find: /^#tempo\/std$/, replacement: path.resolve(__dirname, './packages/plugins/.std/src/index.ts') },
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
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Tempo',
          color: 'cyan',
          include: ['packages/tempo/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**', '**/test/**/*.core.test.ts', '**/test/**/*.lazy.test.ts'],
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        } as any
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Tempo: Core',
          color: 'blue',
          include: ['packages/tempo/test/**/*.core.test.ts', 'packages/tempo/test/**/*.lazy.test.ts'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        } as any
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Library',
          color: 'magenta',
          include: ['packages/library/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**'],
        } as any
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Functions',
          color: 'yellow',
          include: ['packages/functions/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['./packages/functions/test/setup.ts'],
        } as any
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Plugins',
          color: 'green',
          include: ['packages/plugins/*/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        } as any
      }
    ]
  }
})
