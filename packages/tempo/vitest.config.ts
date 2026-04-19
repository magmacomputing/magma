import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';
const polyfill = resolve(__dirname, './bin/setup.polyfill.ts');

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 2,
      },
    },
    setupFiles: [polyfill],
  },
  resolve: {
    alias: isDist ? [
      { find: /^#tempo\/core$/, replacement: resolve(__dirname, './dist/core.index.js') },
      { find: /^#tempo\/term$/, replacement: resolve(__dirname, './dist/plugin/term/term.index.js') },
      { find: /^#tempo\/term\/standard$/, replacement: resolve(__dirname, './dist/plugin/term/standard.index.js') },
      { find: /^#tempo\/term\/(.*)$/, replacement: resolve(__dirname, './dist/plugin/term/$1.js') },
      { find: /^#tempo\/ticker$/, replacement: resolve(__dirname, './dist/plugin/extend/extend.ticker.js') },
      { find: /^#tempo\/duration$/, replacement: resolve(__dirname, './dist/plugin/module/module.duration.js') },
      { find: /^#tempo\/format$/, replacement: resolve(__dirname, './dist/plugin/module/module.format.js') },
      { find: /^#tempo\/parse$/, replacement: resolve(__dirname, './dist/plugin/module/module.parse.js') },
      { find: /^#tempo\/mutate$/, replacement: resolve(__dirname, './dist/plugin/module/module.mutate.js') },
      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.js') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/plugin.$1.js') },
      { find: /^#tempo\/plugin\/extend\.(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/extend/extend.$1.js') },
      { find: /^#tempo\/plugin\/module\.(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/module/module.$1.js') },
      { find: /^#tempo\/plugin\/term\.(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/term/term.$1.js') },
      { find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './dist/$1.js') },
      { find: /^#tempo$/, replacement: resolve(__dirname, './dist/tempo.index.js') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/dist/common/$1.js') },
      { find: /^#library$/, replacement: resolve(__dirname, '../library/dist/common.index.js') },
    ] : [
      { find: /^#tempo\/core$/, replacement: resolve(__dirname, './src/core.index.ts') },
      { find: /^#tempo\/term$/, replacement: resolve(__dirname, './src/plugin/term/term.index.ts') },
      { find: /^#tempo\/term\/standard$/, replacement: resolve(__dirname, './src/plugin/term/standard.index.ts') },
      { find: /^#tempo\/term\/(.*)$/, replacement: resolve(__dirname, './src/plugin/term/$1') },
      { find: /^#tempo\/ticker$/, replacement: resolve(__dirname, './src/plugin/extend/extend.ticker.ts') },
      { find: /^#tempo\/duration$/, replacement: resolve(__dirname, './src/plugin/module/module.duration.ts') },
      { find: /^#tempo\/format$/, replacement: resolve(__dirname, './src/plugin/module/module.format.ts') },
      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.ts') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\/extend\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/extend/extend.$1.ts') },
      { find: /^#tempo\/plugin\/module\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/module/module.$1.ts') },
      { find: /^#tempo\/plugin\/term\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/term/term.$1.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './src/$1.ts') },
      { find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, '../library/src/common.index.ts') },
    ]
  }
});
