import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';

export default defineConfig({
  test: {
    name: 'Library: Full',
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    setupFiles: [resolve(__dirname, '../tempo/bin/temporal-polyfill.ts')],
  },
  resolve: {
    alias: isDist ? [
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, './dist/common/$1.js') },
      { find: /^#library$/, replacement: resolve(__dirname, './dist/common.index.js') },
      { find: /^#browser\/(.*)\.js$/, replacement: resolve(__dirname, './dist/browser/$1.js') },
      { find: /^#server\/(.*)\.js$/, replacement: resolve(__dirname, './dist/server/$1.js') },
    ] : [
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, './src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, './src/common.index.ts') },
      { find: /^#browser\/(.*)\.js$/, replacement: resolve(__dirname, './src/browser/$1.ts') },
      { find: /^#server\/(.*)\.js$/, replacement: resolve(__dirname, './src/server/$1.ts') },
      { find: /^#server\/(.*)$/, replacement: resolve(__dirname, './src/server/$1.ts') },
    ]
  }
})
