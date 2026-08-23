import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';

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
    name: 'Library: Full',
    globals: true,
    pool: 'forks',
    maxWorkers: 2,
    slowTestThreshold: 2_000,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    setupFiles: [resolve(__dirname, '../tempo/bin/temporal-polyfill.ts')],
  },
  resolve: {
    alias: isDist ? [
      { find: /^#library\/([^/]+)\/index\.js$/, replacement: resolve(__dirname, './dist/common/$1/index.js') },
      { find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: resolve(__dirname, './dist/common/primitives/$1.library.js') },
      { find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: resolve(__dirname, './dist/common/temporal/$1.library.js') },
      { find: /^#library\/temporal\.polyfill\.js$/, replacement: resolve(__dirname, './dist/common/temporal/temporal.polyfill.js') },
      { find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: resolve(__dirname, './dist/common/security/$1.library.js') },
      { find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: resolve(__dirname, './dist/common/scheduling/$1.library.js') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, './dist/common/runtime/$1.js') },
      { find: /^#library$/, replacement: resolve(__dirname, './dist/common.index.js') },
      { find: /^#browser\/(.*)\.js$/, replacement: resolve(__dirname, './dist/browser/$1.js') },
      { find: /^#server\/(.*)\.js$/, replacement: resolve(__dirname, './dist/server/$1.js') },
    ] : [
      { find: /^#library\/([^/]+)\/index\.js$/, replacement: resolve(__dirname, './src/common/$1/index.ts') },
      { find: /^#library\/(array|assertion|coercion|number|object|primitive|string|symbol|type)\.library\.js$/, replacement: resolve(__dirname, './src/common/primitives/$1.library.ts') },
      { find: /^#library\/(calendar|temporal)\.library\.js$/, replacement: resolve(__dirname, './src/common/temporal/$1.library.ts') },
      { find: /^#library\/temporal\.polyfill\.js$/, replacement: resolve(__dirname, './src/common/temporal/temporal.polyfill.ts') },
      { find: /^#library\/(buffer|cipher|webtoken)\.library\.js$/, replacement: resolve(__dirname, './src/common/security/$1.library.ts') },
      { find: /^#library\/(cron|rrule|schedule)\.library\.js$/, replacement: resolve(__dirname, './src/common/scheduling/$1.library.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, './src/common/runtime/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, './src/common.index.ts') },
      { find: /^#browser\/(.*)\.js$/, replacement: resolve(__dirname, './src/browser/$1.ts') },
      { find: /^#server\/(.*)\.js$/, replacement: resolve(__dirname, './src/server/$1.ts') },
      { find: /^#server\/(.*)$/, replacement: resolve(__dirname, './src/server/$1.ts') },
    ]
  }
})
