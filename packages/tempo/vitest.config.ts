import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDist = process.env.TEST_DIST === 'true';

const polyfill = resolve(__dirname, './bin/temporal-polyfill.ts');
const ciPrefilterSetup = resolve(__dirname, './test/ci.prefilter.setup.ts');
const consoleSpySetup = resolve(__dirname, './test/setup.console-spy.ts');

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
    setupFiles: process.env.TEMPO_PREFILTER_CI === 'true'
      ? [polyfill, consoleSpySetup, ciPrefilterSetup]
      : [polyfill, consoleSpySetup],
    // *.core.test.ts and *.lazy.test.ts assert plugin-isolation behaviour
    // (e.g. "DurationModule not loaded").  The ciPrefilterSetup imports '#tempo'
    // (full build) which side-effects modules into the runtime, making those
    // assertions impossible to satisfy.  They run in the standard test job.
    exclude: process.env.TEMPO_PREFILTER_CI === 'true'
      ? ['**/*.core.test.ts', '**/*.lazy.test.ts', '**/node_modules/**']
      : ['**/node_modules/**'],
  },
  resolve: {
    alias: isDist ? [
      { find: /^#tempo\/core$/, replacement: resolve(__dirname, './dist/core.index.js') },
      { find: /^#tempo\/term$/, replacement: resolve(__dirname, './dist/plugin/term/term.index.js') },
      { find: /^#tempo\/term\/standard$/, replacement: resolve(__dirname, './dist/plugin/term/standard.index.js') },
      { find: /^#tempo\/duration$/, replacement: resolve(__dirname, './dist/module/module.duration.js') },
      { find: /^#tempo\/(parse|format)$/, replacement: resolve(__dirname, './dist/discrete/discrete.$1.js') },
      { find: /^#tempo\/discrete$/, replacement: resolve(__dirname, './dist/discrete/discrete.index.js') },
      { find: /^#tempo\/mutate$/, replacement: resolve(__dirname, './dist/module/module.mutate.js') },
      { find: /^#tempo\/ticker$/, replacement: resolve(__dirname, './dist/plugin/extend/extend.ticker.js') },
      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.js') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/plugin.$1.js') },
      { find: /^#tempo\/plugin\/extend\/(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/extend/$1.js') },
      { find: /^#tempo\/engine\/(.*)\.js$/, replacement: resolve(__dirname, './dist/engine/$1.js') },
      { find: /^#tempo\/module\/(.*)\.js$/, replacement: resolve(__dirname, './dist/module/$1.js') },
      { find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: resolve(__dirname, './dist/plugin/term/$1.js') },
      { find: /^#tempo\/support$/, replacement: resolve(__dirname, './dist/support/support.index.js') },
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
      { find: /^#tempo\/duration$/, replacement: resolve(__dirname, './src/module/module.duration.ts') },
      { find: /^#tempo\/(parse|format)$/, replacement: resolve(__dirname, './src/discrete/discrete.$1.ts') },
      { find: /^#tempo\/discrete$/, replacement: resolve(__dirname, './src/discrete/discrete.index.ts') },
      { find: /^#tempo\/mutate$/, replacement: resolve(__dirname, './src/module/module.mutate.ts') },
      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.ts') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\/extend\/(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/extend/$1.ts') },
      { find: /^#tempo\/engine\/(.*)\.js$/, replacement: resolve(__dirname, './src/engine/$1.ts') },
      { find: /^#tempo\/module\/(.*)\.js$/, replacement: resolve(__dirname, './src/module/$1.ts') },
      { find: /^#tempo\/plugin\/term\/(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/term/$1.ts') },
      { find: /^#tempo\/support$/, replacement: resolve(__dirname, './src/support/support.index.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './src/$1.ts') },
      { find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, '../library/src/common.index.ts') },
    ]
  }
});
