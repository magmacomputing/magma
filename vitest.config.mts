import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';

const stdDist = path.resolve(__dirname, './packages/plugins/.std/dist/index.js');
const stdSrc = path.resolve(__dirname, './packages/plugins/.std/src/index.ts');
const stdDistEntry = existsSync(stdDist) ? stdDist : stdSrc;

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
    alias: isDist ? [
      { find: /^@magmacomputing\/tempo\/plugin$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/plugin.index.js') },
      { find: /^@magmacomputing\/tempo\/plugin\/sdk$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/plugin.sdk.js') },
      { find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/$1.js') },
      { find: /^@magmacomputing\/tempo\/term$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/term/term.index.js') },
      { find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/term/term.$1.js') },
      { find: /^@magmacomputing\/tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/dist/core.index.js') },
      { find: /^@magmacomputing\/tempo\/config$/, replacement: path.resolve(__dirname, './packages/tempo/dist/config/config.index.js') },
      { find: /^@magmacomputing\/tempo\/library$/, replacement: path.resolve(__dirname, './packages/tempo/dist/library.index.js') },
      { find: /^@magmacomputing\/tempo\/(parse|format|mutate|duration)$/, replacement: path.resolve(__dirname, './packages/tempo/dist/module/module.$1.js') },
      { find: /^@magmacomputing\/tempo\/module\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/dist/module/$1.js') },
      { find: /^@magmacomputing\/tempo\/support$/, replacement: path.resolve(__dirname, './packages/tempo/dist/support/support.index.js') },
      { find: /^@magmacomputing\/tempo\/enums$/, replacement: path.resolve(__dirname, './packages/tempo/dist/support/support.enum.js') },
      { find: /^@magmacomputing\/tempo$/, replacement: path.resolve(__dirname, './packages/tempo/dist/tempo.index.js') },
      { find: /^@magmacomputing\/tempo-fns$/, replacement: path.resolve(__dirname, './packages/functions/src/index.ts') },
      { find: /^@magmacomputing\/tempo-fns\/(.*)$/, replacement: path.resolve(__dirname, './packages/functions/src/$1.ts') },
      { find: /^@magmacomputing\/tempo-plugin-([^/]+)$/, replacement: path.resolve(__dirname, './packages/plugins/$1/src/index.ts') },
      { find: /^@magmacomputing\/tempo-plugin-([^/]+)\/(.*)$/, replacement: path.resolve(__dirname, './packages/plugins/$1/src/$2.ts') },
      { find: /^@magmacomputing\/library$/, replacement: path.resolve(__dirname, './packages/library/dist/common.index.js') },
      { find: /^@magmacomputing\/library\/(primitives|temporal|security|scheduling|runtime)\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/dist/common/$1/$2') },
      { find: /^@magmacomputing\/library\/(browser|server)\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/dist/$1/$2') },
      { find: /^@magmacomputing\/library\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/dist/$1') },
      { find: /^#library\/(primitives|temporal|security|scheduling|runtime)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/$1/$2.js') },
      { find: /^#library\/(browser|server)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/$1/$2.js') },
      { find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/primitives/$1.library.js') },
      { find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/scheduling/$1.library.js') },
      { find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/security/$1.library.js') },
      { find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/temporal/$1.library.js') },
      { find: /^#library\/temporal\.polyfill\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/temporal/temporal.polyfill.js') },
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/dist/common/runtime/$1.js') },
      { find: /^#library$/, replacement: path.resolve(__dirname, './packages/library/dist/common.index.js') },
      { find: /^#tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/dist/core.index.js') },
      { find: /^#tempo\/config\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/config/$1.js') },
      { find: /^#tempo\/config$/, replacement: path.resolve(__dirname, './packages/tempo/dist/config/config.index.js') },
      { find: /^#tempo\/term$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/term/term.index.js') },
      { find: /^#tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/term/$1') },
      { find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: path.resolve(__dirname, './packages/tempo/dist/module/module.$1.js') },
      { find: /^#tempo\/module$/, replacement: path.resolve(__dirname, './packages/tempo/dist/module/module.index.js') },
      { find: /^#tempo\/support$/, replacement: path.resolve(__dirname, './packages/tempo/dist/support/support.index.js') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/plugin.$1.js') },
      { find: /^#tempo\/plugin\/extend\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/extend/$1.js') },
      { find: /^#tempo\/engine\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/engine/$1.js') },
      { find: /^#tempo\/module\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/module/$1.js') },
      { find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/term/$1.js') },
      { find: /^#tempo\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/plugin.$1.js') },
      { find: /^#tempo\/plugin\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/$1.js') },
      { find: /^#tempo\/plugin$/, replacement: path.resolve(__dirname, './packages/tempo/dist/plugin/plugin.index.js') },
      { find: /^#tempo\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/dist/$1.js') },
      { find: /^#tempo\/std$/, replacement: stdDistEntry },
      { find: /^#tempo$/, replacement: path.resolve(__dirname, './packages/tempo/dist/tempo.index.js') }
    ] : [
      { find: /^@magmacomputing\/tempo\/plugin$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.index.ts') },
      { find: /^@magmacomputing\/tempo\/plugin\/sdk$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.sdk.ts') },
      { find: /^@magmacomputing\/tempo\/plugin\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/$1.ts') },
      { find: /^@magmacomputing\/tempo\/term$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.index.ts') },
      { find: /^@magmacomputing\/tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.$1.ts') },
      { find: /^@magmacomputing\/tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/src/core.index.ts') },
      { find: /^@magmacomputing\/tempo\/config$/, replacement: path.resolve(__dirname, './packages/tempo/src/config/config.index.ts') },
      { find: /^@magmacomputing\/tempo\/library$/, replacement: path.resolve(__dirname, './packages/tempo/src/library.index.ts') },
      { find: /^@magmacomputing\/tempo\/(parse|format|mutate|duration)$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/module.$1.ts') },
      { find: /^@magmacomputing\/tempo\/module\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/$1.ts') },
      { find: /^@magmacomputing\/tempo\/support$/, replacement: path.resolve(__dirname, './packages/tempo/src/support/support.index.ts') },
      { find: /^@magmacomputing\/tempo\/enums$/, replacement: path.resolve(__dirname, './packages/tempo/src/support/support.enum.ts') },
      { find: /^@magmacomputing\/tempo$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.index.ts') },
      { find: /^@magmacomputing\/tempo-fns$/, replacement: path.resolve(__dirname, './packages/functions/src/index.ts') },
      { find: /^@magmacomputing\/tempo-fns\/(.*)$/, replacement: path.resolve(__dirname, './packages/functions/src/$1.ts') },
      { find: /^@magmacomputing\/tempo-plugin-([^/]+)$/, replacement: path.resolve(__dirname, './packages/plugins/$1/src/index.ts') },
      { find: /^@magmacomputing\/tempo-plugin-([^/]+)\/(.*)$/, replacement: path.resolve(__dirname, './packages/plugins/$1/src/$2.ts') },
      { find: /^@magmacomputing\/library$/, replacement: path.resolve(__dirname, './packages/library/src/common.index.ts') },
      { find: /^@magmacomputing\/library\/(primitives|temporal|security|scheduling|runtime)\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1/$2') },
      { find: /^@magmacomputing\/library\/(browser|server)\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/src/$1/$2') },
      { find: /^@magmacomputing\/library\/(.*)$/, replacement: path.resolve(__dirname, './packages/library/src/$1.ts') },
      { find: /^#library\/(primitives|temporal|security|scheduling|runtime)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1/$2.ts') },
      { find: /^#library\/(browser|server)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/$1/$2.ts') },
      { find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/primitives/$1.library.ts') },
      { find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/scheduling/$1.library.ts') },
      { find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/security/$1.library.ts') },
      { find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/temporal/$1.library.ts') },
      { find: /^#library\/temporal\.polyfill\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/temporal/temporal.polyfill.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/runtime/$1.ts') },
      { find: /^#library$/, replacement: path.resolve(__dirname, './packages/library/src/common.index.ts') },
      { find: /^#tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/src/core.index.ts') },
      { find: /^#tempo\/config\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/config/$1.ts') },
      { find: /^#tempo\/config$/, replacement: path.resolve(__dirname, './packages/tempo/src/config/config.index.ts') },
      { find: /^#tempo\/term$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/term.index.ts') },
      { find: /^#tempo\/term\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/$1') },
      { find: /^#tempo\/(parse|format|mutate|duration)$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/module.$1.ts') },
      { find: /^#tempo\/module$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/module.index.ts') },
      { find: /^#tempo\/support$/, replacement: path.resolve(__dirname, './packages/tempo/src/support/support.index.ts') },
      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/scripts/$1.ts') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\/extend\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/extend/$1.ts') },
      { find: /^#tempo\/engine\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/engine/$1.ts') },
      { find: /^#tempo\/module\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/module/$1.ts') },
      { find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/term/$1.ts') },
      { find: /^#tempo\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/$1.ts') },
      { find: /^#tempo\/plugin$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugin/plugin.index.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') },
      { find: /^#tempo\/std$/, replacement: path.resolve(__dirname, './packages/plugins/.std/src/index.ts') },
      { find: /^#tempo$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.index.ts') }
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
          exclude: ['**/node_modules/**', '**/dist/**', '**/test/dom/**'],
          setupFiles: ['./packages/library/test/setup.ts'],
        } as any
      },
      {
        extends: './packages/tempo/vitest.config.ts',
        test: {
          name: 'Browser: DOM',
          color: 'blue',
          environment: 'happy-dom',
          include: ['packages/library/test/dom/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          setupFiles: ['./packages/library/test/setup.ts'],
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
        extends: './packages/plugins/vitest.shared.ts',
        test: {
          name: 'Plugins',
          color: 'green',
          include: ['packages/plugins/*/test/**/*.{test,spec}.ts'],
          exclude: ['**/node_modules/**'],
          maxWorkers: process.env.CI ? 2 : undefined,
          setupFiles: ['./packages/tempo/bin/temporal-polyfill.ts', './packages/tempo/test/support/setup.console-spy.ts'],
        } as any
      }
    ]
  }
})
